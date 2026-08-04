import type {
  RecommendationDecisionProvider,
} from "@/lib/health-intelligence/engines/recommendation-decision-providers/recommendation-decision-provider.types";

export const emergencyDecisionProvider:
  RecommendationDecisionProvider = ({
    findings,
  }) => {
    const hasCriticalFinding =
      findings.some(
        (finding) =>
          finding.severity ===
          "critical"
      );

    if (!hasCriticalFinding) {
      return null;
    }

    return {
      layer:
        "emergency",

      reason:
        "critical_finding_present",
    };
  };