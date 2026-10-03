import "server-only";
import path from "node:path";
import { lstat, realpath } from "node:fs/promises";
import { spawn } from "node:child_process";
import { CompositionError } from "./specification";

export type FfmpegRuntime = Readonly<{ ffmpeg: string; ffprobe: string; timeoutMs: number }>;
const issued = new WeakSet<object>();
/** Absolute administrator-supplied paths only. No PATH search, download or request overrides. */
export async function createFfmpegRuntime(config: { ffmpeg: string; ffprobe: string; timeoutMs?: number }): Promise<FfmpegRuntime> {
  const timeoutMs = config.timeoutMs ?? 60_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120_000) throw new CompositionError("COMPOSITION_INVALID");
  const paths: string[] = [];
  for (const value of [config.ffmpeg, config.ffprobe]) {
    if (typeof value !== "string" || !path.isAbsolute(value) || /[\r\n\0]/.test(value)) throw new CompositionError("COMPOSITION_UNAVAILABLE");
    try {
      const info = await lstat(value);
      if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1) throw Error();
      paths.push(await realpath(value));
    } catch { throw new CompositionError("COMPOSITION_UNAVAILABLE"); }
  }
  const runtime = Object.freeze({ ffmpeg: paths[0], ffprobe: paths[1], timeoutMs });
  issued.add(runtime); return runtime;
}

export async function configuredFfmpegRuntime(env: Readonly<Record<string, string | undefined>>): Promise<FfmpegRuntime> {
  if (!env.FFMPEG_EXECUTABLE_PATH || !env.FFPROBE_EXECUTABLE_PATH) throw new CompositionError("COMPOSITION_UNAVAILABLE");
  return createFfmpegRuntime({ ffmpeg: env.FFMPEG_EXECUTABLE_PATH, ffprobe: env.FFPROBE_EXECUTABLE_PATH });
}

/** Internal argv only. Errors never contain stderr, arguments, paths or patient text. */
export async function executeMediaProcess(runtime: FfmpegRuntime, executable: "ffmpeg" | "ffprobe",
  args: readonly string[], cwd: string, signal: AbortSignal): Promise<string> {
  if (!issued.has(runtime) || !path.isAbsolute(cwd)) throw new CompositionError("COMPOSITION_INVALID");
  if (signal.aborted) throw new CompositionError("COMPOSITION_CANCELLED");
  return new Promise((resolve, reject) => {
    let stdout = "", bytes = 0, failure: CompositionError | undefined, settled = false;
    let killDeadline: ReturnType<typeof setTimeout> | undefined;
    const child = spawn(runtime[executable], [...args], { cwd, shell: false, windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"] });
    const stop = (code: CompositionError["code"]) => {
      if (failure) return;
      failure = new CompositionError(code); child.kill("SIGKILL");
      killDeadline = setTimeout(() => finish(new CompositionError("COMPOSITION_CLEANUP_UNKNOWN")), 5000);
    };
    const abort = () => stop("COMPOSITION_CANCELLED");
    const deadline = setTimeout(() => stop("COMPOSITION_TIMEOUT"), runtime.timeoutMs);
    const finish = (error?: CompositionError) => {
      if (settled) return; settled = true; clearTimeout(deadline); signal.removeEventListener("abort", abort);
      if (killDeadline) clearTimeout(killDeadline);
      if (error) reject(error); else resolve(stdout);
    };
    child.stdout.on("data", (chunk: Buffer) => {
      bytes += chunk.length; if (bytes > 256 * 1024) stop("COMPOSITION_PROCESS_FAILED"); else stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => { bytes += chunk.length; if (bytes > 256 * 1024) stop("COMPOSITION_PROCESS_FAILED"); });
    child.on("error", () => finish(new CompositionError("COMPOSITION_UNAVAILABLE")));
    // Resolve only after close: no late process can write into a completed invocation.
    child.on("close", code => finish(failure ?? (code === 0 ? undefined : new CompositionError("COMPOSITION_PROCESS_FAILED"))));
    signal.addEventListener("abort", abort, { once: true }); if (signal.aborted) abort();
  });
}

export async function auditFfmpegRuntime(runtime: FfmpegRuntime, cwd: string, signal: AbortSignal) {
  const version = await executeMediaProcess(runtime, "ffmpeg", ["-version"], cwd, signal);
  const encoders = await executeMediaProcess(runtime, "ffmpeg", ["-hide_banner", "-encoders"], cwd, signal);
  const filters = await executeMediaProcess(runtime, "ffmpeg", ["-hide_banner", "-filters"], cwd, signal);
  const probe = await executeMediaProcess(runtime, "ffprobe", ["-version"], cwd, signal);
  if (!/^ffmpeg version [A-Za-z0-9._+ -]+/m.test(version) || !/^ffprobe version /m.test(probe) ||
    !/\blibx264\b/.test(encoders) || !/\baac\b/.test(encoders) ||
    ["overlay", "scale", "pad", "amix", "atrim", "adelay"].some(v => !new RegExp(`\\b${v}\\b`).test(filters)))
    throw new CompositionError("COMPOSITION_UNAVAILABLE");
  return Object.freeze({ version: version.split("\n")[0].slice(0, 120), h264: true, aac: true });
}

export type MediaInspection = { width: number; height: number; duration: number; audio: boolean; frameRate: number; frameCount: number };
export async function inspectMedia(runtime: FfmpegRuntime, file: string, cwd: string, signal: AbortSignal): Promise<MediaInspection> {
  const output = await executeMediaProcess(runtime, "ffprobe", ["-v", "error", "-protocol_whitelist", "file,pipe",
    "-show_entries", "stream=codec_type,codec_name,width,height,duration,avg_frame_rate,nb_frames:format=duration,format_name", "-of", "json", file], cwd, signal);
  try {
    const data = JSON.parse(output), streams = data.streams;
    if (!Array.isArray(streams) || streams.length < 1 || streams.length > 2) throw Error();
    const video = streams.filter(s => s.codec_type === "video"), audio = streams.filter(s => s.codec_type === "audio");
    if (video.length !== 1) throw Error();
    const duration = Number(video[0].duration), formatDuration = Number(data.format.duration);
    const rate = String(video[0].avg_frame_rate).split("/");
    const frameRate = rate.length === 2 ? Number(rate[0]) / Number(rate[1]) : NaN;
    const frameCount = Number(video[0].nb_frames);
    if (video.length !== 1 || audio.length > 1 || video.length + audio.length !== streams.length ||
      !Number.isSafeInteger(video[0].width) || !Number.isSafeInteger(video[0].height) || video[0].width < 1 || video[0].height < 1 ||
      video[0].width * video[0].height > 1920 * 1920 || !Number.isFinite(duration) || duration <= 0 || duration > 60 ||
      video[0].codec_name !== "h264" || audio.some(s => s.codec_name !== "aac") ||
      !Number.isFinite(frameRate) || frameRate < 1 || frameRate > 120 || !Number.isSafeInteger(frameCount) || frameCount < 1 || frameCount > 7200 ||
      !Number.isFinite(formatDuration) || Math.abs(formatDuration - duration) > 0.15 ||
      !String(data.format.format_name).split(",").includes("mp4")) throw Error();
    return { width: video[0].width, height: video[0].height, duration, audio: audio.length === 1, frameRate, frameCount };
  } catch { throw new CompositionError("COMPOSITION_OUTPUT_INVALID"); }
}
