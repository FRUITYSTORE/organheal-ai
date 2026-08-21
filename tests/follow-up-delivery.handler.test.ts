import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  createFollowUpDeliveryHandler,
} from "@/lib/jobs/handlers/follow-up-delivery.handler";

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
  "@/lib/repositories/communication-preferences.repository",
  () => ({
    getCommunicationPreferences:
      vi.fn(),
  })
);
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
    from:
      vi.fn(),
  } as unknown as
    SupabaseClient;
}

function createJob(
  overrides:
    Partial<
      DurableBackgroundJob
    > = {}
): DurableBackgroundJob {
  return {
    id:
      "job-follow-up",

    userId:
      "user-123",

    requestId:
      "req-follow-up",

    type:
      "follow-up-delivery",

    status:
      "running",

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

    availableAt:
      "2026-08-09T18:00:00.000Z",

    createdAt:
      "2026-08-06T18:00:00.000Z",

    updatedAt:
      "2026-08-09T18:00:00.000Z",

    startedAt:
      "2026-08-09T18:00:00.000Z",

    finishedAt:
      null,

    lastError:
      null,

    ...overrides,
  };
}

describe(
  "Follow-up delivery handler",
  () => {
    beforeEach(
      () => {
        mockedExecuteFollowUpDelivery
          .mockReset();

        mockedCreateAndSaveNotification
          .mockReset();

        mockedCreateAndSaveNotification
          .mockResolvedValue({
            notification: {
              id:
                "notification-123",

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
      }
    );

    it(
      "persists the notification before delegating delivery",
      async () => {
        const client =
          createClient();

        const handler =
          createFollowUpDeliveryHandler(
            client
          );

        const job =
          createJob();

        await handler(
          job
        );

        expect(
          mockedCreateAndSaveNotification
        ).toHaveBeenCalledWith({
          client,

          userId:
            "user-123",

          purpose:
            "repeat-checkin",

          priority:
            "medium",

          channels: [
  "dashboard",
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
        });

        expect(
  mockedExecuteFollowUpDelivery
).toHaveBeenCalledWith(
  expect.objectContaining({
    jobId:
      "job-follow-up",

    requestId:
      "req-follow-up",

    userId:
      "user-123",

    loadCommunicationPreferences:
      expect.any(Function),
  })
);

        expect(
          mockedCreateAndSaveNotification
            .mock
            .invocationCallOrder[0]
        ).toBeLessThan(
          mockedExecuteFollowUpDelivery
            .mock
            .invocationCallOrder[0]
        );
      }
    );

    it(
      "does not execute delivery when notification persistence fails",
      async () => {
        mockedCreateAndSaveNotification
          .mockRejectedValue(
            new Error(
              "Notification persistence failed."
            )
          );

        const handler =
          createFollowUpDeliveryHandler(
            createClient()
          );

        await expect(
          handler(
            createJob()
          )
        ).rejects.toThrow(
          "Notification persistence failed."
        );

        expect(
          mockedExecuteFollowUpDelivery
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "preserves urgent safety metadata",
      async () => {
        const job =
          createJob();

        job.payload = {
          ...(
            job.payload as Record<
              string,
              unknown
            >
          ),

          delivery: {
            ...(
              (
                job.payload as {
                  delivery:
                    Record<
                      string,
                      unknown
                    >;
                }
              ).delivery
            ),

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
        };

        const handler =
          createFollowUpDeliveryHandler(
            createClient()
          );

        await handler(
          job
        );

        expect(
          mockedCreateAndSaveNotification
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            priority:
              "critical",

            purpose:
              "urgent-review",

            channels: [
  "dashboard",
],

            safety: {
              note:
                "Seek urgent medical care for severe or worsening symptoms.",

              requiresProfessionalReview:
                true,

              requiresUrgentReview:
                true,
            },
          })
        );
      }
    );

    it(
      "rejects a job without a user ID",
      async () => {
        const handler =
          createFollowUpDeliveryHandler(
            createClient()
          );

        await expect(
          handler(
            createJob({
              userId:
                "   ",
            })
          )
        ).rejects.toThrow(
          "missing the user ID"
        );

        expect(
          mockedCreateAndSaveNotification
        ).not.toHaveBeenCalled();

        expect(
          mockedExecuteFollowUpDelivery
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects a malformed delivery payload",
      async () => {
        const handler =
          createFollowUpDeliveryHandler(
            createClient()
          );

        await expect(
          handler(
            createJob({
              payload: {
                delivery: {
                  channel:
                    "email",
                },
              },
            })
          )
        ).rejects.toThrow(
          "payload is invalid"
        );

        expect(
          mockedCreateAndSaveNotification
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects an unsupported channel",
      async () => {
        const job =
          createJob();

        const payload =
          job.payload as {
            delivery: {
              channel:
                string;
            };
          };

        payload
          .delivery
          .channel =
          "sms";

        const handler =
          createFollowUpDeliveryHandler(
            createClient()
          );

        await expect(
          handler(
            job
          )
        ).rejects.toThrow(
          "payload is invalid"
        );
      }
    );
  }
);