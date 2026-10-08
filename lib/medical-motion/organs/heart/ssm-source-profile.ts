import type { AnatomySourceProfile } from "../../contracts/source-profile";
import { SSM_HEART_CANDIDATE } from "./ssm-heart-candidate";
const evidenceRefs = ["medical-assets/ventricular-ssm-inventory.json", "medical-assets/candidates/zenodo-4506463-v2/selection-manifest.json"];
export const SSM_HEART_SOURCE_PROFILE: AnatomySourceProfile = {
  profileId: "ssm-heart-internal-review", profileVersion: "1", organId: "heart",
  sourceId: "zenodo-4506463", sourceVersion: "v2", anatomyVersion: SSM_HEART_CANDIDATE.anatomyVersion!, assetVersion: SSM_HEART_CANDIDATE.assetVersion,
  structures: SSM_HEART_CANDIDATE.anatomyRegistry.filter(e => e.availability !== "missing").map(e => ({ structureId: e.id, representation: e.representation })),
  labels: SSM_HEART_CANDIDATE.anatomyRegistry.filter(e => e.availability !== "missing").map(e => e.id),
  cameraTargets: [{ id: "CAM_SSM_REVIEW_VENTRICLES", landmarks: SSM_HEART_CANDIDATE.landmarks.map(l => l.id), evidenceRefs }],
  usage: ["internal-review"], evidenceRefs,
  limitations: ["Unverified ventricular source parts only; clinical approval unreviewed; no patient-facing usage.",
    "Endocardial surfaces are not muscular walls; composite boundary is not complete heart.myocardium; independent septa unavailable.",
    "Apex is a geometric reference; source millimeters preserved; anatomical axes unresolved; no BP3D mixing."],
};
