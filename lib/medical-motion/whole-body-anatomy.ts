import { ANATOMY_LICENSES, ANATOMY_SOURCES, TOTALSEGMENTATOR_AUDIT_VERSION } from "./anatomy-sources";
import { createWholeBodyAnatomyCatalog } from "./anatomy-foundation";
import { HEART_ORGAN_MODULE } from "./organs/heart/heart-organ-module";

const map = `https://github.com/wasserth/TotalSegmentator/blob/${TOTALSEGMENTATOR_AUDIT_VERSION.split("@")[1]}/totalsegmentator/map_to_binary.py`;
/** Evidence-backed concepts only. Non-heart labels are discovered source candidates,
 * not imported assets; getOrganModule still returns null for every absent module. */
export const WHOLE_BODY_ANATOMY = createWholeBodyAnatomyCatalog({
  anatomyVersion: "whole-body-anatomy-v1",
  bodySystems: [
    { id: "cardiovascular", canonicalName: "Cardiovascular system" },
    { id: "respiratory", canonicalName: "Respiratory system" },
    { id: "renal-urinary", canonicalName: "Renal and urinary system" },
    { id: "hepatic", canonicalName: "Hepatic system" },
    { id: "neurologic", canonicalName: "Nervous system" },
  ],
  organs: [
    { id: "heart", canonicalName: "Heart", bodySystemIds: ["cardiovascular"] },
    { id: "lungs", canonicalName: "Lungs", bodySystemIds: ["respiratory"] },
    { id: "kidneys", canonicalName: "Kidneys", bodySystemIds: ["renal-urinary"] },
    { id: "liver", canonicalName: "Liver", bodySystemIds: ["hepatic"] },
    { id: "brain", canonicalName: "Brain", bodySystemIds: ["neurologic"] },
  ],
  structures: [
    ...HEART_ORGAN_MODULE.anatomyRegistry.map(entry => ({ id: entry.id, organId: "heart", canonicalName: entry.id.slice(6).replace(/\./g, " ").replace(/([a-z])([A-Z])/g, "$1 $2"), evidenceRefs: ["lib/medical-motion/organs/heart/heart-organ-module.ts"] })),
    { id: "lungs.upperLobeLeft", organId: "lungs", canonicalName: "Left upper lung lobe (candidate lung_upper_lobe_left label)", evidenceRefs: [map] },
    { id: "kidneys.left", organId: "kidneys", canonicalName: "Left kidney (candidate kidney_left label)", evidenceRefs: [map] },
    { id: "liver.whole", organId: "liver", canonicalName: "Liver (candidate liver label)", evidenceRefs: [map] },
    { id: "brain.whole", organId: "brain", canonicalName: "Brain (candidate brain label)", evidenceRefs: [map] },
  ],
  sources: ANATOMY_SOURCES, licenses: ANATOMY_LICENSES,
});
