import type {
  ClinicalEvidenceConfidence,
  ClinicalPriority,
  WholeBodyHealthDomain,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

export type ClinicalHypothesisKind =
  | "possible-explanation"
  | "risk-pattern"
  | "cross-system-connection"
  | "medication-related"
  | "lifestyle-related"
  | "requires-exclusion";

export type ClinicalHypothesisStatus =
  | "candidate"
  | "provisional"
  | "supported"
  | "weakened"
  | "insufficient-evidence";

export type ClinicalHypothesisEvidence = {
  evidenceId:
    string;

  normalizedWeight:
    number;

  explanation:
    string;
};

export type ClinicalHypothesis = {
  id:
    string;

  title:
    string;

  description:
    string;

  kind:
    ClinicalHypothesisKind;

  status:
    ClinicalHypothesisStatus;

  domains:
    WholeBodyHealthDomain[];

  priority:
    ClinicalPriority;

  confidence:
    ClinicalEvidenceConfidence;

  supportingEvidence:
    ClinicalHypothesisEvidence[];

  contradictingEvidence:
    ClinicalHypothesisEvidence[];

  contextualEvidence:
    ClinicalHypothesisEvidence[];

  missingEvidence:
    string[];

  affectedNodeIds:
    string[];

  affectedRelationshipIds:
    string[];

  interpretationBoundary:
    string;

  generatedAt:
    string;
};

export type ClinicalHypothesisGenerationStatus =
  | "no-evidence"
  | "insufficient-foundation"
  | "foundation-ready"
  | "hypotheses-generated";

export type ClinicalHypothesisCollection = {
  status:
    ClinicalHypothesisGenerationStatus;

  hypotheses:
    ClinicalHypothesis[];

  eligibleEvidenceIds:
    string[];

  excludedEvidenceIds:
    string[];

  evidenceCount:
    number;

  eligibleEvidenceCount:
    number;

  relationshipCount:
    number;

  generatedHypothesisCount:
    number;

  generationAllowed:
    boolean;

  reason:
    string;

  safetyBoundary:
    string;

  generatedAt:
    string;
};