import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  createBackgroundJobRuntime,
} from "@/lib/jobs/background-job-runtime";

import {
  JOB_STATUS,
  JOB_TYPES,
  type BackgroundJob,
} from "@/lib/jobs/job-types";

import {
  executeFollowUpDelivery,
} from "@/lib/jobs/handlers/follow-up-delivery.service";

import {
  createAndSaveNotification,
} from "@/lib/notifications/notification.service";

import type {
  DurableBackgroundJob,
} from "@/lib/jobs/background-job-worker.repository";

vi.mock(
  "@/lib/jobs/handlers/follow-up-delivery.service",
  () => ({
    executeFollowUpDelivery:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/notifications/notification.service",
  () => ({
    createAndSaveNotification:
      vi.fn(),
  })
);

const mockedExecuteFollowUpDelivery =
  vi.mocked(
    executeFollowUpDelivery
  );

  const mockedCreateAndSaveNotification =
  vi.mocked(
    createAndSaveNotification
  );

function createClient():
  SupabaseClient {
  return {
    rpc:
      vi.fn(),
    from:
      vi.fn(),
  } as unknown as
    SupabaseClient;
}

function createFollowUpJob():
  BackgroundJob {
  return {
    id:
      "job-follow-up",

    type:
      JOB_TYPES
        .FOLLOW_UP_DELIVERY,

    status:
      JOB_STATUS.RUNNING,

    payload: {
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
    },

    attempts:
      0,

    maxAttempts:
      3,

    createdAt:
      "2026-08-06T18:00:00.000Z",

    availableAt:
      "2026-08-09T18:00:00.000Z",

    startedAt:
      "2026-08-09T18:00:00.000Z",

    finishedAt:
      null,

    lastError:
      null,
  };
}

describe(
  "Background job runtime",
  () => {
    it(
      "registers and dispatches follow-up delivery jobs",
      async () => {
                mockedCreateAndSaveNotification
          .mockResolvedValue({
            notification: {
              id:
                "notification-runtime",

              userId:
                "user-123",

              purpose:
                "repeat-checkin",

              priority:
                "medium",

              status:
                "unread",

              channels: [
                "dashboard",
                "email",
              ],

              title:
                "Add a new health check-in",

              body:
                "Complete a new health check-in.",

              action: {
                label:
                  "Open Check-In",

                href:
                  "/checkin",
              },

              safety:
                null,

              source:
                "follow-up-delivery",

              sourceReferenceId:
                "job-follow-up",

              idempotencyKey:
                "follow-up:user-123:email:repeat-checkin:2026-08-09",

              createdAt:
                "2026-08-09T18:00:00.000Z",

              readAt:
                null,

              dismissedAt:
                null,

              expiresAt:
                null,
            },

            created:
              true,
          });
        mockedExecuteFollowUpDelivery
          .mockResolvedValue({
            delivered:
              false,

            dryRun:
              true,

            channel:
              "email",

            userId:
              "user-123",

            idempotencyKey:
              "follow-up:test",

            reason:
              "Dry run.",

            executedAt:
              "2026-08-09T18:00:00.000Z",
          });

        const runtime =
          createBackgroundJobRuntime(
            createClient()
          );

               const job =
          createFollowUpJob();

        const durableJob:
          DurableBackgroundJob = {
          ...job,

          userId:
            "user-123",

          requestId:
            "req-follow-up",

          availableAt:
            job.availableAt ??
            job.createdAt,

          updatedAt:
            "2026-08-09T18:00:00.000Z",
        };

        await runtime
          .dispatcher
          .dispatch(
            durableJob
          );

        expect(
          mockedCreateAndSaveNotification
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          mockedCreateAndSaveNotification
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            userId:
              "user-123",

            purpose:
              "repeat-checkin",

            channels: [
              "dashboard",
              "email",
            ],

            source:
              "follow-up-delivery",

            sourceReferenceId:
              "job-follow-up",
          })
        );
        expect(
          mockedExecuteFollowUpDelivery
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          mockedExecuteFollowUpDelivery
        ).toHaveBeenCalledWith({
          jobId:
            "job-follow-up",

          requestId:
            "req-follow-up",

          userId:
            "user-123",

          payload:
            job.payload,
        });
      }
    );
  }
);
