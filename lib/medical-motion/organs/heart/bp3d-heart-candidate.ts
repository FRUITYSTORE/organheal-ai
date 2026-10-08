import type { AnatomyRegistryEntry, OrganModule } from "../../contracts/organ-module";
import type { AnatomyStructureId } from "../../contracts/anatomy";
import manifest from "../../../../medical-assets/candidates/bodyparts3d-4.0/selection-manifest.json";

export const BP3D_HEART_ASSET_VERSION = "heart-bp3d-4.0-internal-review-v1";
export const BP3D_HEART_ANATOMY_VERSION = "heart-bp3d-4.0-cavity-vessel-anatomy-v1";

// Exact source representations only. These are metadata bindings, not runtime
// object registrations; multi-object representations require a future builder.
export const BP3D_HEART_SELECTION = [
  ["heart.rightAtrium", "BP8677"], ["heart.leftAtrium", "BP8719"],
  ["heart.rightVentricle", "BP9227"], ["heart.leftVentricle", "BP8928"],
  ["heart.aorta", "BP10329"], ["heart.superiorVenaCava", "BP10292"],
  ["heart.inferiorVenaCava", "BP10311"], ["heart.pulmonaryTrunk", "BP8690"],
  ["heart.rightPulmonaryArtery", "BP8968"], ["heart.leftPulmonaryArtery", "BP8463"],
  ["heart.coronary.rca", "BP8221"], ["heart.coronary.leftMain", "BP8961"],
  ["heart.coronary.lad", "BP8970"], ["heart.coronary.lcx", "BP8397"],
] as const;

const selected: AnatomyRegistryEntry[] = BP3D_HEART_SELECTION.map(([id, representationId]) => {
  const asset = manifest.assets.find(asset => asset.representationId === representationId);
  if (!asset || asset.proposedOrganHealStructureId !== id || !["cavity", "vessel"].includes(asset.representation)) throw Error("BP3D_CANDIDATE_IDENTITY_MISMATCH");
  return {
    id, kind: id.includes(".coronary.") ? "coronaryArtery" : asset.representation === "cavity" ? "chamber" : "greatVessel",
    representation: asset.representation === "cavity" ? "cavity" : "vessel", availability: "partial", verification: "unverified",
    blenderObject: `BP3D_${asset.conceptId}_${representationId}`, fidelity: "reference-derived",
    coverage: { verifiedRegions: [], unknownRegions: [id], excludedRegions: [], evidenceRefs: [] },
    provenance: { sourceId: manifest.sourceId, sourceVersion: "archive-4.0-license-2025-02-27", licenseId: "CC-BY-4.0",
      evidenceRefs: ["medical-assets/LICENSE_MANIFEST.json", `medical-assets/candidates/bodyparts3d-4.0/${asset.derivedFile}`, "medical-assets/candidates/bodyparts3d-4.0/selection-manifest.json"],
      derivation: `Exact ${asset.conceptId}/${representationId}; source-part OBJ formatting only; derived SHA-256 ${asset.derivedHash}; constituent files ${asset.sources.map(source => source.sourceFilename).join(", ")}. Identity transform in millimeters.`,
      licenseReview: { status: "unresolved", evidenceRefs: [] } },
    assessment: { geometryStatus: "imported", semanticStatus: "unverified", clinicalApprovalStatus: "unreviewed", renderCompatibility: "blender-compatible",
      geometryEvidenceRefs: ["medical-assets/candidates/bodyparts3d-4.0/selection-manifest.json"], semanticEvidenceRefs: [], clinicalEvidenceRefs: [] },
  };
});
const absent: AnatomyStructureId[] = ["heart.myocardium", "heart.septum.interatrial", "heart.septum.interventricular", "heart.valve.aortic", "heart.valve.pulmonary", "heart.valve.mitral", "heart.valve.tricuspid", "heart.pulmonaryVeins"];
const missing: AnatomyRegistryEntry[] = absent.map(id => ({ id,
  kind: id === "heart.myocardium" ? "myocardium" : id.includes(".septum.") ? "septum" : id.includes(".valve.") ? "valve" : "greatVessel",
  representation: "unknown", availability: "missing", blenderObject: null, fidelity: null, verification: "unverified",
  coverage: { verifiedRegions: [], unknownRegions: [id], excludedRegions: [], evidenceRefs: [] },
}));

/** Inactive candidate metadata only; no source profile, camera, motion or dispatch. */
export const BP3D_HEART_CANDIDATE: OrganModule = {
  id: "heart", assetVersion: BP3D_HEART_ASSET_VERSION, anatomyVersion: BP3D_HEART_ANATOMY_VERSION,
  assetStatus: "development-placeholder", anatomicallyValidated: false,
  anatomyRegistry: [...selected, ...missing],
  landmarks: [
    { id: "heart.bp3d.reviewWholeCenter", blenderObject: "LM_heart.bp3d.reviewWholeCenter", description: "Midpoint of world-coordinate AABB of all 14 selected source structures." },
    { id: "heart.bp3d.reviewChamberCenter", blenderObject: "LM_heart.bp3d.reviewChamberCenter", description: "Midpoint of world-coordinate AABB of the four selected chamber cavity surfaces." },
    { id: "heart.bp3d.reviewCoronaryCenter", blenderObject: "LM_heart.bp3d.reviewCoronaryCenter", description: "Midpoint of world-coordinate AABB of the four selected coronary source representations." },
    { id: "heart.bp3d.reviewVesselCenter", blenderObject: "LM_heart.bp3d.reviewVesselCenter", description: "Midpoint of world-coordinate AABB of all ten selected vessel source representations." },
    { id: "heart.bp3d.reviewBoundsMin", blenderObject: "LM_heart.bp3d.reviewBoundsMin", description: "Component-wise minimum coordinates of all selected vertices; framing reference only, not anatomical apex." },
    { id: "heart.bp3d.reviewBoundsMax", blenderObject: "LM_heart.bp3d.reviewBoundsMax", description: "Component-wise maximum coordinates of all selected vertices; framing reference only, not anatomical base." },
  ],
  cameraTargets: [
    { id: "CAM_BP3D_REVIEW_WHOLE", frames: BP3D_HEART_SELECTION.map(([id]) => id), lookAt: ["heart.bp3d.reviewWholeCenter"], viewDirection: [0,-1,0], distance: 2 },
    { id: "CAM_BP3D_REVIEW_CHAMBERS", frames: BP3D_HEART_SELECTION.slice(0,4).map(([id]) => id), lookAt: ["heart.bp3d.reviewChamberCenter"], viewDirection: [0,-1,0], distance: 2 },
    { id: "CAM_BP3D_REVIEW_CORONARY", frames: BP3D_HEART_SELECTION.slice(10).map(([id]) => id), lookAt: ["heart.bp3d.reviewCoronaryCenter"], viewDirection: [0,-1,0], distance: 2 },
    { id: "CAM_BP3D_REVIEW_VESSELS", frames: BP3D_HEART_SELECTION.slice(4).map(([id]) => id), lookAt: ["heart.bp3d.reviewVesselCenter"], viewDirection: [0,-1,0], distance: 2 },
  ],
  scaleReference: ["heart.bp3d.reviewBoundsMin", "heart.bp3d.reviewBoundsMax"], motionControllers: [], cutawayStates: [], renderStyles: [],
};
