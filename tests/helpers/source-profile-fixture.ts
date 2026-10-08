import { HEART_ORGAN_MODULE } from "../../lib/medical-motion/organs/heart/heart-organ-module";
import { withTestAnatomyReview } from "./anatomy-review-fixture";
import { withTestCacheAnatomy } from "./cache-anatomy-fixture";
import type { AnatomySourceProfile } from "../../lib/medical-motion/contracts/source-profile";

/** Hypothetical metadata ONLY. No candidate asset or patient approval. */
export function profileFixture() {
  const module = withTestAnatomyReview(withTestCacheAnatomy());
  const structures = module.anatomyRegistry.filter(e=>e.availability!=="missing");
  const p = structures[0].provenance!;
  const profile: AnatomySourceProfile = {profileId:"TEST-coherent-heart",profileVersion:"1",organId:"heart",
    sourceId:p.sourceId,sourceVersion:p.sourceVersion,anatomyVersion:module.anatomyVersion!,assetVersion:HEART_ORGAN_MODULE.assetVersion,
    structures:structures.map(e=>({structureId:e.id,representation:e.representation})),
    cameraTargets:module.cameraTargets.filter(c=>!c.frames.includes("heart.coronary")).map(c=>({id:c.id,landmarks:module.landmarks.map(l=>l.id),evidenceRefs:["TEST-ONLY-CAMERA"]})),
    labels:structures.map(e=>e.id),usage:["internal-review"],limitations:["TEST-ONLY-NO-GEOMETRY"],evidenceRefs:["TEST-ONLY-PROFILE"]};
  return {module,profile};
}
