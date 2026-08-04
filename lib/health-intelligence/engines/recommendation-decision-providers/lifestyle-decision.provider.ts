import type {
  RecommendationDecisionProvider,
} from "@/lib/health-intelligence/engines/recommendation-decision-providers/recommendation-decision-provider.types";

export const lifestyleDecisionProvider:
  RecommendationDecisionProvider = () => {
    return {
      layer:
        "lifestyle",

      reason:
        "core_data_available",
    };
  };