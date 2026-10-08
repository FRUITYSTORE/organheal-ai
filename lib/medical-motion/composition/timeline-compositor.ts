import "server-only";
import { createHash } from "node:crypto";
import { writeFile, readFile, lstat } from "node:fs/promises";
import path from "node:path";
import { createArtifactOwnership, discardArtifact } from "../render/artifact-output";
import { ARTIFACT_MAX_BYTES } from "../artifacts/repository";
import { composePersonalizedMedia, type CompositionBase, type AudioResolver, type CompositionEvent, type CompositionMeasurement } from "./compositor";
import { executeMediaProcess, inspectMedia, type FfmpegRuntime } from "./ffmpeg-runtime";
import { CompositionError } from "./specification";
import { isAuthorizedTimelineMedia, type ValidatedTimeline } from "./timeline-specification";

/** Bytes only; every segment is independently probed, then normalized to a silent 25fps timeline.
 * No xfade/overlap: fade filters meet only at a concatenation boundary on black. */
export async function composePersonalizedTimelineMedia(runtime: FfmpegRuntime, capability: ValidatedTimeline,
  bases: readonly CompositionBase[], identity: {jobId:string;userId:string;attemptToken:string}, signal: AbortSignal,
  audio?: AudioResolver, observe?: (event:CompositionEvent,measurement?:CompositionMeasurement)=>void) {
  if (!isAuthorizedTimelineMedia(capability) || identity.userId !== capability.content.userId || bases.length !== capability.content.segments.length ||
    bases.reduce((n,b)=>n+(Buffer.isBuffer(b.bytes)?b.bytes.length:ARTIFACT_MAX_BYTES+1),0)>ARTIFACT_MAX_BYTES)
    throw new CompositionError("COMPOSITION_INVALID");
  const owner = await createArtifactOwnership("timeline.mp4","video");
  let cleanupUnknown=false;
  try {
    const args = ["-nostdin","-hide_banner","-loglevel","error","-xerror","-n"];
    const filters: string[] = [];
    for (let i=0;i<bases.length;i++) {
      if (signal.aborted) throw new CompositionError("COMPOSITION_CANCELLED");
      const base=bases[i], s=capability.content.segments[i];
      if (!base.record.persisted || base.record.media!=="video" || base.record.id!==s.baseArtifactId ||
        base.record.sha256!==s.baseSha256 || !Buffer.isBuffer(base.bytes) || base.bytes.length!==base.record.byteSize ||
        base.bytes.length>ARTIFACT_MAX_BYTES || createHash("sha256").update(base.bytes).digest("hex")!==s.baseSha256)
        throw new CompositionError("COMPOSITION_INVALID");
      const file=`segment-${i}.mp4`;
      await writeFile(path.join(owner.directory,file),Buffer.from(base.bytes),{flag:"wx",mode:0o600});
      const media=await inspectMedia(runtime,file,owner.directory,signal);
      if (Math.abs(media.duration-s.duration)>0.0001) throw new CompositionError("COMPOSITION_INVALID");
      // Exact 25fps duration prevents frame rounding from changing boundaries or final timing.
      if (Math.abs(s.duration*25-Math.round(s.duration*25))>0.0001) throw new CompositionError("COMPOSITION_INVALID");
      args.push("-protocol_whitelist","file,pipe","-err_detect","explode","-i",file);
      const chain=[`scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2`,"pad=1280:720:(ow-iw)/2:(oh-ih)/2:black",
        "setsar=1","fps=25","format=yuv420p",`trim=duration=${s.duration}`,"setpts=PTS-STARTPTS"];
      const incoming=capability.content.transitions[i-1],outgoing=capability.content.transitions[i];
      if(incoming?.kind==="fade-through-neutral") chain.push(`fade=t=in:st=0:d=${incoming.duration/2}:color=black`);
      if(outgoing?.kind==="fade-through-neutral") chain.push(`fade=t=out:st=${s.duration-outgoing.duration/2}:d=${outgoing.duration/2}:color=black`);
      filters.push(`[${i}:v]${chain.join(",")}[s${i}]`);
    }
    filters.push(`${bases.map((_,i)=>`[s${i}]`).join("")}concat=n=${bases.length}:v=1:a=0[timeline]`);
    args.push("-filter_complex",filters.join(";"),"-map","[timeline]","-an","-filter_complex_threads","1","-c:v","libx264",
      "-preset","ultrafast","-crf","23","-pix_fmt","yuv420p","-threads","1","-t",String(capability.content.duration),
      "-movflags","+faststart","-fs",String(ARTIFACT_MAX_BYTES),"timeline.mp4");
    await executeMediaProcess(runtime,"ffmpeg",args,owner.directory,signal);
    const stat=await lstat(owner.outputPath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size<1 || stat.size>ARTIFACT_MAX_BYTES) throw new CompositionError("COMPOSITION_OUTPUT_INVALID");
    const media=await inspectMedia(runtime,"timeline.mp4",owner.directory,signal);
    if(media.audio || media.width!==1280 || media.height!==720 || media.frameRate!==25 ||
      Math.abs(media.duration-capability.content.duration)>.005 || media.frameCount!==Math.round(capability.content.duration*25))
      throw new CompositionError("COMPOSITION_OUTPUT_INVALID");
    const bytes=await readFile(owner.outputPath);
    // Reuse existing approved global overlay/audio path; this temporary normalized clip is never stored or reusable.
    const first=bases[0].record;
    const presentation={...first,media:"video" as const,byteSize:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")};
    // The global capability must bind the normalized media hash, not the first anatomical base.
    const { rebindTimelinePresentation } = await import("./timeline-specification");
    const validated=rebindTimelinePresentation(capability,presentation.sha256);
    return await composePersonalizedMedia(runtime,validated,{record:presentation,bytes},identity,signal,audio,observe);
  } catch(error) {
    if(error instanceof CompositionError && error.code==="COMPOSITION_CLEANUP_UNKNOWN") {cleanupUnknown=true;throw error;}
    throw error instanceof CompositionError ? error : new CompositionError("COMPOSITION_OUTPUT_INVALID");
  } finally { if(!cleanupUnknown) await discardArtifact(owner); }
}
