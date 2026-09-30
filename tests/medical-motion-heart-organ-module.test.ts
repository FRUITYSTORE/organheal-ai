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

    expect(HEART_ORGAN_MODULE.motionControllers).toEqual([]);
    expect(HEART_ORGAN_MODULE.renderStyles).toEqual(["cinematic"]);
  });

  it("lists exactly the landmarks the build measures, with the build's object names", () => {
    const exported = JSON.parse(readFileSync(join(ASSET_DIR, "landmarks.json"), "utf-8")) as {
      landmarks: Record<string, { blenderObject: string; position: number[] }>;
    };
    const landmarks = HEART_ORGAN_MODULE.landmarks;

    expect(landmarks.map((l) => l.id).sort()).toEqual(Object.keys(exported.landmarks).sort());
    for (const l of landmarks) {
      expect(l.blenderObject).toBe(exported.landmarks[l.id].blenderObject);
      expect(exported.landmarks[l.id].position).toHaveLength(3);
      expect(l.description.length).toBeGreaterThan(0);
    }
  });

  it("measures landmarks that sit where anatomy puts them", () => {
    const { landmarks } = JSON.parse(readFileSync(join(ASSET_DIR, "landmarks.json"), "utf-8")) as {
      landmarks: Record<string, { position: [number, number, number] }>;
    };
    const at = (id: string) => landmarks[id].position;
    // Scene axes: +x is the patient's left, -y is anterior (the camera
    // side), +z is superior.
    const [apexX, , apexZ] = at("heart.apex");
    const [baseX, , baseZ] = at("heart.base");

    // The apex points to the patient's left and down from the base.
    expect(apexX).toBeGreaterThan(baseX);
    expect(apexZ).toBeLessThan(baseZ);
    // The right ventricle is the most anterior chamber, the left atrium the
    // most posterior.
    const chamberY = ["ra", "rv", "la", "lv"].map((c) => at(`heart.${c}Center`)[1]);
    expect(Math.min(...chamberY)).toBe(at("heart.rvCenter")[1]);
    expect(Math.max(...chamberY)).toBe(at("heart.laCenter")[1]);
    // LAD and circumflex both leave the left main bifurcation.
    expect(at("heart.coronary.ladOrigin")).toEqual(at("heart.coronary.lcxOrigin"));
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
