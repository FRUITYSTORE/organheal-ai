import "server-only";
import { createHash } from "node:crypto";
import { lstat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ArtifactRecord } from "../artifacts/repository";
import { ARTIFACT_MAX_BYTES } from "../artifacts/repository";
import { createArtifactOwnership, discardArtifact, validateArtifact, registerComposedAudio } from "../render/artifact-output";
import { recordCandidateOwnership } from "../render/execution-resources";
import { resolveOutputDimensions } from "../render/dimension-policy";
import type { LocalArtifactCandidate } from "@/lib/jobs/handlers/medical-motion-render.handler";
import { CompositionError, isValidatedComposition, type ValidatedComposition } from "./specification";
import { executeMediaProcess, inspectMedia, type FfmpegRuntime } from "./ffmpeg-runtime";
import { rasterizeOverlays } from "./overlays";
import { canonicalSceneJson } from "../scene-compiler";
import type { NarrationSegment } from "../contracts/personalization";
import sharp from "sharp";

export type CompositionEvent = "composition-start" | "composition-complete" | "composition-failure" | "reusable-audio-hit";
export type CompositionMeasurement = Readonly<{ ffmpegMilliseconds: number; outputBytes: number }>;
export type CompositionBase = { record: ArtifactRecord; bytes: Buffer };
/** Audio resolution is trusted server code; no input paths/URLs accepted. */
export type AudioResolver = (id: string, scope: "reusable-no-phi" | "private-context", userId: string,
  contextId: string, signal: AbortSignal) => Promise<{ bytes: Buffer; segment: NarrationSegment; userId?: string; contextId?: string }>;
const digest = (b: Buffer) => createHash("sha256").update(b).digest("hex");

export async function composePersonalizedMedia(runtime: FfmpegRuntime, capability: ValidatedComposition,
  base: CompositionBase, identity: { jobId: string; userId: string; attemptToken: string }, signal: AbortSignal,
  audioResolver?: AudioResolver, observe: (event: CompositionEvent, measurement?: CompositionMeasurement) => void = () => {}): Promise<LocalArtifactCandidate> {
  const event = (value: CompositionEvent, measurement?: CompositionMeasurement) => { try { observe(value, measurement); } catch { /* no telemetry authority */ } };
  if (!isValidatedComposition(capability) || identity.userId !== capability.userId ||
    base.record.id !== capability.specification.baseArtifactId || !base.record.persisted || !["still", "video"].includes(base.record.media) ||
    base.record.media !== capability.baseMedia ||
    !Buffer.isBuffer(base.bytes) || base.bytes.length > ARTIFACT_MAX_BYTES || base.bytes.length !== base.record.byteSize ||
    digest(base.bytes) !== base.record.sha256 || base.record.sha256 !== capability.baseSha256) throw new CompositionError("COMPOSITION_INVALID");
  const spec = capability.specification;
  const immutableInput = Buffer.from(base.bytes);
  const resolved = resolveOutputDimensions(spec.outputProfile.aspectRatio, "720p");
  if (!resolved.ok) throw new CompositionError("COMPOSITION_INVALID");
  const { width, height } = resolved.dimensions;
  const owner = await createArtifactOwnership("personalized.mp4", "video");
  const start = performance.now(); event("composition-start");
  try {
    if (signal.aborted) throw new CompositionError("COMPOSITION_CANCELLED");
    const baseName = base.record.media === "still" ? "base.png" : "base.mp4";
    await writeFile(path.join(owner.directory, baseName), immutableInput, { flag: "wx", mode: 0o600 });
    let inspected;
    if (base.record.media === "still") {
      const meta = await sharp(immutableInput, { failOn: "warning", limitInputPixels: 1920 * 1920 }).metadata();
      if (meta.format !== "png" || !meta.width || !meta.height || meta.pages && meta.pages !== 1) throw new CompositionError("COMPOSITION_INVALID");
      inspected = { width: meta.width, height: meta.height, duration: capability.duration, audio: false,
        frameRate: 25, frameCount: Math.ceil(capability.duration * 25) };
    } else inspected = await inspectMedia(runtime, baseName, owner.directory, signal);
    // Timing uses the actual media, never only a DSL hint.
    const endTimes = [...spec.textOverlays, ...spec.numericOverlays, ...spec.chartOverlays].map(v => v.end);
    if (endTimes.some(t => t > inspected.duration) || [...spec.audioSegments, ...spec.dynamicNarrationSlots]
      .some(v => v.start + v.segment.duration > inspected.duration)) throw new CompositionError("COMPOSITION_INVALID");
    const panel = Math.floor(width * 0.3 / 2) * 2;
    const overlays = await rasterizeOverlays(spec, panel, height);
    const args = ["-nostdin", "-hide_banner", "-loglevel", "error", "-xerror", "-n", "-protocol_whitelist", "file,pipe", "-err_detect", "explode"];
    if (base.record.media === "still") args.push("-loop", "1");
    args.push("-i", baseName);
    const filters = [`[0:v]scale=${width - panel}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${width}:${height}:(${width - panel}-iw)/2:(oh-ih)/2:black,setsar=1[v0]`];
    for (let i = 0; i < overlays.length; i++) {
      const name = `overlay-${i}.png`;
      await writeFile(path.join(owner.directory, name), overlays[i].bytes, { flag: "wx", mode: 0o600 });
      args.push("-loop", "1", "-i", name);
      filters.push(`[v${i}][${i + 1}:v]overlay=${width - panel}:0:enable='gte(t,${overlays[i].start})*lt(t,${overlays[i].end})'[v${i + 1}]`);
    }
    const placements = [...spec.audioSegments, ...spec.dynamicNarrationSlots];
    const audioLabels: string[] = [];
    if (inspected.audio && spec.baseAudio === "preserve") {
      // Declared narration slots replace base audio only during their explicit
      // intervals, preventing two medical explanations from speaking together.
      const mute = placements.map(v => `volume=0:enable='gte(t,${v.start})*lt(t,${v.start + v.segment.duration})'`);
      filters.push(`[0:a]${["asetpts=PTS-STARTPTS", ...mute].join(",")}[baseaudio]`);
      audioLabels.push("[baseaudio]");
    }
    for (let i = 0; i < placements.length; i++) {
      if (!audioResolver) throw new CompositionError("COMPOSITION_UNAVAILABLE");
      const placement = placements[i], segment = placement.segment;
      const resolvedAudio = await audioResolver(segment.audioArtifactId, segment.reuseScope, capability.userId, capability.contextId, signal);
      // Approval/version/scope come from the trusted resolver, never the supplied segment claims.
      if (canonicalSceneJson(resolvedAudio.segment) !== canonicalSceneJson(segment) ||
        segment.reuseScope === "private-context" && (resolvedAudio.userId !== capability.userId || resolvedAudio.contextId !== capability.contextId))
        throw new CompositionError("COMPOSITION_INVALID");
      const bytes = resolvedAudio.bytes;
      if (signal.aborted) throw new CompositionError("COMPOSITION_CANCELLED");
      if (!Buffer.isBuffer(bytes) || bytes.length < 44 || bytes.length > 8 * 1024 * 1024 ||
        digest(bytes) !== segment.audioSha256 ||
        bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") throw new CompositionError("COMPOSITION_INVALID");
      const name = `audio-${i}.wav`; await writeFile(path.join(owner.directory, name), bytes, { flag: "wx", mode: 0o600 });
      const probe = await executeMediaProcess(runtime, "ffprobe", ["-v", "error", "-protocol_whitelist", "file,pipe",
        "-show_entries", "stream=codec_type:format=duration,format_name", "-of", "json", name], owner.directory, signal);
      try {
        const metadata = JSON.parse(probe), duration = Number(metadata.format.duration);
        if (metadata.format.format_name !== "wav" || !Array.isArray(metadata.streams) || metadata.streams.length !== 1 ||
          metadata.streams[0].codec_type !== "audio" || !Number.isFinite(duration) || Math.abs(duration - segment.duration) > 0.05)
          throw Error();
      } catch { throw new CompositionError("COMPOSITION_INVALID"); }
      args.push("-protocol_whitelist", "file,pipe", "-i", name);
      const index = 1 + overlays.length + i;
      filters.push(`[${index}:a]atrim=duration=${segment.duration},asetpts=PTS-STARTPTS,adelay=${Math.round(placement.start * 1000)}:all=1[a${i}]`);
      audioLabels.push(`[a${i}]`);
      if (segment.reuseScope === "reusable-no-phi") event("reusable-audio-hit");
    }
    if (audioLabels.length) filters.push(`${audioLabels.join("")}amix=inputs=${audioLabels.length}:normalize=0,apad,atrim=duration=${inspected.duration}[audio]`);
    args.push("-filter_complex", filters.join(";"), "-map", `[v${overlays.length}]`);
    if (audioLabels.length) args.push("-map", "[audio]", "-c:a", "aac"); else args.push("-an");
    args.push("-filter_complex_threads", "1", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-pix_fmt", "yuv420p", "-threads", "1",
      "-t", String(inspected.duration), "-movflags", "+faststart", "-fs", String(ARTIFACT_MAX_BYTES), "personalized.mp4");
    const ffmpegStarted = performance.now();
    await executeMediaProcess(runtime, "ffmpeg", args, owner.directory, signal);
    const ffmpegMilliseconds = Math.round(performance.now() - ffmpegStarted);
    if (audioLabels.length) registerComposedAudio(owner);
    const info = await lstat(owner.outputPath);
    if (info.size < 1 || info.size > ARTIFACT_MAX_BYTES || !(await validateArtifact(owner, resolved.dimensions)).ok)
      throw new CompositionError("COMPOSITION_OUTPUT_INVALID");
    const final = await inspectMedia(runtime, "personalized.mp4", owner.directory, signal);
    const timingTolerance = (base.record.media === "still" ? 1 : 0.5) / inspected.frameRate + 0.005;
    if (final.width !== width || final.height !== height || Math.abs(final.duration - inspected.duration) > timingTolerance ||
      final.frameCount !== inspected.frameCount || Math.abs(final.frameRate - inspected.frameRate) > 0.0001 ||
      final.audio !== (audioLabels.length > 0)) throw new CompositionError("COMPOSITION_OUTPUT_INVALID");
    if (signal.aborted) throw new CompositionError("COMPOSITION_CANCELLED");
    const candidate: LocalArtifactCandidate = Object.freeze({ localPath: owner.outputPath, media: "video",
      executionSeconds: (performance.now() - start) / 1000, discard: () => discardArtifact(owner) });
    recordCandidateOwnership(candidate, owner, resolved.dimensions, identity);
    event("composition-complete", Object.freeze({ ffmpegMilliseconds, outputBytes: info.size })); return candidate;
  } catch (error) {
    if (!(error instanceof CompositionError && error.code === "COMPOSITION_CLEANUP_UNKNOWN")) await discardArtifact(owner);
    event("composition-failure");
    throw error instanceof CompositionError ? error : new CompositionError("COMPOSITION_OUTPUT_INVALID");
  }
}
