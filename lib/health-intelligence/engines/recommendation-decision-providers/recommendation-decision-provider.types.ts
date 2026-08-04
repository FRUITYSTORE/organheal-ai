import type {
  PatientSummary,
} from "@/lib/models/patient";

import type {
  ClinicalFinding,
} from "@/lib/health-intelligence/models/clinical-findings";

import type {
  RecommendationDecision,
} from "@/lib/health-intelligence/engines/recommendation-decision.engine";

export type RecommendationDecisionProviderInput = {
  patient:
    PatientSummary;

  findings:
    ClinicalFinding[];
};

export type RecommendationDecisionProvider =
  (
    input:
      RecommendationDecisionProviderInput
  ) =>
    | RecommendationDecision
    | null;