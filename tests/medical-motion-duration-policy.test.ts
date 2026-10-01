import { describe, expect, it } from "vitest";
import { MAX_VIDEO_FRAME_COUNT, validateRenderDuration } from "../lib/medical-motion/render/duration-policy";
import { buildHeartScene } from "../lib/medical-motion/organs/heart/heart-visualization-resolver";
import { computeRenderSignature } from "../lib/medical-motion/render-signature";

describe("render duration policy", () => {
  it.each([0, -1, NaN, Infinity, -Infinity, "5", null, undefined])("rejects invalid duration %s", (duration) => {
    expect(validateRenderDuration(duration, "video").ok).toBe(false);
    expect(validateRenderDuration(duration, "still").ok).toBe(false);
  });
  it.each([[5, 120], [6.5, 156], [5.001, 120], [2.5 / 24, 2], [3.5 / 24, 4], [0.001, 1]])(
    "samples %s seconds as %s inclusive frames", (seconds, count) => {
      const result = validateRenderDuration(seconds, "video");
      expect(result).toEqual({ ok: true, videoTiming: {
        fps: 24, fpsBase: 1, frameStep: 1, frameStart: 1, frameEnd: count, frameCount: count,
      } });
      if (result.ok && result.videoTiming) {
        const timing = result.videoTiming;
        expect((timing.frameEnd - timing.frameStart) / timing.frameStep + 1).toBe(count);
        expect(count / (timing.fps / timing.fpsBase)).toBe(count / 24);
      }
    });
  it("accepts the runtime frame ceiling and rejects overflow instead of clamping", () => {
    expect(validateRenderDuration(MAX_VIDEO_FRAME_COUNT / 24, "video").ok).toBe(true);
    expect(validateRenderDuration((MAX_VIDEO_FRAME_COUNT + 1) / 24, "video").ok).toBe(false);
    expect(validateRenderDuration(Number.MAX_VALUE, "video").ok).toBe(false);
    expect(validateRenderDuration(Number.MAX_VALUE, "still")).toEqual({ ok: true, videoTiming: null });
  });
  it("keeps distinct requested durations in identity even when frame counts match", () => {
    const scene = buildHeartScene({ coronaryArteries: true, leftVentricleAndAorta: false });
    expect(validateRenderDuration(5, "video")).toEqual(validateRenderDuration(5.001, "video"));
    expect(computeRenderSignature({ ...scene, durationSeconds: 5 }, "asset")).not.toBe(
      computeRenderSignature({ ...scene, durationSeconds: 5.001 }, "asset"));
  });
});
