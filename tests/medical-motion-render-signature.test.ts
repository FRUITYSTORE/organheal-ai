import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { SceneDefinition } from "../lib/medical-motion/contracts/scene";

import { computeRenderSignature } from "../lib/medical-motion/render-signature";
import { buildHeartScene } from "../lib/medical-motion/organs/heart/heart-visualization-resolver";

describe("computeRenderSignature", () => {
  it.each([6.5, 5.001])("changes when only requested duration changes to %s, without frame rounding", (durationSeconds) => {
    const scene = buildHeartScene({ coronaryArteries: true, leftVentricleAndAorta: false });
    expect(computeRenderSignature({ ...scene, durationSeconds }, "heart-v1"))
      .not.toBe(computeRenderSignature(scene, "heart-v1"));
  });

  const changes: [string, (scene: SceneDefinition) => SceneDefinition][] = [
    ["focus alone", (scene) => ({ ...scene, focus: "overview" })],
    ["camera preset", (scene) => ({ ...scene, camera: { ...scene.camera, preset: "CAM_LV_APPROACH" } })],
    ["camera starting shot", (scene) => ({ ...scene, camera: { ...scene.camera, from: "CAM_COMBINED" } })],
    ["motion", (scene) => ({ ...scene, motion: { preset: "other-controller" } })],
    ["highlighted anatomy", (scene) => ({ ...scene, highlight: { ...scene.highlight, structures: ["heart.leftVentricle"] } })],
    ["intensity", (scene) => ({ ...scene, highlight: { ...scene.highlight, intensity: 0.4 } })],
    ["aspect ratio", (scene) => ({ ...scene, output: { ...scene.output, aspectRatio: "9:16" } })],
    ["resolution", (scene) => ({ ...scene, output: { ...scene.output, resolution: "720p" } })],
    ["media", (scene) => ({ ...scene, output: { ...scene.output, media: "still" } })],
  ];
  it.each(changes)("retains identity sensitivity to %s", (_, change) => {
    const scene = buildHeartScene({ coronaryArteries: true, leftVentricleAndAorta: false });
    expect(computeRenderSignature(change(scene), "heart-v1")).not.toBe(computeRenderSignature(scene, "heart-v1"));
  });

  it("retains top-level property order independence and sorted highlight identity", () => {
    const scene = buildHeartScene({ coronaryArteries: true, leftVentricleAndAorta: false });
    const reordered = Object.fromEntries(Object.entries(scene).reverse()) as SceneDefinition;
    reordered.highlight = { intensity: scene.highlight.intensity, structures: [...scene.highlight.structures].reverse() };
    expect(computeRenderSignature(reordered, "heart-v1")).toBe(computeRenderSignature(scene, "heart-v1"));
  });

  it("includes the exact requested duration once in the existing canonical payload", () => {
    const scene = buildHeartScene({ coronaryArteries: true, leftVentricleAndAorta: false });
    scene.durationSeconds = 5.001;
    const canonical = '{"organ":"heart","assetVersion":"heart-v1","sceneVersion":"3","durationSeconds":5.001,"focus":"coronary","camera":"CAM_CORONARY_APPROACH","cameraFrom":"CAM_HEART_OVERVIEW","motion":"clinical-heartbeat","highlight":{"structures":["heart.coronary.lad","heart.coronary.lcx","heart.coronary.rca"],"intensity":0.8},"output":{"aspectRatio":"16:9","resolution":"1080p","media":"video"}}';
    expect(computeRenderSignature(scene, "heart-v1")).toBe(createHash("sha256").update(canonical).digest("hex"));
  });

  it("does not use timestamps or randomness", () => {
    const scene = buildHeartScene({ coronaryArteries: true, leftVentricleAndAorta: false });
    const expected = computeRenderSignature(scene, "heart-v1");
    const time = vi.spyOn(Date, "now").mockImplementation(() => { throw new Error("Unexpected time dependency"); });
    const random = vi.spyOn(Math, "random").mockImplementation(() => { throw new Error("Unexpected random dependency"); });
    try { expect(computeRenderSignature(scene, "heart-v1")).toBe(expected); }
    finally { time.mockRestore(); random.mockRestore(); }
  });
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
