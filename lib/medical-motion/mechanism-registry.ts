import type { WholeBodyAnatomyCatalog } from "./contracts/anatomy-foundation";
import { STRUCTURE_REPRESENTATIONS } from "./contracts/organ-module";
import { FORBIDDEN_VISUALIZATIONS, TRIGGER_KINDS, VISUALIZATION_OPERATIONS,
  type MedicalMechanism, type EvidenceRule, type MechanismEvidence, type MechanismEvaluationContext, type VisualizationOperation } from "./contracts/mechanism";

const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const hasEvidence = (v: readonly string[]) => Array.isArray(v) && v.length > 0 && v.every(text);
const matches = (r: EvidenceRule, e: MechanismEvidence) => e.assertion === "present" && r.kind === e.kind && r.code === e.code && (!r.origin || r.origin === e.origin);
const ruleValid = (r: EvidenceRule) => !!r && typeof r === "object" && !Array.isArray(r) && TRIGGER_KINDS.includes(r.kind) && text(r.code) && (!r.origin || ["server-intake", "verified-record"].includes(r.origin));
const factValid = (e: MechanismEvidence) => ruleValid(e) && ["server-intake", "verified-record"].includes(e.origin) && ["present", "absent", "unknown"].includes(e.assertion) && text(e.evidenceRef);
const freeze = (v: unknown): void => { if (v && typeof v === "object") { Object.values(v).forEach(freeze); Object.freeze(v); } };
const SAFE_EFFECTS: readonly VisualizationOperation[] = ["highlight", "camera-focus", "structure-label"];
const DEFINITION_KEYS = ["mechanismId", "version", "kind", "bodySystems", "affectedOrgans", "requiredAnatomy", "optionalAnatomy", "highlightedAnatomy", "clinicalTriggers", "requiredEvidence", "supportingEvidence", "contradictoryEvidence", "missingEvidenceBehavior", "contraindications", "allowedClaims", "forbiddenClaims", "visualizationProfile", "allowedVisualizations", "forbiddenVisualizations", "effectRequirements", "severityModel", "safetyRequirements", "engineeringStatus", "medicalReviewStatus", "patientFacingStatus", "sourceRefs", "medicalReviewEvidenceRefs", "patientApprovalEvidenceRefs", "rationale"];
const PROFILE_KEYS = ["primaryStructure", "secondaryStructures", "cameraIntent", "visualEffectIntent", "motionIntent", "flowIntent", "labelIntent", "visualEmphasis", "patientIndependent"];
const registeredDefinitions = new WeakSet<object>();
/** Only immutable definitions issued by a trusted code registry may feed consumers. */
export const isRegisteredMedicalMechanism = (value: unknown): value is MedicalMechanism =>
  !!value && typeof value === "object" && registeredDefinitions.has(value);

export function patientMechanismApproved(m: MedicalMechanism): boolean {
  return m.engineeringStatus === "engineering-valid" && m.medicalReviewStatus === "medically-reviewed" &&
    m.patientFacingStatus === "patient-approved" && hasEvidence(m.medicalReviewEvidenceRefs) && hasEvidence(m.patientApprovalEvidenceRefs);
}

/** Trusted code registration only. Never register candidate/AI definitions. */
export function createMechanismRegistry(definitions: readonly MedicalMechanism[], catalog: WholeBodyAnatomyCatalog) {
  const definitionsByIdentity = new Map<string, MedicalMechanism>();
  for (const input of definitions) {
    const m = structuredClone(input), ids = [...Object.keys(m.requiredAnatomy), ...m.optionalAnatomy];
    const key = JSON.stringify([m.mechanismId, m.version]);
    const fail = () => { throw Error("INVALID_MECHANISM_DEFINITION"); };
    if (Object.keys(m).some(k => !DEFINITION_KEYS.includes(k)) || Object.keys(m.visualizationProfile).some(k => !PROFILE_KEYS.includes(k))) fail();
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(m.mechanismId) || !text(m.version) || definitionsByIdentity.has(key) || m.kind !== "explanatory-mechanism") fail();
    if (!m.bodySystems.length || m.bodySystems.some(id => !catalog.bodySystems.some(s => s.id === id)) ||
        !m.affectedOrgans.length || m.affectedOrgans.some(id => !catalog.organs.some(o => o.id === id && o.bodySystemIds.some(s => m.bodySystems.includes(s))))) fail();
    if (!Object.keys(m.requiredAnatomy).length || ids.some(id => !catalog.structures.some(s => s.id === id && m.affectedOrgans.includes(s.organId))) ||
        new Set(ids).size !== ids.length || m.highlightedAnatomy.some(id => !ids.includes(id)) ||
        !ids.includes(m.visualizationProfile.primaryStructure) || m.visualizationProfile.secondaryStructures.some(id => !ids.includes(id))) fail();
    for (const r of Object.values(m.requiredAnatomy)) {
      if (!r || !r.representations?.length || r.representations.some(rep => !STRUCTURE_REPRESENTATIONS.includes(rep)) ||
          [r.requireVerified, r.completeCoverage, r.requireClinicalApproval].some(v => v !== undefined && typeof v !== "boolean") ||
          r.requiredRegions?.some(region => !text(region))) fail();
    }
    if (!m.clinicalTriggers.length || !m.requiredEvidence.length ||
        [...m.clinicalTriggers, ...m.requiredEvidence, ...m.supportingEvidence, ...m.contradictoryEvidence, ...m.contraindications.map(c => c.evidence)].some(r => !ruleValid(r)) ||
        m.contraindications.some(c => !text(c.reason)) || !["insufficient-evidence", "needs-clinical-review"].includes(m.missingEvidenceBehavior)) fail();
    if (!m.allowedClaims.length || m.allowedClaims.some(c => !["general-physiology", "possible-mechanism", "documented-mechanism"].includes(c)) ||
        ["diagnosis", "patient-pathology", "risk-as-disease"].some(c => !m.forbiddenClaims.includes(c as "diagnosis")) ||
        FORBIDDEN_VISUALIZATIONS.some(op => !m.forbiddenVisualizations.includes(op)) ||
        m.allowedVisualizations.some(op => !VISUALIZATION_OPERATIONS.includes(op)) ||
        m.visualizationProfile.visualEffectIntent.some(op => !m.allowedVisualizations.includes(op))) fail();
    if (m.safetyRequirements.requireSafetyGate !== true || m.safetyRequirements.noDiagnosisInference !== true || m.safetyRequirements.noRiskToPathology !== true ||
        m.visualizationProfile.patientIndependent !== true || m.severityModel.mapping !== "no-automatic-visual-mapping" ||
        !m.severityModel.clinicalLevels.length || m.severityModel.clinicalLevels.some(l => !["none", "mild", "moderate", "high", "unknown"].includes(l)) ||
        !["neutral", "subtle"].includes(m.visualizationProfile.visualEmphasis) || !["none", "baseline"].includes(m.visualizationProfile.motionIntent) ||
        !["none", "direction-only"].includes(m.visualizationProfile.flowIntent) || !["none", "structure-names"].includes(m.visualizationProfile.labelIntent) ||
        !["overview", "focus-structure"].includes(m.visualizationProfile.cameraIntent) || !hasEvidence(m.sourceRefs) || !text(m.rationale)) fail();
    if (!["draft", "engineering-valid", "rejected"].includes(m.engineeringStatus) || !["unreviewed", "medically-reviewed", "rejected"].includes(m.medicalReviewStatus) ||
        !["internal-only", "patient-approved", "rejected"].includes(m.patientFacingStatus) ||
        (m.medicalReviewStatus === "medically-reviewed" && !hasEvidence(m.medicalReviewEvidenceRefs)) ||
        (m.patientFacingStatus === "patient-approved" && !patientMechanismApproved(m))) fail();
    for (const op of m.allowedVisualizations.filter(op => !SAFE_EFFECTS.includes(op))) {
      const rule = m.effectRequirements[op];
      if (!rule || !hasEvidence(rule.reviewEvidenceRefs) || !rule.requiredEvidence.length || rule.requiredEvidence.some(r => !ruleValid(r)) ||
          Object.values(m.requiredAnatomy).some(r => !r?.requireVerified)) fail();
      if (op === "narrow-lumen" && !m.requiredAnatomy[m.visualizationProfile.primaryStructure]?.representations?.includes("lumen")) fail();
    }
    if (m.visualizationProfile.flowIntent !== "none" && !m.allowedVisualizations.includes("flow-direction-cue")) fail();
    freeze(m); registeredDefinitions.add(m); definitionsByIdentity.set(key, m);
  }
  // No mutable map or API for registering an AI-generated definition escapes.
  return Object.freeze({
    definitions: Object.freeze([...definitionsByIdentity.values()]),
    get(id: string, version: string): MedicalMechanism | null { return definitionsByIdentity.get(JSON.stringify([id, version])) ?? null; },
    resolve(candidate: unknown): MedicalMechanism | null {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
      const c = candidate as Record<string, unknown>;
      if (Object.keys(c).some(k => !["mechanismId", "mechanismVersion"].includes(k)) || !text(c.mechanismId) || !text(c.mechanismVersion)) return null;
      return definitionsByIdentity.get(JSON.stringify([c.mechanismId, c.mechanismVersion])) ?? null;
    },
  });
}
export type MechanismRegistry = ReturnType<typeof createMechanismRegistry>;
export type MechanismEligibility = { status: "eligible" | "insufficient-evidence" | "blocked" | "needs-clinical-review"; reasons: readonly string[]; supportingEvidenceRefs: readonly string[] };

/** Trusted normalized context is supplied separately from the untrusted candidate. */
export function evaluateMechanismCandidate(registry: MechanismRegistry, candidate: unknown, context: MechanismEvaluationContext): MechanismEligibility {
  const result = (status: MechanismEligibility["status"], reasons: string[]): MechanismEligibility => ({ status, reasons, supportingEvidenceRefs: [] });
  if (context?.safety?.allowVideo !== true || context.safety.level !== "none") return result("blocked", ["Safety Gate blocks visualization."]);
  const m = registry.resolve(candidate);
  if (!m) return result("blocked", ["Unknown or altered mechanism candidate."]);
  if (!["development", "production"].includes(context.mode) || !Array.isArray(context.evidence) || context.evidence.some(e => !factValid(e))) return result("blocked", ["Invalid normalized evidence context."]);
  if (m.engineeringStatus !== "engineering-valid" || m.medicalReviewStatus === "rejected" || m.patientFacingStatus === "rejected") return result("blocked", ["Mechanism review blocks use."]);
  if (!m.allowedClaims.includes(context.claim)) return result("blocked", ["Claim is not authorized by this mechanism."]);
  if (context.clinicalSeverity && !m.severityModel.clinicalLevels.includes(context.clinicalSeverity)) return result("blocked", ["Unsupported clinical severity."]);
  const contradictions = [...m.contradictoryEvidence, ...m.contraindications.map(c => c.evidence)].filter(r => context.evidence.some(e => matches(r, e)));
  if (contradictions.length) return result("blocked", contradictions.map(r => `Contradiction/contraindication: ${r.code}.`));
  const conflicting = context.evidence.some(e => e.assertion === "present" && context.evidence.some(other =>
    other.assertion === "absent" && other.kind === e.kind && other.code === e.code));
  if (conflicting) return result("needs-clinical-review", ["Conflicting normalized evidence cannot authorize a mechanism."]);
  const missing = m.requiredEvidence.filter(r => !context.evidence.some(e => matches(r, e)));
  if (!m.clinicalTriggers.some(r => context.evidence.some(e => matches(r, e)))) missing.push(...m.clinicalTriggers);
  if (context.claim === "documented-mechanism" && !context.evidence.some(e => e.kind === "verified-report-finding" && e.code === `mechanism-confirmation:${m.mechanismId}` && e.origin === "verified-record" && e.assertion === "present")) return result("insufficient-evidence", ["Server-verified mechanism-specific finding is required."]);
  if (missing.length) return result(m.missingEvidenceBehavior, [...new Set(missing.map(r => `Missing evidence: ${r.code}.`))]);
  if (context.mode === "production" && !patientMechanismApproved(m)) return result("needs-clinical-review", ["Mechanism is not patient-approved."]);
  return { status: "eligible", reasons: [], supportingEvidenceRefs: context.evidence.filter(e => m.supportingEvidence.some(r => matches(r, e))).map(e => e.evidenceRef) };
}

export function checkVisualizationOperation(m: MedicalMechanism, operation: string, evidence: readonly MechanismEvidence[]): boolean {
  if (!isRegisteredMedicalMechanism(m)) return false;
  if (m.engineeringStatus !== "engineering-valid" || m.medicalReviewStatus === "rejected" || m.patientFacingStatus === "rejected") return false;
  if (!m.allowedVisualizations.includes(operation as VisualizationOperation) || FORBIDDEN_VISUALIZATIONS.includes(operation as typeof FORBIDDEN_VISUALIZATIONS[number])) return false;
  if (SAFE_EFFECTS.includes(operation as VisualizationOperation)) return true;
  const rule = m.effectRequirements[operation as VisualizationOperation];
  return !!rule && hasEvidence(rule.reviewEvidenceRefs) && rule.requiredEvidence.every(r => evidence.some(e => factValid(e) && matches(r, e)));
}
