import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildFollowUpDeliveryEnvelope,
  FOLLOW_UP_DELIVERY_TYPE,
} from "@/lib/health-intelligence/application/follow-up-dispatch-adapter.service";

import type {
  FollowUpDispatchPlan,
} from "@/lib/health-intelligence/application/follow-up-dispatch.service";

function createDispatchPlan(
  overrides:
    Partial<
      FollowUpDispatchPlan
    > = {}
): FollowUpDispatchPlan {
  return {
    shouldDispatch:
      true,

    status:
      "ready",

    dispatchAt:
      "2026-08-09T18:00:00.000Z",

    channel:
      "email",

    priority:
      "medium",

    payload: {
      userId:
        "user-123",

      channel:
        "email",

      language:
        "en",

      priority:
        "medium",

      purpose:
        "repeat-checkin",

      title:
        "Add a new health check-in",

      body:
        "Complete a new check-in so OrganHeal can compare your recent wellness signals.",

      actionLabel:
        "Open Check-In",

      actionHref:
        "/checkin",

      safetyNote:
        null,

      requiresImmediateDelivery:
        false,
    },

    deduplicationKey:
      "follow-up:user-123:email:repeat-checkin:2026-08-09",

    requestId:
      "req-test",

    maxAttempts:
      3,

    retryDelaysMinutes: [
      30,
      180,
    ],

    auditMetadata: {
      purpose:
        "repeat-checkin",

      language:
        "en",

      messageGeneratedAt:
        "2026-08-06T17:45:00.000Z",

      planGeneratedAt:
        "2026-08-06T18:00:00.000Z",
    },

    reason:
      "Test dispatch plan.",

    generatedAt:
      "2026-08-06T18:00:00.000Z",

    ...overrides,
  };
}

describe(
  "Follow-up dispatch adapter",
  () => {
    it(
      "converts a ready dispatch plan into a delivery envelope",
      () => {
        const result =
          buildFollowUpDeliveryEnvelope({
            plan:
              createDispatchPlan(),

            referenceTime:
              "2026-08-06T18:15:00.000Z",
          });

        expect(
          result.enqueue
        ).toBe(
          true
        );

        expect(
          result.status
        ).toBe(
          "ready"
        );

        expect(
          result.type
        ).toBe(
          FOLLOW_UP_DELIVERY_TYPE
        );

        expect(
          result.userId
        ).toBe(
          "user-123"
        );

        expect(
          result.availableAt
        ).toBe(
          "2026-08-09T18:00:00.000Z"
        );

        expect(
          result.idempotencyKey
        ).toBe(
          "follow-up:user-123:email:repeat-checkin:2026-08-09"
        );

        expect(
          result.generatedAt
        ).toBe(
          "2026-08-06T18:15:00.000Z"
        );
      }
    );

    it(
      "preserves delivery payload retry and audit metadata",
      () => {
        const result =
          buildFollowUpDeliveryEnvelope({
            plan:
              createDispatchPlan(),
          });

        expect(
          result.payload
        ).toMatchObject({
          userId:
            "user-123",

          channel:
            "email",

          purpose:
            "repeat-checkin",

          actionHref:
            "/checkin",
        });

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

        expect(
          result.auditMetadata
        ).toMatchObject({
          source:
            "follow-up-dispatch-adapter",

          dispatchStatus:
            "ready",

          purpose:
            "repeat-checkin",

          language:
            "en",
        });
      }
    );

    it(
      "does not enqueue a plan that is not ready",
      () => {
        const result =
          buildFollowUpDeliveryEnvelope({
            plan:
              createDispatchPlan({
                shouldDispatch:
                  false,

                status:
                  "not-required",

                dispatchAt:
                  null,

                payload:
                  null,

                deduplicationKey:
                  null,

                maxAttempts:
                  0,

                retryDelaysMinutes:
                  [],
              }),
          });

        expect(
          result.enqueue
        ).toBe(
          false
        );

        expect(
          result.status
        ).toBe(
          "not-enqueueable"
        );

        expect(
          result.payload
        ).toBeNull();

        expect(
          result.availableAt
        ).toBeNull();
      }
    );

    it(
      "rejects a ready plan without a payload",
      () => {
        const result =
          buildFollowUpDeliveryEnvelope({
            plan:
              createDispatchPlan({
                payload:
                  null,
              }),
          });

        expect(
          result.enqueue
        ).toBe(
          false
        );

        expect(
          result.reason
        ).toContain(
          "does not contain a delivery payload"
        );
      }
    );

    it(
      "rejects an invalid dispatch time",
      () => {
        const result =
          buildFollowUpDeliveryEnvelope({
            plan:
              createDispatchPlan({
                dispatchAt:
                  "invalid-date",
              }),
          });

        expect(
          result.enqueue
        ).toBe(
          false
        );

        expect(
          result.reason
        ).toContain(
          "valid dispatch time"
        );
      }
    );

    it(
      "rejects a missing idempotency key",
      () => {
        const result =
          buildFollowUpDeliveryEnvelope({
            plan:
              createDispatchPlan({
                deduplicationKey:
                  null,
              }),
          });

        expect(
          result.enqueue
        ).toBe(
          false
        );

        expect(
          result.reason
        ).toContain(
          "idempotency key"
        );
      }
    );

    it(
      "does not mutate the original dispatch payload",
      () => {
        const plan =
          createDispatchPlan();

        const originalPayload =
          plan.payload;

        const result =
          buildFollowUpDeliveryEnvelope({
            plan,
          });

        expect(
          result.payload
        ).not.toBe(
          originalPayload
        );

        expect(
          plan.payload
        ).toBe(
          originalPayload
        );
      }
    );
  }
);