import type { AnatomyRegistryEntry, OrganModule } from "../../contracts/organ-module";
import type { AnatomyStructureId } from "../../contracts/anatomy";
import manifest from "../../../../medical-assets/candidates/zenodo-4506463-v2/selection-manifest.json";

export const SSM_HEART_ASSET_VERSION = "heart-ssm-4506463-v2-internal-review-v1";
export const SSM_HEART_ANATOMY_VERSION = "heart-ssm-4506463-v2-ventricular-boundaries-v1";
const evidence = "medical-assets/candidates/zenodo-4506463-v2/selection-manifest.json";

// Review-local IDs preserve source parts without claiming canonical completeness.
export const SSM_HEART_SELECTION = [
  ["heart.ssm.basalPatch", "basal-patch.obj", "surface", "region"],
  ["heart.ssm.ventricularEpicardialPatch", "ventricular-epicardial-patch.obj", "surface", "region"],
  ["heart.leftVentricle", "lv-endocardial-surface.obj", "surface", "chamber"],
  ["heart.rightVentricle", "rv-endocardial-surface.obj", "surface", "chamber"],
  ["heart.ssm.compositeVentricularTissueBoundary", "composite-ventricular-tissue-boundary.obj", "composite", "composite"],
] as const;

const selected: AnatomyRegistryEntry[] = SSM_HEART_SELECTION.map(([id, filename, representation, kind]) => {
  const asset = manifest.assets.find(a => a.derivedFilename === filename);
  if (!asset || asset.qualification !== "QUALIFIED_INTERNAL_REVIEW" || manifest.sourceId !== "zenodo-4506463" || manifest.sourceVersion !== "v2") throw Error("SSM_CANDIDATE_IDENTITY_MISMATCH");
  return { id, kind, representation, availability: "partial", verification: "unverified", fidelity: "reference-derived",
    blenderObject: `SSM_${filename.replace(/\.obj$/, "").replaceAll("-", "_")}`,
    coverage: { verifiedRegions: [], unknownRegions: [id], excludedRegions: [], evidenceRefs: [] },
    provenance: { sourceId: manifest.sourceId, sourceVersion: manifest.sourceVersion, licenseId: "zenodo-4506463-CC-BY-4.0",
      evidenceRefs: [evidence, "medical-assets/ventricular-ssm-inventory.json", "medical-assets/LICENSE_MANIFEST.json"],
      derivation: `${asset.sourceFilename} SHA-256 ${asset.sourceHash}; ${filename} SHA-256 ${asset.derivedHash}; identity transform, millimeters, anatomical axes unresolved. ${asset.meaning.join(" ")}`,
      licenseReview: { status: "unresolved", evidenceRefs: [] } },
    assessment: { geometryStatus: "not-imported", semanticStatus: "unverified", clinicalApprovalStatus: "unreviewed", renderCompatibility: "unvalidated",
      geometryEvidenceRefs: [evidence], semanticEvidenceRefs: [], clinicalEvidenceRefs: [] },
  };
});
const absent: AnatomyStructureId[] = ["heart.myocardium", "heart.septum.interatrial", "heart.septum.interventricular",
  "heart.leftAtrium", "heart.rightAtrium", "heart.aorta", "heart.pulmonaryTrunk", "heart.leftPulmonaryArtery", "heart.rightPulmonaryArtery",
  "heart.superiorVenaCava", "heart.inferiorVenaCava", "heart.pulmonaryVeins", "heart.coronary.leftMain", "heart.coronary.lad", "heart.coronary.rca", "heart.coronary.lcx",
  "heart.valve.aortic", "heart.valve.pulmonary", "heart.valve.mitral", "heart.valve.tricuspid"];
const missing: AnatomyRegistryEntry[] = absent.map(id => ({ id, kind: id === "heart.myocardium" ? "myocardium" : id.includes(".septum.") ? "septum" : id.includes(".valve.") ? "valve" : id.includes(".coronary.") ? "coronaryArtery" : id.endsWith("Atrium") ? "chamber" : "greatVessel",
  availability: "missing", representation: "unknown", verification: "unverified", blenderObject: null, fidelity: null,
  coverage: { verifiedRegions: [], unknownRegions: [id], excludedRegions: [], evidenceRefs: [] } }));
const apex = manifest.assets.find(a => a.derivedFilename === "apex-reference.obj");
if (!apex || apex.vertices !== 1 || apex.faces !== 0 || apex.qualification !== "QUALIFIED_INTERNAL_REVIEW") throw Error("SSM_CANDIDATE_IDENTITY_MISMATCH");

// Source-space review direction only, not a certified anatomical axis. The
// normal to the LV/RV AABB-center baseline and base/apex baseline is measured
// deterministically from this source; it does not rotate or register geometry.
const center = (filename: string) => {
  const asset = manifest.assets.find(a => a.derivedFilename === filename);
  if (!asset) throw Error("SSM_CAMERA_SOURCE_MISSING");
  return asset.bounds[0].map((v,i) => (v + asset.bounds[1][i]) / 2);
};
const lv = center("lv-endocardial-surface.obj"), rv = center("rv-endocardial-surface.obj");
const base = center("basal-patch.obj"), tip = center("apex-reference.obj");
const lateral = lv.map((v,i) => v-rv[i]), longitudinal = base.map((v,i) => v-tip[i]);
const normal = [lateral[1]*longitudinal[2]-lateral[2]*longitudinal[1], lateral[2]*longitudinal[0]-lateral[0]*longitudinal[2], lateral[0]*longitudinal[1]-lateral[1]*longitudinal[0]];
const length = Math.hypot(...normal);
if (!Number.isFinite(length) || length <= 0) throw Error("SSM_CAMERA_DIRECTION_UNRESOLVED");
const reviewDirection: readonly [number,number,number] = [normal[0]/length,normal[1]/length,normal[2]/length];

/** Internal-review candidate only; no source profile or anatomical approval. */
export const SSM_HEART_CANDIDATE: OrganModule = {
  id: "heart", assetVersion: SSM_HEART_ASSET_VERSION, anatomyVersion: SSM_HEART_ANATOMY_VERSION,
  assetStatus: "development-placeholder", anatomicallyValidated: false,
  anatomyRegistry: [...selected, ...missing],
  landmarks: [
    { id: "heart.ssm.apexReference", blenderObject: "LM_heart.ssm.apexReference",
      description: `Exact single source class-5 point from apex-reference.obj; SHA-256 ${apex.derivedHash}. Geometric reference only, not tissue. Identity coordinates in mm; axes unresolved.` },
    { id: "heart.ssm.basalPatchCenter", blenderObject: "LM_heart.ssm.basalPatchCenter",
      description: "Arithmetic mean of basal-patch.obj vertices in unchanged source millimeter coordinates; geometric scale reference only, not valve annulus or certified anatomical axis." },
  ],
  scaleReference: ["heart.ssm.basalPatchCenter", "heart.ssm.apexReference"],
  cameraTargets: [{ id: "CAM_SSM_REVIEW_VENTRICLES", frames: SSM_HEART_SELECTION.map(([id]) => id),
    lookAt: ["heart.ssm.basalPatchCenter", "heart.ssm.apexReference"], viewDirection: reviewDirection, distance: 2 }],
  motionControllers: [], cutawayStates: [], renderStyles: [],
};
