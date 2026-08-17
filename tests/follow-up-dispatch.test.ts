import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildFollowUpDispatchPlan,
} from "@/lib/health-intelligence/application/follow-up-dispatch.service";

import type {
  FollowUpMessage,
} from "@/lib/health-intelligence/application/follow-up-message.service";

function createFollowUpMessage(
  overrides:
    Partial<
      FollowUpMessage
    > = {}
): FollowUpMessage {
  return {
    available:
      true,

    language:
      "en",

    channel:
      "email",

    priority:
      "medium",

    purpose:
      "repeat-checkin",

    title:
      "Add a new health check-in",

    body:
      "Complete a new check-in so OrganHeal can compare recent wellness signals.",

    actionLabel:
      "Open Check-In",

    actionHref:
      "/checkin",

    safetyNote:
      null,

    recommendedDelayHours:
      72,

    requiresImmediateDelivery:
      false,

    reason:
      "Test message.",

    generatedAt:
      "2026-08-06T17:45:00.000Z",

    ...overrides,
  };
}

describe(
  "Follow-up dispatch service",
  () => {
    it(
      "builds a scheduled dispatch plan from an available message",
      () => {
        const result =
          buildFollowUpDispatchPlan({
            userId:
              "user-123",

            message:
              createFollowUpMessage(),

            followUpRequired:
              true,

            requestId:
              "req-test",

            referenceTime:
              "2026-08-06T18:00:00.000Z",
          });

        expect(
          result.shouldDispatch
        ).toBe(
          true
        );

        expect(
          result.status
        ).toBe(
          "ready"
        );

        expect(
          result.dispatchAt
        ).toBe(
          "2026-08-09T18:00:00.000Z"
        );

        expect(
          result.channel
        ).toBe(
          "email"
        );

        expect(
          result.maxAttempts
        ).toBe(
          3
        );

        expect(
          result.retryDelaysMinutes
        ).toEqual([
          30,
          180,
        ]);
      }
    );

    it(
      "builds an immediate critical dispatch plan",
      () => {
        const result =
          buildFollowUpDispatchPlan({
            userId:
              "user-critical",

            message:
              createFollowUpMessage({
                channel:
                  "push",

                priority:
                  "critical",

                purpose:
                  "urgent-review",

                recommendedDelayHours:
                  0,

                requiresImmediateDelivery:
                  true,

                safetyNote:
                  "Seek urgent medical care for severe or worsening symptoms.",
              }),

            followUpRequired:
              true,

            referenceTime:
              "2026-08-06T18:00:00.000Z",
          });

        expect(
          result.dispatchAt
        ).toBe(
          "2026-08-06T18:00:00.000Z"
        );

        expect(
          result.maxAttempts
        ).toBe(
          5
        );

        expect(
          result.retryDelaysMinutes
        ).toEqual([
          5,
          15,
          30,
          60,
        ]);

        expect(
          result.payload
            ?.safetyNote
        ).toContain(
          "urgent medical care"
        );
      }
    );

    it(
      "does not dispatch when follow-up is not required",
      () => {
        const result =
          buildFollowUpDispatchPlan({
            userId:
              "user-routine",

            message:
              createFollowUpMessage({
                channel:
                  "dashboard",

                priority:
                  "low",

                purpose:
                  "routine-continuity",

                recommendedDelayHours:
                  168,
              }),

            followUpRequired:
              false,
          });

        expect(
          result.shouldDispatch
        ).toBe(
          false
        );

        expect(
          result.status
        ).toBe(
          "not-required"
        );

        expect(
          result.payload
        ).toBeNull();

        expect(
          result.dispatchAt
        ).toBeNull();
      }
    );

    it(
      "does not dispatch when the message is unavailable",
      () => {
        const result =
          buildFollowUpDispatchPlan({
            userId:
              "user-no-message",

            message:
              createFollowUpMessage({
                available:
                  false,
              }),

            followUpRequired:
              true,
          });

        expect(
          result.shouldDispatch
        ).toBe(
          false
        );

        expect(
          result.status
        ).toBe(
          "message-unavailable"
        );

        expect(
          result.maxAttempts
        ).toBe(
          0
        );
      }
    );

    it(
      "creates deterministic daily deduplication metadata",
      () => {
        const input = {
          userId:
            "user-dedupe",

          message:
            createFollowUpMessage(),

          followUpRequired:
            true,

          referenceTime:
            "2026-08-06T18:00:00.000Z",
        } as const;

        const first =
          buildFollowUpDispatchPlan(
            input
          );

        const second =
          buildFollowUpDispatchPlan(
            input
          );

        expect(
          first.deduplicationKey
        ).toBe(
          second.deduplicationKey
        );

        expect(
          first.deduplicationKey
        ).toBe(
          "follow-up:user-dedupe:email:repeat-checkin:2026-08-09"
        );
      }
    );

    it(
      "rejects an empty user identifier",
      () => {
        expect(
          () =>
            buildFollowUpDispatchPlan({
              userId:
                "   ",

              message:
                createFollowUpMessage(),

              followUpRequired:
                true,
            })
        ).toThrow(
          "A valid user ID is required"
        );
      }
    );

    it(
      "preserves patient-safe message content in the job payload",
      () => {
        const result =
          buildFollowUpDispatchPlan({
            userId:
              "user-payload",

            message:
              createFollowUpMessage({
                language:
                  "ar",

                title:
                  "أضف تحديثًا صحيًا جديدًا",

                body:
                  "أكمل تحديثًا صحيًا جديدًا لمقارنة إشارات العافية.",

                actionLabel:
                  "افتح التحديث الصحي",
              }),

            followUpRequired:
              true,
          });

        expect(
          result.payload
        ).toMatchObject({
          userId:
            "user-payload",

          language:
            "ar",

          title:
            "أضف تحديثًا صحيًا جديدًا",

          actionHref:
            "/checkin",
        });

        expect(
          result.reason
        ).toContain(
          "without sending"
        );
      }
    );
  }
);