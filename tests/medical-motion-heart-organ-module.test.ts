import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { HEART_ORGAN_MODULE } from "../lib/medical-motion/organs/heart/heart-organ-module";
import { buildHeartScene } from "../lib/medical-motion/organs/heart/heart-visualization-resolver";

const ASSET_DIR = join(process.cwd(), "render", "blender", "assets", "heart");
const registry = HEART_ORGAN_MODULE.anatomyRegistry;
const registryIds = registry.map((entry) => entry.id);
const blenderObjects = registry.map((entry) => entry.blenderObject);

function coversRegistry(target: string): boolean {
  return registryIds.some((id) => id === target || id.startsWith(`${target}.`));
}

describe("HEART_ORGAN_MODULE", () => {
  it("is a development placeholder that nobody has anatomically validated", () => {
    expect(HEART_ORGAN_MODULE.assetStatus).toBe("development-placeholder");
    expect(HEART_ORGAN_MODULE.anatomicallyValidated).toBe(false);
  });

  it("uses unique, heart-prefixed ids and unique Blender object names", () => {
    expect(new Set(registryIds).size).toBe(registryIds.length);
    expect(new Set(blenderObjects).size).toBe(blenderObjects.length);

    for (const id of registryIds) {
      expect(id).toMatch(/^heart(\.[A-Za-z][A-Za-z0-9]*)+$/);
    }
  });

  it("does not claim structures or capabilities the asset does not have", () => {
    for (const absent of [
      "heart.myocardium",
      "heart.septum.interatrial",
      "heart.septum.interventricular",
      "heart.valve.aortic",
      "heart.valve.pulmonary",
      "heart.pulmonaryVeins",
      "heart.coronary.leftMain",
    ]) {
      expect(registryIds).not.toContain(absent);
    }

    expect(HEART_ORGAN_MODULE.landmarks).toEqual([]);
    expect(HEART_ORGAN_MODULE.motionControllers).toEqual([]);
    expect(HEART_ORGAN_MODULE.renderStyles).toEqual(["cinematic"]);
  });

  it("marks the torus valves and constant-radius great vessels as placeholders", () => {
    for (const entry of registry) {
      if (entry.kind === "valve" || entry.kind === "greatVessel") {
        expect(entry.fidelity, entry.id).toBe("placeholder");
      }
    }
  });

  it("maps every vessel and coronary entry to a real centerline in the asset's vessels.json", () => {
    const vesselData = JSON.parse(readFileSync(join(ASSET_DIR, "vessels.json"), "utf-8")) as Record<string, unknown>;

    for (const entry of registry) {
      if (entry.kind === "greatVessel" || entry.kind === "coronaryArtery") {
        expect(Object.keys(vesselData), entry.id).toContain(entry.blenderObject);
      }
    }
  });

  it("registers exactly as many chambers as the asset's chambers.obj contains", () => {
    const objectLines = readFileSync(join(ASSET_DIR, "chambers.obj"), "utf-8")
      .split(/\r?\n/)
      .filter((line) => line.startsWith("o "));

    expect(registry.filter((entry) => entry.kind === "chamber")).toHaveLength(objectLines.length);
  });

  it("frames every camera target on registry structures or groups of them", () => {
    for (const target of HEART_ORGAN_MODULE.cameraTargets) {
      for (const framed of target.frames) {
        expect(coversRegistry(framed), `${target.id} -> ${framed}`).toBe(true);
      }
    }
  });

  it("stays consistent with the existing Heart Age scenes: every camera and highlight they use exists", () => {
    const scenes = [
      buildHeartScene({ coronaryArteries: false, leftVentricleAndAorta: false }),
      buildHeartScene({ coronaryArteries: true, leftVentricleAndAorta: false }),
      buildHeartScene({ coronaryArteries: false, leftVentricleAndAorta: true }),
      buildHeartScene({ coronaryArteries: true, leftVentricleAndAorta: true }),
    ];
    const cameraIds = HEART_ORGAN_MODULE.cameraTargets.map((target) => target.id);
    const registryIds = HEART_ORGAN_MODULE.anatomyRegistry.map((entry) => entry.id);

    for (const scene of scenes) {
      expect(cameraIds).toContain(scene.camera.preset);

      // Scenes speak in registry ids; only the render layer maps them to
      // Blender objects.
      for (const structure of scene.highlight.structures) {
        expect(registryIds).toContain(structure);
      }
    }
  });
});
