import path from "node:path";
import { createFfmpegRuntime, auditFfmpegRuntime, executeMediaProcess } from "../../lib/medical-motion/composition/ffmpeg-runtime";
export async function compositionRuntime(root: string) {
  const ffmpeg = process.env.ORGANHEAL_TEST_FFMPEG, ffprobe = process.env.ORGANHEAL_TEST_FFPROBE;
  if (!ffmpeg || !ffprobe) throw Error("EXPLICIT_TEST_MEDIA_EXECUTABLES_REQUIRED");
  const runtime = await createFfmpegRuntime({ ffmpeg, ffprobe, timeoutMs: 30_000 });
  await auditFfmpegRuntime(runtime, root, new AbortController().signal); return runtime;
}
export async function createSmokeBase(runtime: Awaited<ReturnType<typeof compositionRuntime>>, root: string) {
  await executeMediaProcess(runtime, "ffmpeg", ["-nostdin", "-hide_banner", "-loglevel", "error", "-n",
    "-f", "lavfi", "-i", "color=c=navy:s=128x128:r=24:d=3", "-c:v", "libx264", "-threads", "1", "-pix_fmt", "yuv420p", "-an", "base.mp4"], root, new AbortController().signal);
  return path.join(root, "base.mp4");
}
export function testSilenceWav(duration = 1) {
  const sampleRate = 8000, pcm = Buffer.alloc(sampleRate * 2 * duration), header = Buffer.alloc(44);
  header.write("RIFF"); header.writeUInt32LE(36 + pcm.length, 4); header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28); header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34); header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
