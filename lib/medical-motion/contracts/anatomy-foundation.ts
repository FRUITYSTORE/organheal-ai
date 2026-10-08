import type { OrganId } from "./organ";
import type { AnatomyStructureId } from "./anatomy";

/** Open identifiers; registering a taxonomy concept never creates an organ module. */
export type BodySystemId = string;
export type BodySystem = { id: BodySystemId; canonicalName: string };
export type AnatomyOrgan = { id: OrganId; canonicalName: string; bodySystemIds: readonly BodySystemId[] };
export type AnatomyStructure = {
  id: AnatomyStructureId; organId: OrganId; canonicalName: string; evidenceRefs: readonly string[];
};
export type AnatomyLicense = {
  id: string; termsRefs: readonly string[];
  reviewStatus: "terms-reviewed" | "unresolved";
  commercialCompatibility: "permitted-with-obligations" | "requires-license" | "noncommercial" | "unresolved";
  requiredAttribution: readonly string[];
  derivativeObligations: readonly string[];
};
export type AnatomySource = {
  id: string; sourceVersion: string; canonicalName: string; upstreamProject: string;
  licenseId: string; evidenceRefs: readonly string[]; limitations: readonly string[];
};
export type AnatomyProvenance = {
  sourceId: string; sourceVersion: string; licenseId: string;
  evidenceRefs: readonly string[]; derivation: string;
  licenseReview: { status: "unresolved" | "cleared" | "rejected"; evidenceRefs: readonly string[] };
};
/** Independent engineering, semantic and clinical axes; legacy verification
 * continues to mean anatomical verification, not clinical approval. */
export type AnatomyAssessment = {
  geometryStatus: "not-imported" | "imported" | "verified" | "rejected";
  semanticStatus: "unverified" | "verified" | "rejected";
  clinicalApprovalStatus: "unreviewed" | "approved" | "rejected";
  renderCompatibility: "unvalidated" | "blender-compatible";
  geometryEvidenceRefs: readonly string[];
  semanticEvidenceRefs: readonly string[];
  clinicalEvidenceRefs: readonly string[];
};
export type AnatomyLifecycle = "missing" | "discovered" | "imported" | "semantically-unverified" |
  "geometry-verified" | "anatomically-verified" | "clinically-approved" | "rejected";
export type AnatomyRenderIdentity = {
  sourceProfile?: import("./source-profile").SourceProfileCacheIdentity;
  structureSources?: readonly { structureId: import("./anatomy").AnatomyStructureId; representation: import("./organ-module").StructureRepresentation; sourceId: string; sourceVersion: string }[];
  anatomyVersion: string;
  sources: readonly { sourceId: string; sourceVersion: string }[];
};
export type WholeBodyAnatomyCatalog = {
  anatomyVersion: string; bodySystems: readonly BodySystem[]; organs: readonly AnatomyOrgan[];
  structures: readonly AnatomyStructure[]; sources: readonly AnatomySource[]; licenses: readonly AnatomyLicense[];
};
