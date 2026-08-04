import type {
  EngineResult,
} from "@/lib/health-intelligence/models/engine-result";

import type {
  HealthRecommendation,
  RecommendationData,
} from "@/lib/health-intelligence/engines/recommendation.engine";

export type HealthRecommendationFixtureOverrides =
  Partial<HealthRecommendation>;

export type RecommendationResultFixtureOverrides =
  Omit<
    Partial<
      EngineResult<RecommendationData>
    >,
    "data"
  > & {
    data?:
      Partial<RecommendationData>;
  };

export function createHealthRecommendationFixture(
  overrides:
    HealthRecommendationFixtureOverrides = {}
): HealthRecommendation {
  const baseFixture:
    HealthRecommendation = {
      id:
        "review-health-plan",

      title:
        "Review your health plan",

      description:
        "Review your current priorities and complete the next recommended health action.",

      priority:
        "routine",

      category:
        "follow-up",

      href:
        "/health-plan",

      score:
        80,

      reasons: [
        "Core health data is available.",
      ],
    };

  return {
    ...baseFixture,
    ...overrides,

    reasons:
      overrides.reasons
        ? [...overrides.reasons]
        : [...baseFixture.reasons],
  };
}

export function createRecommendationResultFixture(
  overrides:
    RecommendationResultFixtureOverrides = {}
): EngineResult<RecommendationData> {
  const primaryAction =
    overrides.data?.primaryAction
      ? createHealthRecommendationFixture(
          overrides.data.primaryAction
        )
      : createHealthRecommendationFixture();

  const weeklyActions =
    overrides.data?.weeklyActions
      ? overrides.data.weeklyActions.map(
          (action) =>
            createHealthRecommendationFixture(
              action
            )
        )
      : [
          createHealthRecommendationFixture({
            id:
              "weekly-checkin",

            title:
              "Complete a health Check-In",

            description:
              "Update your mood and wellness score.",

            category:
              "checkin",

            href:
              "/checkin",

            score:
              72,
          }),
        ];

  const baseData:
    RecommendationData = {
      todaysMission:
        "Review your health plan.",

      decisionLayer:
        "lifestyle",

      decisionReason:
        "core_data_available",

      primaryAction,

      weeklyActions,

      nextReviewDays:
        7,
    };

  const baseFixture:
    EngineResult<RecommendationData> = {
      status:
        "ready",

      confidence:
        85,

      generatedAt:
        "2026-08-04T00:00:00.000Z",

      data:
        baseData,
    };

  return {
    ...baseFixture,
    ...overrides,

    data: {
      ...baseData,
      ...overrides.data,

      primaryAction,

      weeklyActions,
    },
  };
}