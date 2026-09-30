import { describe, expect, it } from "vitest";

import { computeRenderSignature } from "../lib/medical-motion/render-signature";
import { buildHeartScene } from "../lib/medical-motion/organs/heart/heart-visualization-resolver";

describe("computeRenderSignature", () => {
  it("is deterministic — the same scene and asset version always hash the same", () => {
    const scene = buildHeartScene({ coronaryArteries: true, leftVentricleAndAorta: false });

    expect(computeRenderSignature(scene, "heart-v1")).toBe(computeRenderSignature(scene, "heart-v1"));
  });

  it("changes when the asset version changes — never reuse a render across anatomy versions", () => {
    const scene = buildHeartScene({ coronaryArteries: true, leftVentricleAndAorta: false });

    expect(computeRenderSignature(scene, "heart-v1")).not.toBe(computeRenderSignature(scene, "heart-v2"));
  });

  it("changes when the focus (and therefore camera/highlight) changes", () => {
    const coronaryScene = buildHeartScene({ coronaryArteries: true, leftVentricleAndAorta: false });
    const lvScene = buildHeartScene({ coronaryArteries: false, leftVentricleAndAorta: true });

    expect(computeRenderSignature(coronaryScene, "heart-v1")).not.toBe(
      computeRenderSignature(lvScene, "heart-v1")
    );
  });

  it("is a hex-encoded sha256 (64 characters)", () => {
    const scene = buildHeartScene({ coronaryArteries: false, leftVentricleAndAorta: false });

    expect(computeRenderSignature(scene, "heart-v1")).toMatch(/^[0-9a-f]{64}$/);
  });
});
