import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildFollowUpRuntime,
} from "@/lib/health-intelligence/application/follow-up-runtime.service";

import type {
  NextDecisionData,
} from "@/lib/health-intelligence/engines/next-decision.engine";

import type {
  RecommendationDecision,
} from "@/lib/health-intelligence/engines/recommendation-decision.engine";

function createNextDecision():
  NextDecisionData {
  return {
    primary: {
      type:
        "add-followup-history",
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
      "2026-08-22T10:00:00.000Z",
  } as unknown as
    NextDecisionData;
}

function createRecommendationDecision():
  RecommendationDecision {
  return {
    layer:
      "journey",

    reason:
      "follow_up_needed",
  };
}

describe(
  "buildFollowUpRuntime",
  () => {
    it(
      "composes the follow-up pipeline into a delivery envelope",
      () => {
        const result =
          buildFollowUpRuntime({
            userId:
              "user-123",

            nextDecision:
              createNextDecision(),

            recommendationDecision:
              createRecommendationDecision(),

            language:
              "en",

            requestId:
              "req-follow-up",

            referenceTime:
              "2026-08-22T10:00:00.000Z",
          });

        expect(
          result.decision
        ).toBeDefined();

        expect(
          result.message
        ).toBeDefined();

        expect(
          result.dispatchPlan
        ).toBeDefined();

        expect(
          result.deliveryEnvelope
        ).toBeDefined();

        expect(
          result.dispatchPlan.requestId
        ).toBe(
          "req-follow-up"
        );

        expect(
          result.deliveryEnvelope.requestId
        ).toBe(
          "req-follow-up"
        );

        expect(
          result.deliveryEnvelope.userId
        ).toBe(
          "user-123"
        );
      }
    );

    it(
      "preserves Arabic language through message generation",
      () => {
        const result =
          buildFollowUpRuntime({
            userId:
              "user-123",

            nextDecision:
              createNextDecision(),

            recommendationDecision:
              createRecommendationDecision(),

            language:
              "ar",

            referenceTime:
              "2026-08-22T10:00:00.000Z",
          });

        expect(
          result.message.language
        ).toBe(
          "ar"
        );
      }
    );
  }
);