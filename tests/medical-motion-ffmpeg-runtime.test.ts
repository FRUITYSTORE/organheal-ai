import { describe, it, expect } from "vitest";
import { createFfmpegRuntime, executeMediaProcess, inspectMedia } from "../lib/medical-motion/composition/ffmpeg-runtime";
import path from "node:path";
const cwd = process.cwd(), signal = () => new AbortController().signal;
const runtime = (timeoutMs = 2000) => createFfmpegRuntime({ ffmpeg: process.execPath, ffprobe: process.execPath, timeoutMs });
describe("explicit media subprocess lifecycle (Node TEST executable, not FFmpeg acceptance)", () => {
  it.each(["ffmpeg", "..\\ffmpeg.exe", "", "x\u0000"])("rejects implicit or unsafe path %j", async ffmpeg => {
    await expect(createFfmpegRuntime({ ffmpeg, ffprobe: process.execPath })).rejects.toThrow("COMPOSITION_UNAVAILABLE");
  });
  it("missing explicit executable fails closed", async () => {
    await expect(createFfmpegRuntime({ ffmpeg: path.join(cwd, "TEST-MISSING-ffmpeg.exe"), ffprobe: process.execPath })).rejects.toThrow("COMPOSITION_UNAVAILABLE");
  });
  it("copied config cannot launch", async () => {
    await expect(executeMediaProcess({ ...await runtime() }, "ffmpeg", ["-e", "process.exit(0)"], cwd, signal())).rejects.toThrow("COMPOSITION_INVALID");
  });
  it("argv remains literal without shell interpretation", async () => {
    const input = "TEST & echo injected | $(nothing) %PATH%";
    expect(await executeMediaProcess(await runtime(), "ffmpeg", ["-e", "process.stdout.write(process.argv[1])", input], cwd, signal())).toBe(input);
  });
  it("timeout kills and awaits process close", async () => {
    await expect(executeMediaProcess(await runtime(100), "ffmpeg", ["-e", "setInterval(()=>{},1000)"], cwd, signal())).rejects.toThrow("COMPOSITION_TIMEOUT");
  });
  it("cancellation kills active process", async () => {
    const controller = new AbortController(), configured = await runtime();
    const pending = executeMediaProcess(configured, "ffmpeg", ["-e", "setInterval(()=>{},1000)"], cwd, controller.signal);
    setTimeout(() => controller.abort(), 50); await expect(pending).rejects.toThrow("COMPOSITION_CANCELLED");
  });
  it("pre-cancel never launches", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(executeMediaProcess(await runtime(), "ffmpeg", ["-e", "throw Error('not reached')"], cwd, controller.signal)).rejects.toThrow("COMPOSITION_CANCELLED");
  });
  it.each(["stdout", "stderr"])("bounds %s and omits content from error", async stream => {
    await expect(executeMediaProcess(await runtime(), "ffmpeg", ["-e", `process.${stream}.write('PRIVATE_TEST'.repeat(50000));setInterval(()=>{},1000)`], cwd, signal())).rejects.toThrow("COMPOSITION_PROCESS_FAILED");
  });
  it("failure does not leak patient output", async () => {
    await expect(executeMediaProcess(await runtime(), "ffmpeg", ["-e", "console.error('PRIVATE_TEST');process.exit(1)"], cwd, signal())).rejects.toThrow(/^COMPOSITION_PROCESS_FAILED$/);
  });
  it("malformed probe cannot validate a movie", async () => {
    await expect(inspectMedia(await runtime(), "missing.mp4", cwd, signal())).rejects.toThrow("COMPOSITION_OUTPUT_INVALID");
  });
});
