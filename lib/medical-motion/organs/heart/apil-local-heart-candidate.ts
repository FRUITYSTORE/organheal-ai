import type { AnatomyRegistryEntry, OrganModule } from "../../contracts/organ-module";
import type { AnatomyStructureId } from "../../contracts/anatomy";
import audit from "../../../../medical-assets/apil-local-heart-inventory.json";

export const APIL_LOCAL_HEART_ASSET_VERSION = "heart-apil-local-reference-v1";
export const APIL_LOCAL_HEART_ANATOMY_VERSION = "heart-apil-local-reference-anatomy-v1";
const evidence = "medical-assets/apil-local-heart-inventory.json";

/** Local artifact identity only; never an exact Sketchfab download assertion. */
export const APIL_LOCAL_HEART_LIMITATIONS = [
  "Local artifact VERIFIED_BY_CONTENT; exact Sketchfab artifact identity UNRESOLVED.",
  "LV: 4 non-manifold edges, including 1 boundary edge.",
  "Outward normals unverified; physical anatomical scale unvalidated; anatomical axes unresolved.",
  "Source labels only; coverage and wall/tissue semantics unverified. No geometry modifications.",
  "RARV remains combined inventory-only; no independently addressable RA/RV.",
  "Internal-review only; patient-facing=false; clinical approval=unreviewed; license clearance=unresolved.",
] as const;

export const APIL_LOCAL_HEART_INVENTORY_ONLY = {
  sourceObject: "APIL HEART 1 RARV Edit",
  canonicalMapping: null,
  meaning: "Combined source-labeled RA/RV candidate; not split or bound to separate chambers.",
} as const;

const bindings = [
  ["heart.leftVentricle", "APIL HEART 1 LV Edit", "chamber"],
  ["heart.leftAtrium", "APIL HEART 1 LA Edit", "chamber"],
  ["heart.aorta", "APIL HEART 1 AORTA Edit", "greatVessel"],
] as const;
const selected: AnatomyRegistryEntry[] = bindings.map(([id, name, kind]) => {
  if (!audit.meshInventory.some(mesh => mesh.objectName === name)) throw Error("APIL_CANDIDATE_IDENTITY_MISMATCH");
  return {
    id, kind, representation: "surface", availability: "partial", verification: "unverified",
    blenderObject: name, fidelity: "reference-derived",
    coverage: { verifiedRegions: [], unknownRegions: [id], excludedRegions: [], evidenceRefs: [] },
    provenance: {
      sourceId: "HEART_REFERENCE", sourceVersion: "sketchfab-ae1c46e7f44547b3aea4d79acdb6e6ab-revision-unresolved",
      licenseId: "HEART_REFERENCE-license-unresolved", evidenceRefs: [evidence],
      derivation: `Unmodified local FBX ${audit.fbxSha256}; nested archive ${audit.nestedArchiveSha256}; outer archive ${audit.outerArchiveSha256}. ${APIL_LOCAL_HEART_LIMITATIONS.join(" ")}`,
      licenseReview: { status: "unresolved", evidenceRefs: [] },
    },
    assessment: { geometryStatus: "imported", semanticStatus: "unverified", clinicalApprovalStatus: "unreviewed",
      renderCompatibility: "blender-compatible", geometryEvidenceRefs: [evidence], semanticEvidenceRefs: [], clinicalEvidenceRefs: [] },
  };
});
const absent: AnatomyStructureId[] = [
  "heart.rightAtrium", "heart.rightVentricle", "heart.myocardium",
  "heart.septum.interatrial", "heart.septum.interventricular",
  "heart.valve.mitral", "heart.valve.tricuspid", "heart.valve.aortic", "heart.valve.pulmonary",
  "heart.coronary.leftMain", "heart.coronary.lad", "heart.coronary.lcx", "heart.coronary.rca",
  "heart.pulmonaryVeins", "heart.pulmonaryTrunk", "heart.leftPulmonaryArtery", "heart.rightPulmonaryArtery",
  "heart.superiorVenaCava", "heart.inferiorVenaCava",
];
const missing: AnatomyRegistryEntry[] = absent.map(id => ({
  id, kind: id === "heart.myocardium" ? "myocardium" : id.includes(".septum.") ? "septum" : id.includes(".valve.") ? "valve" : id.includes(".coronary.") ? "coronaryArtery" : id === "heart.rightAtrium" || id === "heart.rightVentricle" ? "chamber" : "greatVessel",
  availability: "missing", representation: "unknown", verification: "unverified", blenderObject: null, fidelity: null,
  coverage: { verifiedRegions: [], unknownRegions: [id], excludedRegions: [], evidenceRefs: [] },
}));

/** Inactive metadata definition: not registered in runtime or source profiles. */
export const APIL_LOCAL_HEART_CANDIDATE: OrganModule = {
  id: "heart", assetVersion: APIL_LOCAL_HEART_ASSET_VERSION, anatomyVersion: APIL_LOCAL_HEART_ANATOMY_VERSION,
  assetStatus: "development-placeholder", anatomicallyValidated: false,
  anatomyRegistry: [...selected, ...missing],
  landmarks: [
    { id: "heart.apil.localBoundsMin", blenderObject: "LM_heart.apil.localBoundsMin", description: "Reserved candidate framing reference: audited whole-asset world AABB minimum. No Blender Empty created; not anatomical apex." },
    { id: "heart.apil.localBoundsMax", blenderObject: "LM_heart.apil.localBoundsMax", description: "Reserved candidate framing reference: audited whole-asset world AABB maximum. No Blender Empty created; not anatomical base." },
  ],
  scaleReference: ["heart.apil.localBoundsMin", "heart.apil.localBoundsMax"],
  cameraTargets: [], motionControllers: [], cutawayStates: [], renderStyles: [],
};
