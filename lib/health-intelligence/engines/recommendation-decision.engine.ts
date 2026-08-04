import type {
  PatientSummary,
} from "@/lib/models/patient";

import type {
  ClinicalFinding,
} from "@/lib/health-intelligence/models/clinical-findings";

import {
  recommendationDecisionProviders,
} from "@/lib/health-intelligence/engines/recommendation-decision-providers/recommendation-decision-provider.registry";

export type RecommendationDecisionLayer =
  | "emergency"
  | "clinical"
  | "journey"
  | "data"
  | "lifestyle";

export type RecommendationDecisionReason =
  | "critical_finding_present"
  | "longitudinal_reports_available"
  | "missing_assessment"
  | "missing_report"
  | "report_analysis_needed"
  | "follow_up_needed"
  | "core_data_available";

export type RecommendationDecision = {
  layer:
    RecommendationDecisionLayer;

  reason:
    RecommendationDecisionReason;
};

export type BuildRecommendationDecisionInput = {
  patient:
    PatientSummary;

  findings:
    ClinicalFinding[];
};

export function buildRecommendationDecision({
  patient,
  findings,
}: BuildRecommendationDecisionInput): RecommendationDecision {
  for (
    const provider of
    recommendationDecisionProviders
  ) {
    const decision =
      provider({
        patient,
        findings,
      });

    if (decision) {
      return decision;
    }
  }

  throw new Error(
    "No recommendation decision provider returned a decision."
  );
}