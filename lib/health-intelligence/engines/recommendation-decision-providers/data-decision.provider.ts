import type {
  RecommendationDecisionProvider,
} from "@/lib/health-intelligence/engines/recommendation-decision-providers/recommendation-decision-provider.types";

export const dataDecisionProvider:
  RecommendationDecisionProvider = ({
    patient,
  }) => {
    if (
      patient.assessments.length ===
      0
    ) {
      return {
        layer:
          "data",

        reason:
          "missing_assessment",
      };
    }

    if (
      patient.uploadedReports.length ===
      0
    ) {
      return {
        layer:
          "data",

        reason:
          "missing_report",
      };
    }

    if (
      patient.uploadedReports.length >
        0 &&
      patient.generatedResults.length ===
        0
    ) {
      return {
        layer:
          "data",

        reason:
          "report_analysis_needed",
      };
    }

    return null;
  };