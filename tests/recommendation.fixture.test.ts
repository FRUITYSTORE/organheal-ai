import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createHealthRecommendationFixture,
  createRecommendationResultFixture,
} from "@/tests/fixtures/recommendation.fixture";

describe(
  "recommendation fixtures",
  () => {
    it(
      "creates a default health recommendation",
      () => {
        const recommendation =
          createHealthRecommendationFixture();

        expect(
          recommendation.title
        ).toBe(
          "Review your health plan"
        );

        expect(
          recommendation.priority
        ).toBe(
          "routine"
        );

        expect(
          recommendation.href
        ).toBe(
          "/health-plan"
        );
      }
    );

    it(
      "applies recommendation overrides",
      () => {
        const recommendation =
          createHealthRecommendationFixture({
            title:
              "Upload a medical report",

            category:
              "report",

            href:
              "/lab-upload",

            priority:
              "high",
          });

        expect(
          recommendation.title
        ).toBe(
          "Upload a medical report"
        );

        expect(
          recommendation.category
        ).toBe(
          "report"
        );

        expect(
          recommendation.priority
        ).toBe(
          "high"
        );
      }
    );

    it(
      "creates a recommendation engine result",
      () => {
        const result =
          createRecommendationResultFixture();

        expect(
          result.status
        ).toBe(
          "ready"
        );

        expect(
          result.data.decisionLayer
        ).toBe(
          "lifestyle"
        );

        expect(
          result.data.decisionReason
        ).toBe(
          "core_data_available"
        );

        expect(
          result.data.primaryAction.href
        ).toBe(
          "/health-plan"
        );

        expect(
          result.data.weeklyActions
        ).toHaveLength(
          1
        );
      }
    );

    it(
      "does not share action array references",
      () => {
        const result =
          createRecommendationResultFixture();

        const secondResult =
          createRecommendationResultFixture();

        expect(
          result.data.weeklyActions
        ).not.toBe(
          secondResult.data.weeklyActions
        );

        expect(
          result.data.primaryAction.reasons
        ).not.toBe(
          secondResult.data.primaryAction.reasons
        );
      }
    );
  }
);