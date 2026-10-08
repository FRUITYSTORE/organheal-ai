import { expect, it } from "vitest";
import { SSM_HEART_CANDIDATE as candidate, SSM_HEART_SELECTION } from "../lib/medical-motion/organs/heart/ssm-heart-candidate";
import { BP3D_HEART_CANDIDATE } from "../lib/medical-motion/organs/heart/bp3d-heart-candidate";
import { BP3D_HEART_SOURCE_PROFILE } from "../lib/medical-motion/organs/heart/bp3d-source-profile";
import { HEART_ORGAN_MODULE } from "../lib/medical-motion/organs/heart/heart-organ-module";
import { getOrganModule, getOrganModuleForAsset } from "../lib/medical-motion/organ-modules";
import { checkAssetReadiness } from "../lib/symptom-explanation/asset-readiness";

it("defines exact inactive SSM identity and five geometry entries plus apex reference", () => {
  expect(candidate).toMatchObject({ assetVersion: "heart-ssm-4506463-v2-internal-review-v1", anatomyVersion: "heart-ssm-4506463-v2-ventricular-boundaries-v1", assetStatus: "development-placeholder", anatomicallyValidated: false });
  const entries = candidate.anatomyRegistry.filter(e => e.availability !== "missing");
  expect(entries.map(e => [e.id,e.representation])).toEqual(SSM_HEART_SELECTION.map(([id,,representation]) => [id,representation]));
  expect(entries).toHaveLength(5);
  for (const entry of entries) {
    expect(entry.verification).toBe("unverified");
    expect(entry.assessment?.clinicalApprovalStatus).toBe("unreviewed");
    expect(entry.provenance).toMatchObject({ sourceId: "zenodo-4506463", sourceVersion: "v2" });
    expect(entry.coverage.verifiedRegions).toEqual([]);
  }
  expect(candidate.landmarks.find(l => l.id === "heart.ssm.apexReference")?.description).toMatch(/single source class-5 point.*not tissue/);
  expect(candidate.anatomyRegistry.some(e => e.id.includes("apex"))).toBe(false);
  expect(candidate.cameraTargets.map(c => c.id)).toEqual(["CAM_SSM_REVIEW_VENTRICLES"]);
  expect(getOrganModuleForAsset("heart",candidate.assetVersion)).toEqual(candidate);
  expect(getOrganModuleForAsset("lungs",candidate.assetVersion)).toBeNull();
  expect(getOrganModuleForAsset("heart",candidate.assetVersion+"-extra")).toBeNull();
});
it("keeps myocardium, septa, atria, vessels and valves explicitly missing", () => {
  for (const id of ["heart.myocardium","heart.septum.interatrial","heart.septum.interventricular","heart.leftAtrium","heart.rightAtrium","heart.aorta","heart.valve.mitral"]) {
    expect(candidate.anatomyRegistry.find(e => e.id === id)).toMatchObject({ availability: "missing", blenderObject: null, representation: "unknown" });
  }
  expect(candidate.anatomyRegistry.find(e => e.id === "heart.ssm.compositeVentricularTissueBoundary")?.representation).toBe("composite");
});
it("endocardial surfaces cannot satisfy tissue or wall requirements", () => {
  for (const representation of ["tissue","wall"] as const) {
    const result = checkAssetReadiness("heart",["heart.leftVentricle","heart.rightVentricle"],"development",()=>candidate,
      { "heart.leftVentricle": { representations: [representation] }, "heart.rightVentricle": { representations: [representation] } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("REAL_ANATOMICAL_ASSET_REQUIRED");
  }
  expect(checkAssetReadiness("heart",["heart.myocardium"],"development",()=>candidate).ok).toBe(false);
});
it("preserves BP3D and legacy identities and patient-facing rejection", () => {
  expect(getOrganModule("heart")).toBe(HEART_ORGAN_MODULE);
  expect(getOrganModuleForAsset("heart","heart-v2-development")).toEqual(HEART_ORGAN_MODULE);
  expect(getOrganModuleForAsset("heart",BP3D_HEART_CANDIDATE.assetVersion)).toEqual(BP3D_HEART_CANDIDATE);
  expect(BP3D_HEART_SOURCE_PROFILE.usage).toEqual(["internal-review"]);
  expect(BP3D_HEART_SOURCE_PROFILE.structures).toHaveLength(14);
  expect(checkAssetReadiness("heart",["heart.leftVentricle"],"production",()=>candidate).ok).toBe(false);
});
