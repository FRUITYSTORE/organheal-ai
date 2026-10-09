import "server-only";
import { lstat,readFile } from "node:fs/promises";
import path from "node:path";
import { isCompiledCinematicExecution,type CompiledCinematicExecution } from "../cinematic-scene-compiler";
import { ARTIFACT_MAX_BYTES } from "../artifacts/repository";
import { inspectMedia,type FfmpegRuntime } from "./ffmpeg-runtime";
import { audioHash,audioInvalid,deepAudioFreeze } from "./narration-foundation";

const visuals=new WeakMap<object,Buffer>(),fonts=new WeakMap<object,Buffer>();
export type ApprovedAudioVisual=Readonly<{compiled:CompiledCinematicExecution;sha256:string;visualIdentity:string;
  media:Awaited<ReturnType<typeof inspectMedia>>;supportedLabels:readonly never[];
  heroProjection:readonly {sceneIndex:number;frame:number;projectedBounds:readonly number[]}[]}>;
export type ApprovedSubtitleFont=Readonly<{id:"LOCAL_ARIAL_V1";sha256:string}>;
async function boundedFile(filename:string,max:number,requireSingleLink=true){
  if(!path.isAbsolute(filename))audioInvalid();const info=await lstat(filename);
  if(!info.isFile()||info.isSymbolicLink()||requireSingleLink&&info.nlink!==1||info.size<1||info.size>max)audioInvalid();return readFile(filename);
}
/** Explicit server intake of preserved R2.4 execution evidence and bytes. No
 * public request path or copied evidence can manufacture compiler authority. */
export async function approveAudioVisual(compiled:CompiledCinematicExecution,filename:string,evidenceFile:string,
  media:FfmpegRuntime,signal:AbortSignal):Promise<ApprovedAudioVisual>{
  if(!isCompiledCinematicExecution(compiled)||path.basename(filename)!=="heart-cinematic-explainer-v1.mp4"||
    path.basename(evidenceFile)!=="execution-evidence.json"||path.dirname(filename)!==path.dirname(evidenceFile))audioInvalid("AUDIO_VISUAL_AUTHORITY_INVALID");
  const evidence=JSON.parse((await boundedFile(evidenceFile,2*1024*1024)).toString("utf8"));
  const bytes=await boundedFile(filename,ARTIFACT_MAX_BYTES),sha256=audioHash(bytes);
  if(evidence.compiledFingerprint!==compiled.fingerprint||evidence.executorSha256!==compiled.executorLock.builderSha256||
    evidence.runtimeSpecification?.fingerprint!==compiled.timeline.fingerprint||evidence.outputSha256!==sha256||evidence.bytes!==bytes.length||
    evidence.patientFacing!==false||evidence.usage!=="internal-review")audioInvalid("AUDIO_VISUAL_AUTHORITY_INVALID");
  const probed=await inspectMedia(media,path.basename(filename),path.dirname(filename),signal);
  if(probed.width!==1080||probed.height!==1920||probed.frameRate!==24||probed.frameCount!==276||probed.duration!==11.5||probed.audio)audioInvalid();
  const hero=evidence.renderEvidence?.find((r:{masterId?:string})=>r.masterId==="HEART_MASTER_VISUAL_V1")?.evidence;
  if(!hero||hero.sourceSha256!==compiled.timeline.scenes[0].sourceSha256||!Array.isArray(hero.frames)||hero.frames.length>1000)audioInvalid("AUDIO_VISUAL_AUTHORITY_INVALID");
  const heroProjection=hero.frames.map((f:{sceneIndex:number;frame:number;projectedBounds:number[]})=>{
    if(![0,1,2].includes(f.sceneIndex)||!Number.isSafeInteger(f.frame)||f.frame<0||!Array.isArray(f.projectedBounds)||f.projectedBounds.length!==4||
      f.projectedBounds.some(v=>!Number.isFinite(v)||v<0||v>1))audioInvalid("AUDIO_VISUAL_AUTHORITY_INVALID");
    return {sceneIndex:f.sceneIndex,frame:f.frame,projectedBounds:f.projectedBounds};
  });
  const result=deepAudioFreeze({compiled,sha256,visualIdentity:compiled.fingerprint,media:probed,supportedLabels:[] as readonly never[],heroProjection});
  visuals.set(result,Buffer.from(bytes));return result;
}
export const isApprovedAudioVisual=(v:unknown):v is ApprovedAudioVisual=>!!v&&typeof v==="object"&&visuals.has(v);
export function approvedVisualBytes(v:ApprovedAudioVisual){const bytes=visuals.get(v);if(!bytes)audioInvalid();return Buffer.from(bytes);}
/** Existing local system font only; no downloads/remote SVG resources. Font
 * bytes are pinned into composition identity and copied privately per invocation. */
export async function approveSubtitleFont(filename:string):Promise<ApprovedSubtitleFont>{
  if(path.basename(filename).toLowerCase()!=="arial.ttf")audioInvalid("SUBTITLE_FONT_UNAVAILABLE");
  // Windows system fonts may have servicing hardlinks. This is read-only intake;
  // execution uses a private immutable byte copy, never the linked source path.
  const bytes=await boundedFile(filename,20*1024*1024,false);
  if(bytes.readUInt32BE(0)!==0x00010000)audioInvalid("SUBTITLE_FONT_UNAVAILABLE");
  const font=Object.freeze({id:"LOCAL_ARIAL_V1" as const,sha256:audioHash(bytes)});fonts.set(font,Buffer.from(bytes));return font;
}
export const isApprovedSubtitleFont=(v:unknown):v is ApprovedSubtitleFont=>!!v&&typeof v==="object"&&fonts.has(v);
export function approvedFontBytes(font:ApprovedSubtitleFont){const bytes=fonts.get(font);if(!bytes)audioInvalid();return Buffer.from(bytes);}
