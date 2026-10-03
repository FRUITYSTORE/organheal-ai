import { randomUUID, createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, beforeAll, afterAll, it, expect, vi } from "vitest";
import sharp from "sharp";
import { compositionRuntime, createSmokeBase, testSilenceWav } from "../helpers/composition-media";
import { compositionScene, compositionAuthority, compositionSpecification, COMPOSITION_MECHANISMS } from "../helpers/composition-scene";
import { validatePersonalization } from "../../lib/medical-motion/composition/specification";
import { composePersonalizedMedia } from "../../lib/medical-motion/composition/compositor";
import { inspectMedia, createFfmpegRuntime, executeMediaProcess } from "../../lib/medical-motion/composition/ffmpeg-runtime";
import * as mediaProcess from "../../lib/medical-motion/composition/ffmpeg-runtime";
import type { ArtifactRecord } from "../../lib/medical-motion/artifacts/repository";
import type { PersonalizationSpecification } from "../../lib/medical-motion/contracts/personalization";
import { rasterizeOverlays } from "../../lib/medical-motion/composition/overlays";

describe("real explicit FFmpeg TEST media acceptance (no anatomy claims)", () => {
  let root: string, runtime: Awaited<ReturnType<typeof compositionRuntime>>, bytes: Buffer, record: ArtifactRecord;
  beforeAll(async () => {
    root = await mkdtemp(path.join(tmpdir(), "organheal-composition-media-")); runtime = await compositionRuntime(root);
    bytes = await readFile(await createSmokeBase(runtime, root));
    record = { id: compositionSpecification().baseArtifactId, userId: compositionAuthority.userId,
      jobId: randomUUID(), originAttempt: randomUUID(), media: "video", byteSize: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"), persisted: true };
  }, 60_000);
  afterAll(async () => { if (root && path.dirname(root) === tmpdir() && path.basename(root).startsWith("organheal-composition-media-")) await rm(root, { recursive: true, force: true }); });
  const signal = () => new AbortController().signal;
  async function compose(spec: PersonalizationSpecification, source = { record, bytes }) {
    const capability = validatePersonalization(spec, compositionScene(0, source.record.media), { ...compositionAuthority, duration: 3, baseSha256: source.record.sha256 });
    return composePersonalizedMedia(runtime, capability, source, { jobId: randomUUID(), userId: compositionAuthority.userId, attemptToken: randomUUID() }, signal());
  }
  it.each(["ar", "en"] as const)("produces valid %s MP4 and immutable base", async language => {
    const spec = compositionSpecification(); spec.language = language;
    spec.textOverlays[0] = { ...spec.textOverlays[0], text: language === "ar" ? "شرح تجريبي\nالقيمة 123" : "TEST caption\nValue 123" };
    const before = Buffer.from(bytes), candidate = await compose(spec);
    try {
      expect(await inspectMedia(runtime, candidate.localPath, path.dirname(candidate.localPath), signal())).toMatchObject({ width: 1280, height: 720, audio: false });
      expect(bytes.equals(before)).toBe(true); expect((await readFile(candidate.localPath)).equals(bytes)).toBe(false);
      const images = await rasterizeOverlays(spec, 384, 720);
      await writeFile(path.join(tmpdir(), `organheal-composition-qa-${language}.png`), images[0].bytes);
    } finally { expect(await candidate.discard()).toBe(true); }
  }, 60_000);
  it.each(["9:16", "1:1"] as const)("fit-only %s preserves base without crop", async aspectRatio => {
    const spec = compositionSpecification(); spec.outputProfile.aspectRatio = aspectRatio;
    spec.textOverlays[0] = { ...spec.textOverlays[0], text: "TEST" };
    const candidate = await compose(spec);
    try { expect(await inspectMedia(runtime, candidate.localPath, path.dirname(candidate.localPath), signal())).toMatchObject({ width: 720, height: aspectRatio === "1:1" ? 720 : 1280 }); }
    finally { await candidate.discard(); }
  }, 60_000);
  it("PNG base can create a video without altering the stored image", async () => {
    const image = await sharp({ create: { width: 128, height: 128, channels: 3, background: "navy" } }).png().toBuffer();
    const source = { bytes: image, record: { ...record, media: "still" as const, byteSize: image.length,
      sha256: createHash("sha256").update(image).digest("hex") } };
    const candidate = await compose(compositionSpecification(), source);
    try { expect((await inspectMedia(runtime, candidate.localPath, path.dirname(candidate.localPath), signal())).duration).toBeCloseTo(3, 1); }
    finally { await candidate.discard(); }
  }, 60_000);
  it("reusable and private TEST audio are assembled with explicit silence timing", async () => {
    const spec = compositionSpecification(); const reusable = { segmentId: "TEST-reusable", version: "1", language: "en" as const,
      textFingerprint: "a".repeat(64), medicalReviewStatus: "approved" as const, audioArtifactId: randomUUID(),
      audioSha256: createHash("sha256").update(testSilenceWav()).digest("hex"), duration: 1, reuseScope: "reusable-no-phi" as const };
    const privateSegment = { ...reusable, segmentId: "TEST-private", audioArtifactId: randomUUID(), reuseScope: "private-context" as const };
    spec.audioSegments = [{ slot: "voice-segment", start: 0, segment: reusable }];
    spec.dynamicNarrationSlots = [{ slot: "voice-segment", start: 2, segment: privateSegment }];
    const cap = validatePersonalization(spec, compositionScene(), { ...compositionAuthority, duration: 3, baseSha256: record.sha256 });
    const candidate = await composePersonalizedMedia(runtime, cap, { record, bytes }, { jobId: randomUUID(), userId: compositionAuthority.userId, attemptToken: randomUUID() }, signal(),
      async id => ({ bytes: testSilenceWav(), segment: id === reusable.audioArtifactId ? reusable : privateSegment,
        userId: compositionAuthority.userId, contextId: compositionAuthority.contextId }));
    try { expect(await inspectMedia(runtime, candidate.localPath, path.dirname(candidate.localPath), signal())).toMatchObject({ audio: true, duration: 3 }); }
    finally { await candidate.discard(); }
  }, 60_000);
  it.each(["unreviewed-source", "wrong-sha", "wrong-duration"])("rejects %s narration even with approved input claims", async failure => {
    const spec = compositionSpecification(), audio = testSilenceWav();
    const segment = { segmentId: "TEST", version: "1", language: "en" as const, textFingerprint: "a".repeat(64),
      medicalReviewStatus: "approved" as const, audioArtifactId: randomUUID(),
      audioSha256: failure === "wrong-sha" ? "a".repeat(64) : createHash("sha256").update(audio).digest("hex"),
      duration: failure === "wrong-duration" ? 2 : 1, reuseScope: "reusable-no-phi" as const };
    spec.audioSegments = [{ slot: "voice-segment", start: 0, segment }];
    const cap = validatePersonalization(spec, compositionScene(), { ...compositionAuthority, duration: 3, baseSha256: record.sha256 });
    await expect(composePersonalizedMedia(runtime, cap, { record, bytes }, { jobId: randomUUID(), userId: compositionAuthority.userId, attemptToken: randomUUID() }, signal(),
      async () => ({ bytes: audio, segment: failure === "unreviewed-source" ? { ...segment, medicalReviewStatus: "unreviewed" } : segment }))).rejects.toThrow("COMPOSITION_INVALID");
  });
  it("corrupt base fails before a final artifact is produced", async () => {
    await expect(compose(compositionSpecification(), { record, bytes: Buffer.from("corrupt") })).rejects.toThrow("COMPOSITION_INVALID");
  });
  it.each(["trend", "range-marker", "band", "comparison"] as const)("real deterministic %s chart and numeric overlay", async kind => {
    const spec = compositionSpecification();
    spec.numericOverlays = [{ slot: "text-value", start: 0, end: 2, value: 123, unit: "TEST-unit" }];
    spec.chartOverlays = [{ slot: "chart", start: 0, end: 2, kind, values: [1, 2, 3], minimum: 0, maximum: 5,
      label: "TEST values", interpretation: "descriptive-only" }];
    const candidate = await compose(spec);
    try { expect((await inspectMedia(runtime, candidate.localPath, path.dirname(candidate.localPath), signal())).duration).toBeCloseTo(3, 1); }
    finally { await candidate.discard(); }
  });
  it.each(COMPOSITION_MECHANISMS.map((m, index) => [m.affectedOrgans[0], index] as const))("real generic %s TEST metadata (color media, not anatomy)", async (_, index) => {
    const cap = validatePersonalization(compositionSpecification(), compositionScene(index), { ...compositionAuthority, duration: 3, baseSha256: record.sha256 });
    const candidate = await composePersonalizedMedia(runtime, cap, { record, bytes }, { jobId: randomUUID(), userId: compositionAuthority.userId, attemptToken: randomUUID() }, signal());
    try { expect((await inspectMedia(runtime, candidate.localPath, path.dirname(candidate.localPath), signal())).width).toBe(1280); }
    finally { await candidate.discard(); }
  });
  it("actual media duration limits subtitles even when DSL hint is longer", async () => {
    const spec = compositionSpecification(); spec.textOverlays[0] = { ...spec.textOverlays[0], end: 5 };
    const cap = validatePersonalization(spec, compositionScene(), { ...compositionAuthority, baseSha256: record.sha256 });
    await expect(composePersonalizedMedia(runtime, cap, { record, bytes }, { jobId: randomUUID(), userId: compositionAuthority.userId, attemptToken: randomUUID() }, signal())).rejects.toThrow("COMPOSITION_INVALID");
  });
  it.each(["timeout", "cancel"])("actual FFmpeg %s terminates before publication", async scenario => {
    const controller = new AbortController();
    const configured = scenario === "timeout" ? await createFfmpegRuntime({ ffmpeg: runtime.ffmpeg, ffprobe: runtime.ffprobe, timeoutMs: 100 }) : runtime;
    const task = executeMediaProcess(configured, "ffmpeg", ["-nostdin", "-hide_banner", "-loglevel", "error", "-re", "-f", "lavfi",
      "-i", "color=s=64x64:r=24:d=30", "-f", "null", "-"], root, controller.signal);
    if (scenario === "cancel") setTimeout(() => controller.abort(), 100);
    await expect(task).rejects.toThrow(scenario === "timeout" ? "COMPOSITION_TIMEOUT" : "COMPOSITION_CANCELLED");
  });
  it("zero-exit partial movie is rejected and its invocation removed", async () => {
    const execute = mediaProcess.executeMediaProcess; let invocation = "";
    const spy = vi.spyOn(mediaProcess, "executeMediaProcess").mockImplementation(async (config, executable, args, cwd, abort) => {
      if (executable === "ffmpeg" && args.at(-1) === "personalized.mp4") {
        invocation = cwd; await writeFile(path.join(cwd, "personalized.mp4"), Buffer.from("partial")); return "";
      }
      return execute(config, executable, args, cwd, abort);
    });
    try { await expect(compose(compositionSpecification())).rejects.toThrow("COMPOSITION_OUTPUT_INVALID");
      await expect(readFile(path.join(invocation, "personalized.mp4"))).rejects.toThrow(); }
    finally { spy.mockRestore(); }
  });
});
