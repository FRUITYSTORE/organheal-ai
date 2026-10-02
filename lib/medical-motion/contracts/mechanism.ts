import type { BodySystemId } from "./anatomy-foundation";
import type { AnatomyStructureId } from "./anatomy";
import type { OrganId } from "./organ";
import type { AnatomyRequirements } from "./organ-module";
import type { SafetyTriageResult } from "../../symptom-explanation/contracts";

export const TRIGGER_KINDS = ["symptom", "lab", "vital-sign", "assessment-response", "verified-report-finding", "longitudinal-trend"] as const;
export type TriggerKind = (typeof TRIGGER_KINDS)[number];
export type EvidenceRule = { kind: TriggerKind; code: string; origin?: "server-intake" | "verified-record" };
/** Normalized server facts, never AI confidence or a diagnosis inferred here. */
export type MechanismEvidence = EvidenceRule & { origin: "server-intake" | "verified-record"; assertion: "present" | "absent" | "unknown"; evidenceRef: string };
export type ClinicalSeverity = "none" | "mild" | "moderate" | "high" | "unknown";
export const VISUALIZATION_OPERATIONS = ["highlight", "camera-focus", "structure-label", "flow-direction-cue", "pressure-emphasis", "motion-rate-change", "narrow-lumen"] as const;
export type VisualizationOperation = (typeof VISUALIZATION_OPERATIONS)[number];
export const FORBIDDEN_VISUALIZATIONS = ["invent-plaque", "invent-tumor", "invent-clot", "invent-scar", "unsupported-pathology", "unvalidated-deformation"] as const;
export type VisualizationProfile = {
  primaryStructure: AnatomyStructureId;
  secondaryStructures: readonly AnatomyStructureId[];
  cameraIntent: "overview" | "focus-structure";
  visualEffectIntent: readonly VisualizationOperation[];
  motionIntent: "none" | "baseline";
  flowIntent: "none" | "direction-only";
  labelIntent: "none" | "structure-names";
  visualEmphasis: "neutral" | "subtle";
  patientIndependent: true;
};
export type MedicalMechanism = {
  mechanismId: string; version: string; kind: "explanatory-mechanism";
  bodySystems: readonly BodySystemId[]; affectedOrgans: readonly OrganId[];
  requiredAnatomy: AnatomyRequirements;
  optionalAnatomy: readonly AnatomyStructureId[];
  highlightedAnatomy: readonly AnatomyStructureId[];
  clinicalTriggers: readonly EvidenceRule[];
  requiredEvidence: readonly EvidenceRule[];
  supportingEvidence: readonly EvidenceRule[];
  contradictoryEvidence: readonly EvidenceRule[];
  missingEvidenceBehavior: "insufficient-evidence" | "needs-clinical-review";
  contraindications: readonly { evidence: EvidenceRule; reason: string }[];
  allowedClaims: readonly ("general-physiology" | "possible-mechanism" | "documented-mechanism")[];
  forbiddenClaims: readonly ("diagnosis" | "patient-pathology" | "risk-as-disease")[];
  visualizationProfile: VisualizationProfile;
  allowedVisualizations: readonly VisualizationOperation[];
  forbiddenVisualizations: readonly (typeof FORBIDDEN_VISUALIZATIONS)[number][];
  /** Nontrivial effects require independent rule review and evidence at use time. */
  effectRequirements: Partial<Record<VisualizationOperation, { requiredEvidence: readonly EvidenceRule[]; reviewEvidenceRefs: readonly string[] }>>;
  severityModel: { clinicalLevels: readonly ClinicalSeverity[]; mapping: "no-automatic-visual-mapping" };
  safetyRequirements: { requireSafetyGate: true; noDiagnosisInference: true; noRiskToPathology: true };
  engineeringStatus: "draft" | "engineering-valid" | "rejected";
  medicalReviewStatus: "unreviewed" | "medically-reviewed" | "rejected";
  patientFacingStatus: "internal-only" | "patient-approved" | "rejected";
  sourceRefs: readonly string[];
  medicalReviewEvidenceRefs: readonly string[];
  patientApprovalEvidenceRefs: readonly string[];
  rationale: string;
};
export type MechanismIdentity = { mechanismId: string; mechanismVersion: string };
export type MechanismEvaluationContext = {
  safety: SafetyTriageResult;
  evidence: readonly MechanismEvidence[];
  mode: "development" | "production";
  claim: "general-physiology" | "possible-mechanism" | "documented-mechanism";
  clinicalSeverity?: ClinicalSeverity;
};
