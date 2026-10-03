import { HEART_ORGAN_MODULE } from "../../lib/medical-motion/organs/heart/heart-organ-module";
import type { OrganModule } from "../../lib/medical-motion/contracts/organ-module";
/** Hypothetical TEST review metadata only, not verified geometry. Identity/source
 * versions stay pinned to the fixture adapter; missing anatomy stays missing.
 * Asset remains development-only and NOT anatomically validated/patient-ready. */
export function withTestCacheAnatomy():OrganModule {
  const module=structuredClone(HEART_ORGAN_MODULE);
  module.anatomyRegistry=module.anatomyRegistry.map(entry=>entry.availability==="missing"?entry:{...entry,
    verification:"verified",fidelity:"reference-derived",representation:entry.representation==="placeholder"?"surface":entry.representation,
    coverage:{verifiedRegions:["TEST ONLY WHOLE"],unknownRegions:[],excludedRegions:[],evidenceRefs:["TEST ONLY HYPOTHETICAL COVERAGE"]},
    assessment:{geometryStatus:"verified",semanticStatus:"verified",clinicalApprovalStatus:"unreviewed",renderCompatibility:"blender-compatible",
      geometryEvidenceRefs:["TEST ONLY HYPOTHETICAL REVIEW"],semanticEvidenceRefs:["TEST ONLY HYPOTHETICAL REVIEW"],clinicalEvidenceRefs:[]},
  });
  return module;
}
