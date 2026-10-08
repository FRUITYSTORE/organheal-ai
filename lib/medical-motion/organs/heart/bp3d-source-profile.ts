import type { AnatomySourceProfile } from "../../contracts/source-profile";
import { BP3D_HEART_CANDIDATE, BP3D_HEART_SELECTION } from "./bp3d-heart-candidate";

const cameras = ["CAM_BP3D_REVIEW_CHAMBERS", "CAM_BP3D_REVIEW_CORONARY", "CAM_BP3D_REVIEW_VESSELS"];
const evidenceRefs = ["medical-assets/candidates/bodyparts3d-4.0/selection-manifest.json", "medical-assets/LICENSE_MANIFEST.json"];

/** Source-part review permission only; conveys no anatomical or clinical approval. */
export const BP3D_HEART_SOURCE_PROFILE: AnatomySourceProfile = {
  profileId: "bp3d-heart-internal-review", profileVersion: "1", organId: "heart",
  sourceId: "bodyparts3d-current-archive", sourceVersion: "archive-4.0-license-2025-02-27",
  anatomyVersion: BP3D_HEART_CANDIDATE.anatomyVersion!, assetVersion: BP3D_HEART_CANDIDATE.assetVersion,
  structures: BP3D_HEART_SELECTION.map(([structureId]) => {
    const entry = BP3D_HEART_CANDIDATE.anatomyRegistry.find(e => e.id === structureId);
    if (!entry || entry.availability === "missing") throw Error("SOURCE_PROFILE_INVALID");
    return { structureId, representation: entry.representation };
  }),
  cameraTargets: cameras.map(id => {
    const camera = BP3D_HEART_CANDIDATE.cameraTargets.find(c => c.id === id);
    if (!camera) throw Error("SOURCE_PROFILE_INVALID");
    return { id, landmarks: [...camera.lookAt, ...BP3D_HEART_CANDIDATE.scaleReference], evidenceRefs };
  }),
  labels: BP3D_HEART_SELECTION.map(([id]) => id), usage: ["internal-review"],
  limitations: ["Unverified source-part anatomy; clinical approval unreviewed; no patient-facing usage.",
    "Cavities are not walls; myocardium, septa, valves and pulmonary-vein aggregates are unavailable.",
    "Whole-heart overview excluded because long IVC extent degrades framing."],
  evidenceRefs,
};
