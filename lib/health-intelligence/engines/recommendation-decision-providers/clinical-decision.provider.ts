import type {
  RecommendationDecisionProvider,
} from "@/lib/health-intelligence/engines/recommendation-decision-providers/recommendation-decision-provider.types";

export const clinicalDecisionProvider:
  RecommendationDecisionProvider = ({
    patient,
  }) => {
    const reportIds =
      new Set(
        patient.healthInsights
          .map(
            (item) =>
              item.report_id
          )
          .filter(
            (
              reportId
            ): reportId is number =>
              typeof reportId ===
              "number"
          )
      );

    const hasLongitudinalClinicalData =
      patient.uploadedReports.length >=
        2 &&
      reportIds.size >= 2;

    if (
      !hasLongitudinalClinicalData
    ) {
      return null;
    }

    return {
      layer:
        "clinical",

      reason:
        "longitudinal_reports_available",
    };
  };