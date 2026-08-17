import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildFollowUpMessage,
} from "@/lib/health-intelligence/application/follow-up-message.service";

import type {
  FollowUpDecision,
} from "@/lib/health-intelligence/application/follow-up-decision.service";

function createFollowUpDecision(
  overrides:
    Partial<
      FollowUpDecision
    > = {}
): FollowUpDecision {
  return {
    followUpRequired:
      true,

    priority:
      "medium",

    recommendedDelayHours:
      72,

    recommendedChannel:
      "email",

    recommendedAction:
      "repeat-checkin",

    fallbackActions: [
      "monitor-priority-area",
      "review-health-plan",
    ],

    nextClinicalStep: {
      type:
        "add-followup-history",
    } as FollowUpDecision[
      "nextClinicalStep"
    ],

    impact: {
      primary: {
        actionType:
          "add-followup-history",

        impacts:
          [],

        summary: {
          primaryImpact:
            "strengthen-followup-history",

          highMagnitudeImpactCount:
            1,

          totalImpactCount:
            3,
        },
      },

      alternatives:
        [],

      generatedAt:
        "2026-08-06T17:30:00.000Z",
    },

    recommendationDecision: {
      layer:
        "journey",

      reason:
        "follow_up_needed",
    },

    recommendationPolicy: {
      preferredRecommendationIds: [
        "repeat-checkin",
        "complete-checkin",
      ],

      fallbackRecommendationIds: [
        "monitor-priority-area",
        "review-health-plan",
      ],
    },

    safetyEscalation:
      "none",

    reason:
      "Test follow-up decision.",

    generatedAt:
      "2026-08-06T17:30:00.000Z",

    ...overrides,
  };
}

describe(
  "Follow-up message service",
  () => {
    it(
      "builds a patient-safe repeat check-in message",
      () => {
        const result =
          buildFollowUpMessage({
            decision:
              createFollowUpDecision(),

            language:
              "en",

            referenceTime:
              "2026-08-06T17:45:00.000Z",
          });

        expect(
          result.available
        ).toBe(
          true
        );

        expect(
          result.purpose
        ).toBe(
          "repeat-checkin"
        );

        expect(
          result.title
        ).toBe(
          "Add a new health check-in"
        );

        expect(
          result.actionHref
        ).toBe(
          "/checkin"
        );

        expect(
          result.channel
        ).toBe(
          "email"
        );

        expect(
          result.generatedAt
        ).toBe(
          "2026-08-06T17:45:00.000Z"
        );
      }
    );

    it(
      "builds an Arabic follow-up message",
      () => {
        const result =
          buildFollowUpMessage({
            decision:
              createFollowUpDecision(),

            language:
              "ar",
          });

        expect(
          result.title
        ).toBe(
          "أضف تحديثًا صحيًا جديدًا"
        );

        expect(
          result.body
        ).toContain(
          "إشارات العافية الحديثة"
        );

        expect(
          result.actionLabel
        ).toBe(
          "افتح التحديث الصحي"
        );
      }
    );

    it(
      "creates an immediate urgent-review message for critical follow-up",
      () => {
        const result =
          buildFollowUpMessage({
            decision:
              createFollowUpDecision({
                priority:
                  "critical",

                recommendedDelayHours:
                  0,

                recommendedChannel:
                  "push",

                recommendedAction:
                  "professional-review",

                safetyEscalation:
                  "urgent-review",
              }),
          });

        expect(
          result.purpose
        ).toBe(
          "urgent-review"
        );

        expect(
          result.requiresImmediateDelivery
        ).toBe(
          true
        );

        expect(
          result.safetyNote
        ).toContain(
          "Seek urgent medical care"
        );

        expect(
          result.body
        ).not.toContain(
          "confirmed diagnosis"
        );
      }
    );

    it(
      "adds a professional-review safety boundary",
      () => {
        const result =
          buildFollowUpMessage({
            decision:
              createFollowUpDecision({
                priority:
                  "high",

                recommendedDelayHours:
                  24,

                recommendedChannel:
                  "whatsapp",

                recommendedAction:
                  "analyze-report",

                safetyEscalation:
                  "professional-review",
              }),
          });

        expect(
          result.purpose
        ).toBe(
          "professional-review"
        );

        expect(
          result.safetyNote
        ).toContain(
          "not a diagnosis"
        );

        expect(
          result.requiresImmediateDelivery
        ).toBe(
          false
        );
      }
    );

    it(
      "builds a routine health-plan message without unnecessary escalation",
      () => {
        const result =
          buildFollowUpMessage({
            decision:
              createFollowUpDecision({
                followUpRequired:
                  false,

                priority:
                  "low",

                recommendedDelayHours:
                  168,

                recommendedChannel:
                  "dashboard",

                recommendedAction:
                  "maintain-healthy-routine",

                safetyEscalation:
                  "none",
              }),
          });

        expect(
          result.purpose
        ).toBe(
          "routine-continuity"
        );

        expect(
          result.actionHref
        ).toBe(
          "/health-plan"
        );

        expect(
          result.safetyNote
        ).toBeNull();

        expect(
          result.requiresImmediateDelivery
        ).toBe(
          false
        );
      }
    );

    it(
      "preserves the channel timing and priority from the follow-up decision",
      () => {
        const result =
          buildFollowUpMessage({
            decision:
              createFollowUpDecision({
                priority:
                  "high",

                recommendedDelayHours:
                  24,

                recommendedChannel:
                  "whatsapp",

                recommendedAction:
                  "analyze-report",
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
          result.channel
        ).toBe(
          "whatsapp"
        );

        expect(
          result.reason
        ).toContain(
          "without changing its clinical priority"
        );
      }
    );
  }
);