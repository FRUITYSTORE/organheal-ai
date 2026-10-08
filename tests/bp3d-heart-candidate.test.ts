import { expect, it } from "vitest";
import { BP3D_HEART_CANDIDATE as candidate, BP3D_HEART_SELECTION } from "../lib/medical-motion/organs/heart/bp3d-heart-candidate";
import { HEART_ORGAN_MODULE } from "../lib/medical-motion/organs/heart/heart-organ-module";
import { getOrganModule, getOrganModuleForAsset } from "../lib/medical-motion/organ-modules";

it("defines exact inactive BP3D asset/anatomy identities without replacing the legacy module", () => {
  expect(candidate).toMatchObject({ id: "heart", assetVersion: "heart-bp3d-4.0-internal-review-v1", anatomyVersion: "heart-bp3d-4.0-cavity-vessel-anatomy-v1", assetStatus: "development-placeholder", anatomicallyValidated: false });
  expect(getOrganModule("heart")).toBe(HEART_ORGAN_MODULE);
  expect(getOrganModuleForAsset("heart", candidate.assetVersion)).toEqual(candidate);
  expect(HEART_ORGAN_MODULE.assetVersion).toBe("heart-v2-development");
  expect(HEART_ORGAN_MODULE.anatomyRegistry.find(e => e.id === "heart.leftVentricle")?.representation).toBe("surface");
  expect(candidate.landmarks).toHaveLength(6);
  expect(candidate.cameraTargets).toHaveLength(4);
  expect(candidate.motionControllers).toEqual([]);
});

it("selects exactly four cavity and ten vessel source representations without medical approval", () => {
  const entries = candidate.anatomyRegistry.filter(e => e.availability !== "missing");
  expect(entries.map(e => e.id)).toEqual(BP3D_HEART_SELECTION.map(([id]) => id));
  expect(entries.filter(e => e.representation === "cavity")).toHaveLength(4);
  expect(entries.filter(e => e.representation === "vessel")).toHaveLength(10);
  for (const entry of entries) {
    expect(entry.verification).toBe("unverified");
    expect(entry.availability).toBe("partial");
    expect(entry.assessment?.clinicalApprovalStatus).toBe("unreviewed");
    expect(entry.provenance).toMatchObject({ sourceId: "bodyparts3d-current-archive", sourceVersion: "archive-4.0-license-2025-02-27", licenseId: "CC-BY-4.0", licenseReview: { status: "unresolved" } });
    expect(entry.coverage.verifiedRegions).toEqual([]);
  }
});

it("keeps myocardium, both septa, all valves and pulmonary-vein aggregate explicitly missing", () => {
  expect(candidate.anatomyRegistry.filter(e => e.availability === "missing").map(e => e.id).sort()).toEqual([
    "heart.myocardium", "heart.pulmonaryVeins", "heart.septum.interatrial", "heart.septum.interventricular", "heart.valve.aortic", "heart.valve.mitral", "heart.valve.pulmonary", "heart.valve.tricuspid",
  ]);
  for (const entry of candidate.anatomyRegistry.filter(e => e.availability === "missing")) {
    expect(entry.blenderObject).toBeNull();
    expect(entry.fidelity).toBeNull();
  }
});
