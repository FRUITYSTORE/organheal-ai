import type { OrganModule } from "../../lib/medical-motion/contracts/organ-module";
import { TOTALSEGMENTATOR_AUDIT_VERSION } from "../../lib/medical-motion/anatomy-sources";

/** Hypothetical metadata for gate tests only. No imported geometry or medical claim. */
export function withTestAnatomyReview(module: OrganModule): OrganModule {
  return { ...module, anatomyVersion: "TEST-FIXTURE-ANATOMY-1", anatomyRegistry: module.anatomyRegistry.map(entry => ({ ...entry,
    provenance: { sourceId: "totalsegmentator-v2-total", sourceVersion: TOTALSEGMENTATOR_AUDIT_VERSION, licenseId: "Apache-2.0", evidenceRefs: ["TEST-FIXTURE-PROVENANCE"], derivation: "Hypothetical metadata only; no anatomical asset.", licenseReview: { status: "cleared", evidenceRefs: ["TEST-FIXTURE-LICENSE-REVIEW"] } },
    assessment: { geometryStatus: "verified", semanticStatus: "verified", clinicalApprovalStatus: "approved", renderCompatibility: "blender-compatible", geometryEvidenceRefs: ["TEST-FIXTURE-GEOMETRY"], semanticEvidenceRefs: ["TEST-FIXTURE-SEMANTICS"], clinicalEvidenceRefs: ["TEST-FIXTURE-CLINICAL"] },
  })) };
}
