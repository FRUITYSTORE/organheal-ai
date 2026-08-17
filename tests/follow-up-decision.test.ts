import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildFollowUpDecision,
} from "@/lib/health-intelligence/application/follow-up-decision.service";

import type {
  NextDecisionData,
} from "@/lib/health-intelligence/engines/next-decision.engine";

import type {
  RecommendationDecision,
} from "@/lib/health-intelligence/engines/recommendation-decision.engine";

function createNextDecision(
  type:
    | "build-baseline"
    | "add-daily-context"
    | "add-medical-evidence"
    | "complete-report-processing"
    | "generate-analysis"
    | "add-followup-history"
    | "review-declining-momentum"
    | "continue-health-plan" =
      "add-followup-history"
): NextDecisionData {
  return {
    primary: {
      type,
    },

    alternatives:
      [],

    context: {
      evidenceStrength:
        "moderate",

      evidenceScore:
        0.6,

      confidenceLevel:
        "moderate",

      confidenceScore:
        0.6,

      momentumStatus:
        "stable",
    },

    generatedAt:
      "2026-08-06T17:30:00.000Z",
  } as unknown as
    NextDecisionData;
}

function createRecommendationDecision(
  overrides:
    Partial<
      RecommendationDecision
    > = {}
): RecommendationDecision {
  return {
    layer:
      "journey",

    reason:
      "follow_up_needed",

    ...overrides,
  };
}

describe(
  "Follow-up decision service",
  () => {
    it(
      "coordinates the next decision impact and recommendation policy",
      () => {
        const result =
          buildFollowUpDecision({
            nextDecision:
              createNextDecision(),

            recommendationDecision:
              createRecommendationDecision(),

            referenceTime:
              "2026-08-06T17:30:00.000Z",
          });

        expect(
          result.followUpRequired
        ).toBe(
          true
        );

        expect(
          result.priority
        ).toBe(
          "medium"
        );

        expect(
          result.recommendedAction
        ).toBe(
          "repeat-checkin"
        );

        expect(
          result.impact
            .primary
            .actionType
        ).toBe(
          "add-followup-history"
        );

        expect(
          result.generatedAt
        ).toBe(
          "2026-08-06T17:30:00.000Z"
        );
      }
    );

    it(
      "escalates a critical finding without diagnosing it",
      () => {
        const result =
          buildFollowUpDecision({
            nextDecision:
              createNextDecision(
                "add-medical-evidence"
              ),

            recommendationDecision:
              createRecommendationDecision({
                layer:
                  "emergency",

                reason:
                  "critical_finding_present",
              }),
          });

        expect(
          result.priority
        ).toBe(
          "critical"
        );

        expect(
          result.recommendedDelayHours
        ).toBe(
          0
        );

        expect(
          result.recommendedChannel
        ).toBe(
          "push"
        );

        expect(
          result.recommendedAction
        ).toBe(
          "professional-review"
        );

        expect(
          result.safetyEscalation
        ).toBe(
          "urgent-review"
        );
      }
    );

    it(
      "uses high priority for clinical follow-up",
      () => {
        const result =
          buildFollowUpDecision({
            nextDecision:
              createNextDecision(
                "generate-analysis"
              ),

            recommendationDecision:
              createRecommendationDecision({
                layer:
                  "clinical",

                reason:
                  "report_analysis_needed",
              }),
          });

        expect(
          result.priority
        ).toBe(
          "high"
        );

        expect(
          result.recommendedDelayHours
        ).toBe(
          24
        );

        expect(
          result.recommendedChannel
        ).toBe(
          "whatsapp"
        );

        expect(
          result.recommendedAction
        ).toBe(
          "analyze-report"
        );

        expect(
          result.safetyEscalation
        ).toBe(
          "professional-review"
        );
      }
    );

    it(
      "uses routine dashboard follow-up for a stable lifestyle state",
      () => {
        const result =
          buildFollowUpDecision({
            nextDecision:
              createNextDecision(
                "continue-health-plan"
              ),

            recommendationDecision:
              createRecommendationDecision({
                layer:
                  "lifestyle",

                reason:
                  "core_data_available",
              }),
          });

        expect(
          result.followUpRequired
        ).toBe(
          false
        );

        expect(
          result.priority
        ).toBe(
          "low"
        );

        expect(
          result.recommendedDelayHours
        ).toBe(
          168
        );

        expect(
          result.recommendedChannel
        ).toBe(
          "dashboard"
        );

        expect(
          result.recommendedAction
        ).toBe(
          "maintain-healthy-routine"
        );

        expect(
          result.safetyEscalation
        ).toBe(
          "none"
        );
      }
    );

    it(
      "preserves fallback recommendations",
      () => {
        const result =
          buildFollowUpDecision({
            nextDecision:
              createNextDecision(
                "build-baseline"
              ),

            recommendationDecision:
              createRecommendationDecision({
                layer:
                  "data",

                reason:
                  "missing_assessment",
              }),
          });

        expect(
          result.recommendedAction
        ).toBe(
          "complete-assessment"
        );

        expect(
          result.fallbackActions
        ).toEqual([
          "complete-checkin",
          "upload-report",
        ]);

        expect(
          result.reason
        ).toContain(
          "without recalculating clinical evidence"
        );
      }
    );
  }
);