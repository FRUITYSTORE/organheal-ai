import { expect, it } from "vitest";
import { APIL_LOCAL_HEART_CANDIDATE as candidate, APIL_LOCAL_HEART_INVENTORY_ONLY, APIL_LOCAL_HEART_LIMITATIONS } from "../lib/medical-motion/organs/heart/apil-local-heart-candidate";
import audit from "../medical-assets/apil-local-heart-inventory.json";
import { getOrganModuleForAsset } from "../lib/medical-motion/organ-modules";
import { ANATOMY_SOURCES } from "../lib/medical-motion/anatomy-sources";

it("defines exact inactive local asset identity and pinned provenance without production approval", () => {
  expect(candidate).toMatchObject({ assetVersion: "heart-apil-local-reference-v1", anatomyVersion: "heart-apil-local-reference-anatomy-v1", assetStatus: "development-placeholder", anatomicallyValidated: false, cameraTargets: [], motionControllers: [] });
  expect(getOrganModuleForAsset("heart", candidate.assetVersion)).toEqual(candidate);
  for (const entry of candidate.anatomyRegistry.filter(e => e.availability !== "missing")) {
    expect(entry).toMatchObject({ representation: "surface", availability: "partial", verification: "unverified", coverage: { verifiedRegions: [] }, assessment: { semanticStatus: "unverified", clinicalApprovalStatus: "unreviewed" }, provenance: { licenseReview: { status: "unresolved" } } });
    const source = ANATOMY_SOURCES.find(s => s.id === entry.provenance!.sourceId)!;
    expect(entry.provenance!.sourceVersion).toBe(source.sourceVersion);
    for (const hash of [audit.outerArchiveSha256, audit.nestedArchiveSha256, audit.fbxSha256]) expect(entry.provenance!.derivation).toContain(hash);
    expect(entry.provenance!.derivation).toContain("exact Sketchfab artifact identity UNRESOLVED");
    expect(entry.provenance!.derivation).toContain("patient-facing=false");
  }
});

it("keeps RARV inventory-only and unavailable anatomy explicit", () => {
  expect(candidate.anatomyRegistry.filter(e => e.availability !== "missing").map(e => [e.id, e.blenderObject])).toEqual([
    ["heart.leftVentricle", "APIL HEART 1 LV Edit"], ["heart.leftAtrium", "APIL HEART 1 LA Edit"], ["heart.aorta", "APIL HEART 1 AORTA Edit"],
  ]);
  expect(APIL_LOCAL_HEART_INVENTORY_ONLY.canonicalMapping).toBeNull();
  for (const id of ["heart.rightAtrium", "heart.rightVentricle", "heart.myocardium", "heart.septum.interatrial", "heart.septum.interventricular", "heart.valve.mitral", "heart.valve.tricuspid", "heart.valve.aortic", "heart.valve.pulmonary", "heart.coronary.leftMain", "heart.coronary.lad", "heart.coronary.lcx", "heart.coronary.rca", "heart.pulmonaryVeins"]) {
    expect(candidate.anatomyRegistry.find(e => e.id === id)).toMatchObject({ availability: "missing", blenderObject: null });
  }
  expect(APIL_LOCAL_HEART_LIMITATIONS.join(" ")).toContain("4 non-manifold edges, including 1 boundary edge");
  expect(APIL_LOCAL_HEART_LIMITATIONS.join(" ")).toContain("Outward normals unverified; physical anatomical scale unvalidated; anatomical axes unresolved");
});
