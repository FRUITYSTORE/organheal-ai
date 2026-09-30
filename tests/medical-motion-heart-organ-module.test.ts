import { describe, expect, it } from "vitest";

import { HEART_ORGAN_MODULE } from "../lib/medical-motion/organs/heart/heart-organ-module";
import { buildHeartScene } from "../lib/medical-motion/organs/heart/heart-visualization-resolver";

describe("HEART_ORGAN_MODULE", () => {
  it("is not claimed as anatomically validated — geometry existing is not the same as clinical review", () => {
    expect(HEART_ORGAN_MODULE.anatomicallyValidated).toBe(false);
  });

  it("declares every anatomy group a real four-chamber heart needs", () => {
    for (const group of [
      "HEART_LEFT_ATRIUM",
      "HEART_RIGHT_ATRIUM",
      "HEART_LEFT_VENTRICLE",
      "HEART_RIGHT_VENTRICLE",
      "VALVE_MITRAL",
      "VALVE_TRICUSPID",
      "VALVE_AORTIC",
      "VALVE_PULMONARY",
      "AORTA",
      "PULMONARY_ARTERY",
      "PULMONARY_VEINS",
      "SVC",
      "IVC",
      "CORONARY_LAD",
      "CORONARY_RCA",
      "CORONARY_LCX",
    ]) {
      expect(HEART_ORGAN_MODULE.anatomyGroups).toContain(group);
    }
  });

  it("declares a camera preset for every visualization focus the resolver can produce", () => {
    const scenes = [
      buildHeartScene({ coronaryArteries: false, leftVentricleAndAorta: false }),
      buildHeartScene({ coronaryArteries: true, leftVentricleAndAorta: false }),
      buildHeartScene({ coronaryArteries: false, leftVentricleAndAorta: true }),
      buildHeartScene({ coronaryArteries: true, leftVentricleAndAorta: true }),
    ];

    for (const scene of scenes) {
      expect(HEART_ORGAN_MODULE.cameraPresets).toContain(scene.camera.preset);
    }
  });

  it("declares every highlight group any resolved scene can request", () => {
    const combined = buildHeartScene({ coronaryArteries: true, leftVentricleAndAorta: true });

    for (const structure of combined.highlight.structures) {
      expect(HEART_ORGAN_MODULE.highlightGroups).toContain(structure);
    }
  });
});
