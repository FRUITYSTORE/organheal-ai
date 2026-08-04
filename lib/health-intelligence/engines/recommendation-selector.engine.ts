import type {
  HealthRecommendation,
} from "@/lib/health-intelligence/engines/recommendation.engine";

import type {
  RecommendationDecision,
} from "@/lib/health-intelligence/engines/recommendation-decision.engine";

import {
  getRecommendationDecisionPolicy,
} from "@/lib/health-intelligence/engines/recommendation-decision-policy";

export type RecommendationSelectionResult = {
  primaryAction:
    HealthRecommendation;

  weeklyActions:
    HealthRecommendation[];
};

export type SelectRecommendationInput = {
  decision:
    RecommendationDecision;

  recommendations:
    HealthRecommendation[];
};

export function selectRecommendations({
  decision,
  recommendations,
}: SelectRecommendationInput): RecommendationSelectionResult {
  const policy =
    getRecommendationDecisionPolicy(
      decision
    );

  const preferred =
    recommendations.filter(
      (recommendation) =>
        policy.preferredRecommendationIds.includes(
          recommendation.id as never
        )
    );

  const fallback =
    recommendations.filter(
      (recommendation) =>
        policy.fallbackRecommendationIds.includes(
          recommendation.id as never
        )
    );

  const candidatePool =
    preferred.length > 0
      ? preferred
      : fallback.length > 0
      ? fallback
      : recommendations;

  const ordered =
    [...candidatePool].sort(
      (a, b) =>
        b.score - a.score
    );

  const primaryAction =
    ordered[0];

  const weeklyActions =
    ordered.slice(1, 5);

  if (
    weeklyActions.length === 0
  ) {
    weeklyActions.push(
      primaryAction
    );
  }

  return {
    primaryAction,
    weeklyActions,
  };
}