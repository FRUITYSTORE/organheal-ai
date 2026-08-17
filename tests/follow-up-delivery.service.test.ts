import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  logApiInfo,
} from "@/lib/api/api-logger";

import {
  executeFollowUpDelivery,
} from "@/lib/jobs/handlers/follow-up-delivery.service";

import type {
  FollowUpDeliveryJobPayload,
} from "@/lib/jobs/background-job.service";

vi.mock(
  "@/lib/api/api-logger",
  () => ({
    logApiInfo:
      vi.fn(),
  })
);

const mockedLogApiInfo =
  vi.mocked(
    logApiInfo
  );

function createPayload(
  overrides:
    Partial<
      FollowUpDeliveryJobPayload
    > = {}
): FollowUpDeliveryJobPayload {
  return {
    delivery: {
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
        "Complete a new health check-in.",

      actionLabel:
        "Open Check-In",

      actionHref:
        "/checkin",

      safetyNote:
        null,

      requiresImmediateDelivery:
        false,
    },

    idempotencyKey:
      "follow-up:user-123:email:repeat-checkin:2026-08-09",

    retryDelaysMinutes: [
      30,
      180,
    ],

    auditMetadata: {
      source:
        "follow-up-dispatch-adapter",

      dispatchStatus:
        "ready",

      purpose:
        "repeat-checkin",

      language:
        "en",

      messageGeneratedAt:
        "2026-08-06T17:45:00.000Z",

      dispatchPlanGeneratedAt:
        "2026-08-06T18:00:00.000Z",

      envelopeGeneratedAt:
        "2026-08-06T18:15:00.000Z",
    },

    ...overrides,
  };
}

describe(
  "Follow-up delivery service",
  () => {
    beforeEach(
      () => {
        mockedLogApiInfo
          .mockReset();
      }
    );

    it(
      "validates and audits a delivery without sending it",
      async () => {
        const result =
          await executeFollowUpDelivery({
            jobId:
              "job-follow-up",

            requestId:
              "req-follow-up",

            userId:
              "user-123",

            payload:
              createPayload(),

            referenceTime:
              "2026-08-06T19:00:00.000Z",
          });

        expect(
          result
        ).toEqual({
          delivered:
            false,

          dryRun:
            true,

          channel:
            "email",

          userId:
            "user-123",

          idempotencyKey:
            "follow-up:user-123:email:repeat-checkin:2026-08-09",

          reason:
            expect.stringContaining(
              "External channel delivery remains disabled"
            ),

          executedAt:
            "2026-08-06T19:00:00.000Z",
        });

        expect(
          mockedLogApiInfo
        ).toHaveBeenCalledWith(
          "follow_up_delivery.dry_run_completed",
          expect.objectContaining({
            jobId:
              "job-follow-up",

            userId:
              "user-123",

            channel:
              "email",

            purpose:
              "repeat-checkin",

            hasAction:
              true,

            hasSafetyNote:
              false,
          })
        );
      }
    );

    it(
      "rejects a delivery user that differs from the job user",
      async () => {
        await expect(
          executeFollowUpDelivery({
            jobId:
              "job-follow-up",

            requestId:
              null,

            userId:
              "user-123",

            payload:
              createPayload({
                delivery: {
                  ...createPayload()
                    .delivery,

                  userId:
                    "different-user",
                },
              }),
          })
        ).rejects.toThrow(
          "does not match the background job user ID"
        );

        expect(
          mockedLogApiInfo
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects an empty delivery body",
      async () => {
        await expect(
          executeFollowUpDelivery({
            jobId:
              "job-follow-up",

            requestId:
              null,

            userId:
              "user-123",

            payload:
              createPayload({
                delivery: {
                  ...createPayload()
                    .delivery,

                  body:
                    "   ",
                },
              }),
          })
        ).rejects.toThrow(
          "Delivery body is required"
        );
      }
    );

    it(
      "preserves urgent safety metadata in the audit",
      async () => {
        await executeFollowUpDelivery({
          jobId:
            "job-critical",

          requestId:
            "req-critical",

          userId:
            "user-123",

          payload:
            createPayload({
              delivery: {
                ...createPayload()
                  .delivery,

                channel:
                  "push",

                priority:
                  "critical",

                purpose:
                  "urgent-review",

                safetyNote:
                  "Seek urgent medical care for severe or worsening symptoms.",

                requiresImmediateDelivery:
                  true,
              },
            }),
        });

        expect(
          mockedLogApiInfo
        ).toHaveBeenCalledWith(
          "follow_up_delivery.dry_run_completed",
          expect.objectContaining({
            channel:
              "push",

            priority:
              "critical",

            purpose:
              "urgent-review",

            requiresImmediateDelivery:
              true,

            hasSafetyNote:
              true,
          })
        );
      }
    );
  }
);