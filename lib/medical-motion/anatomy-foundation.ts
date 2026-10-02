import type { AnatomyLifecycle, AnatomyRenderIdentity, WholeBodyAnatomyCatalog } from "./contracts/anatomy-foundation";
import type { AnatomyRegistryEntry, OrganModule } from "./contracts/organ-module";

const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const evidence = (refs: readonly string[] | undefined) => Array.isArray(refs) && refs.some(text);
const identifier = (value: string) => /^[a-z][a-zA-Z0-9_-]*$/.test(value);

/** Validate relationships, not anatomical truth. A taxonomy entry never authorizes geometry. */
export function createWholeBodyAnatomyCatalog(input: WholeBodyAnatomyCatalog): Readonly<WholeBodyAnatomyCatalog> {
  if (!text(input.anatomyVersion)) throw Error("ANATOMY_VERSION_REQUIRED");
  function unique(values: readonly string[]) { if (new Set(values).size !== values.length || values.some(value => !text(value))) throw Error("INVALID_ANATOMY_REGISTRY"); }
  unique(input.bodySystems.map(item => item.id)); unique(input.organs.map(item => item.id)); unique(input.structures.map(item => item.id));
  unique(input.licenses.map(item => item.id)); unique(input.sources.map(item => `${item.id}@${item.sourceVersion}`));
  for (const system of input.bodySystems) if (!identifier(system.id) || !text(system.canonicalName)) throw Error("INVALID_BODY_SYSTEM");
  for (const organ of input.organs) if (!identifier(organ.id) || !text(organ.canonicalName) || !organ.bodySystemIds.length || organ.bodySystemIds.some(id => !input.bodySystems.some(system => system.id === id))) throw Error("INVALID_ANATOMY_ORGAN");
  for (const structure of input.structures) if (!input.organs.some(organ => organ.id === structure.organId) || !structure.id.startsWith(`${structure.organId}.`) || !/^[a-z][a-zA-Z0-9_-]*(\.[a-zA-Z][a-zA-Z0-9_-]*)+$/.test(structure.id) || !text(structure.canonicalName) || !evidence(structure.evidenceRefs)) throw Error("INVALID_ANATOMY_STRUCTURE");
  for (const source of input.sources) if (!text(source.id) || !text(source.sourceVersion) || !text(source.upstreamProject) || !evidence(source.evidenceRefs) || !input.licenses.some(license => license.id === source.licenseId)) throw Error("INVALID_ANATOMY_SOURCE");
  for (const license of input.licenses) if (!evidence(license.termsRefs)) throw Error("INVALID_ANATOMY_LICENSE");
  const copy = structuredClone(input);
  function freeze(value: unknown): void { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } }
  freeze(copy); return copy;
}

export function anatomyLifecycle(entry: AnatomyRegistryEntry): AnatomyLifecycle {
  const a = entry.assessment;
  if (entry.verification === "rejected" || a?.geometryStatus === "rejected" || a?.semanticStatus === "rejected" || a?.clinicalApprovalStatus === "rejected") return "rejected";
  if (entry.availability === "missing") return "missing";
  if (!a || a.geometryStatus === "not-imported") return "discovered";
  if (a.semanticStatus !== "verified" || !evidence(a.semanticEvidenceRefs)) return "semantically-unverified";
  if (a.geometryStatus !== "verified" || !evidence(a.geometryEvidenceRefs)) return "imported";
  if (entry.verification !== "verified" || !evidence(entry.coverage.evidenceRefs)) return "geometry-verified";
  if (a.clinicalApprovalStatus !== "approved" || !evidence(a.clinicalEvidenceRefs)) return "anatomically-verified";
  return "clinically-approved";
}

/** This adds provenance/medical gates; it does not replace legacy coverage/representation gates. */
export function anatomyAssessmentIssues(entry: AnatomyRegistryEntry, module: OrganModule, catalog: WholeBodyAnatomyCatalog, clinicalRequired: boolean, commercialRequired: boolean): string[] {
  const issues: string[] = [], p = entry.provenance, a = entry.assessment;
  if (!text(module.anatomyVersion)) issues.push("anatomy version is missing");
  if (!catalog.structures.some(item => item.id === entry.id && item.organId === module.id)) issues.push("structure/organ is not registered in the anatomy catalog");
  const source = catalog.sources.find(item => item.id === p?.sourceId && item.sourceVersion === p?.sourceVersion);
  const license = catalog.licenses.find(item => item.id === p?.licenseId);
  if (!p || !source || !evidence(p.evidenceRefs) || !text(p.derivation) || p.licenseId !== source.licenseId) issues.push("source/version provenance is missing or inconsistent");
  if (!a || a.geometryStatus !== "verified" || !evidence(a.geometryEvidenceRefs) || a.renderCompatibility !== "blender-compatible") issues.push("geometry is not independently verified/compatible");
  if (!a || a.semanticStatus !== "verified" || !evidence(a.semanticEvidenceRefs)) issues.push("representation semantics are unverified");
  if (clinicalRequired && (!a || a.clinicalApprovalStatus !== "approved" || !evidence(a.clinicalEvidenceRefs))) issues.push("clinical approval is missing");
  if (commercialRequired && (!license || license.reviewStatus !== "terms-reviewed" || license.commercialCompatibility !== "permitted-with-obligations" || p?.licenseReview?.status !== "cleared" || !evidence(p?.licenseReview?.evidenceRefs))) issues.push("asset license use is not cleared");
  return issues.map(issue => `${entry.id}: ${issue}.`);
}

export function anatomyRenderIdentity(module: OrganModule): AnatomyRenderIdentity {
  if (!text(module.anatomyVersion)) throw Error("ANATOMY_VERSION_REQUIRED");
  const sources = new Map<string, { sourceId: string; sourceVersion: string }>();
  for (const entry of module.anatomyRegistry) if (entry.provenance) {
    const { sourceId, sourceVersion } = entry.provenance;
    if (!text(sourceId) || !text(sourceVersion)) throw Error("ANATOMY_SOURCE_VERSION_REQUIRED");
    sources.set(`${sourceId}@${sourceVersion}`, { sourceId, sourceVersion });
  }
  return { anatomyVersion: module.anatomyVersion, sources: [...sources.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId) || a.sourceVersion.localeCompare(b.sourceVersion)) };
}
