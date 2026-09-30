import { describe, expect, it } from "vitest";

import {
  buildHeartScene,
  resolveHeartVisualizationFocus,
} from "../lib/medical-motion/organs/heart/heart-visualization-resolver";
import type { HeartFocus } from "../lib/heart-age/heart-focus";

function focus(overrides: Partial<HeartFocus> = {}): HeartFocus {
  return { coronaryArteries: false, leftVentricleAndAorta: false, ...overrides };
}

describe("resolveHeartVisualizationFocus", () => {
  it("resolves neither factor to overview", () => {
    expect(resolveHeartVisualizationFocus(focus())).toBe("overview");
  });

  it("resolves coronaryArteries alone to coronary", () => {
    expect(resolveHeartVisualizationFocus(focus({ coronaryArteries: true }))).toBe("coronary");
  });

  it("resolves leftVentricleAndAorta alone to lvAorta", () => {
    expect(resolveHeartVisualizationFocus(focus({ leftVentricleAndAorta: true }))).toBe("lvAorta");
  });

  it("resolves both factors to combined — never an ambiguous state", () => {
    expect(
      resolveHeartVisualizationFocus(focus({ coronaryArteries: true, leftVentricleAndAorta: true }))
    ).toBe("combined");
  });
});

describe("buildHeartScene", () => {
  it("never invents a pathology-implying highlight for overview — empty structures, zero intensity", () => {
    const scene = buildHeartScene(focus());

    expect(scene.focus).toBe("overview");
    expect(scene.highlight.structures).toEqual([]);
    expect(scene.highlight.intensity).toBe(0);
    expect(scene.camera.preset).toBe("CAM_HEART_OVERVIEW");
  });

  it("highlights only the real coronary vessels for the coronary focus", () => {
    const scene = buildHeartScene(focus({ coronaryArteries: true }));

    expect(scene.highlight.structures).toEqual(["heart.coronary.lad", "heart.coronary.rca", "heart.coronary.lcx"]);
    expect(scene.camera.preset).toBe("CAM_CORONARY_APPROACH");
    expect(scene.durationSeconds).toBe(5);
  });

  it("highlights only the real LV + aorta for the lvAorta focus", () => {
    const scene = buildHeartScene(focus({ leftVentricleAndAorta: true }));

    expect(scene.highlight.structures).toEqual(["heart.leftVentricle", "heart.aorta"]);
    expect(scene.camera.preset).toBe("CAM_LV_APPROACH");
  });

  it("extends the duration and highlights everything for the combined focus", () => {
    const scene = buildHeartScene(focus({ coronaryArteries: true, leftVentricleAndAorta: true }));

    expect(scene.highlight.structures).toEqual([
      "heart.coronary.lad",
      "heart.coronary.rca",
      "heart.coronary.lcx",
      "heart.leftVentricle",
      "heart.aorta",
    ]);
    expect(scene.camera.preset).toBe("CAM_COMBINED");
    expect(scene.durationSeconds).toBe(6.5);
  });

  it("always targets the heart organ at a fixed, versioned scene shape", () => {
    const scene = buildHeartScene(focus());

    expect(scene.organ).toBe("heart");
    expect(scene.sceneVersion).toBe("3");
    expect(scene.output).toEqual({ aspectRatio: "16:9", resolution: "1080p", media: "video" });
    expect(scene.motion.preset).toBe("clinical-heartbeat");
  });

  it("opens on the whole heart and moves in on the focus, but never moves for an overview", () => {
    expect(buildHeartScene(focus()).camera).toEqual({ preset: "CAM_HEART_OVERVIEW" });
    expect(buildHeartScene(focus({ coronaryArteries: true })).camera).toEqual({
      preset: "CAM_CORONARY_APPROACH",
      from: "CAM_HEART_OVERVIEW",
    });
  });
});
