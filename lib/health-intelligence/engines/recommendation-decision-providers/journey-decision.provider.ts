import type {
  RecommendationDecisionProvider,
} from "@/lib/health-intelligence/engines/recommendation-decision-providers/recommendation-decision-provider.types";

function isFollowUpNeeded(
  createdAt:
    string | null | undefined
): boolean {
  if (!createdAt) {
    return true;
  }

  const timestamp =
    new Date(createdAt).getTime();

  if (
    Number.isNaN(timestamp)
  ) {
    return true;
  }

  const ageInDays =
    (
      Date.now() -
      timestamp
    ) /
    (
      1000 *
      60 *
      60 *
      24
    );

  return ageInDays >= 7;
}

export const journeyDecisionProvider:
  RecommendationDecisionProvider = ({
    patient,
  }) => {
    if (
      !isFollowUpNeeded(
        patient.latestCheckIn?.created_at
      )
    ) {
      return null;
    }

    return {
      layer:
        "journey",

      reason:
        "follow_up_needed",
    };
  };