import type {
  ClinicalEvidenceConfidence,
  ClinicalEvidenceReference,
  ClinicalEvidenceRelevance,
  ClinicalEvidenceSourceType,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

export type ClinicalEvidenceStrength =
  | "very-low"
  | "low"
  | "moderate"
  | "high"
  | "very-high";

export type ClinicalEvidenceRecency =
  | "unknown"
  | "historical"
  | "older"
  | "recent"
  | "current";

export type ClinicalEvidenceCompleteness =
  | "missing"
  | "limited"
  | "usable"
  | "complete";

export type ClinicalEvidenceWeightComponents = {
  sourceReliability:
    number;

  certainty:
    number;

  confidence:
    number;

  relevance:
    number;

  recency:
    number;

  completeness:
    number;
};

export type ClinicalEvidenceWeightResult = {
  evidenceId:
    string;

  sourceType:
    ClinicalEvidenceSourceType;

  confidence:
    ClinicalEvidenceConfidence;

  relevance:
    ClinicalEvidenceRelevance;

  recency:
    ClinicalEvidenceRecency;

  completeness:
    ClinicalEvidenceCompleteness;

  strength:
    ClinicalEvidenceStrength;

  normalizedWeight:
    number;

  components:
    ClinicalEvidenceWeightComponents;

  rationale:
    string[];

  evaluatedAt:
    string;
};

export type ClinicalEvidenceWeightCollection = {
  evidence:
    ClinicalEvidenceWeightResult[];

  averageWeight:
    number;

  strongestEvidenceId:
    string | null;

  weakestEvidenceId:
    string | null;

  evaluatedAt:
    string;
};

export type EvaluateClinicalEvidenceWeightInput = {
  evidence:
    ClinicalEvidenceReference;

  referenceTime?:
    string | Date;
};