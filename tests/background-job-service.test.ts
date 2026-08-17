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
  BackgroundJobService,
} from "@/lib/jobs/background-job.service";

import type {
  FollowUpDeliveryEnvelope,
} from "@/lib/health-intelligence/application/follow-up-dispatch-adapter.service";

const rpcMock =
  vi.fn();

function createClient():
  SupabaseClient {
  return {
    rpc:
      rpcMock,
  } as unknown as
    SupabaseClient;
}

function createEnvelope(
  overrides:
    Partial<
      FollowUpDeliveryEnvelope
    > = {}
): FollowUpDeliveryEnvelope {
  return {
    enqueue:
      true,

    status:
      "ready",

    type:
      "follow-up-delivery",

    userId:
      "user-123",

    requestId:
      "req-follow-up",

    availableAt:
      "2026-08-09T18:00:00.000Z",

    idempotencyKey:
      "follow-up:user-123:email:repeat-checkin:2026-08-09",

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
        "Complete a new check-in.",

      actionLabel:
        "Open Check-In",

      actionHref:
        "/checkin",

      safetyNote:
        null,

      requiresImmediateDelivery:
        false,
    },

    maxAttempts:
      3,

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

    reason:
      "Test envelope.",

    generatedAt:
      "2026-08-06T18:15:00.000Z",

    ...overrides,
  };
}

describe(
  "BackgroundJobService follow-up delivery",
  () => {
    beforeEach(
      () => {
        rpcMock
          .mockReset();

        rpcMock
          .mockResolvedValue({
            data: [
              {
                job_id:
                  "11111111-1111-4111-8111-111111111111",

                created:
                  true,
              },
            ],

            error:
              null,
          });
      }
    );
    it(
      "returns the existing active job when the follow-up is duplicated",
      async () => {
        rpcMock
          .mockResolvedValue({
            data: [
              {
                job_id:
                  "22222222-2222-4222-8222-222222222222",

                created:
                  false,
              },
            ],

            error:
              null,
          });

        const service =
          new BackgroundJobService(
            createClient()
          );

        const result =
          await service
            .enqueueFollowUpDelivery({
              envelope:
                createEnvelope(),
            });

        expect(
          result
        ).toEqual({
          jobId:
            "22222222-2222-4222-8222-222222222222",

          created:
            false,
        });

        expect(
          rpcMock
        ).toHaveBeenCalledTimes(
          1
        );
      }
    );

    it(
      "enqueues a scheduled follow-up delivery job",
      async () => {
        const service =
          new BackgroundJobService(
            createClient()
          );

        const result =
          await service
            .enqueueFollowUpDelivery({
              envelope:
                createEnvelope(),
            });

        expect(
          result
        ).toEqual({
          jobId:
            "11111111-1111-4111-8111-111111111111",

          created:
            true,
        });

        expect(
          rpcMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          rpcMock
        ).toHaveBeenCalledWith(
          "enqueue_follow_up_delivery_once",
          expect.objectContaining({

            p_user_id:
              "user-123",

            p_request_id:
              "req-follow-up",

            p_idempotency_key:
              "follow-up:user-123:email:repeat-checkin:2026-08-09",

            p_max_attempts:
              3,

            p_available_at:
              "2026-08-09T18:00:00.000Z",

            p_payload:
              expect.objectContaining({
                idempotencyKey:
                  "follow-up:user-123:email:repeat-checkin:2026-08-09",

                retryDelaysMinutes: [
                  30,
                  180,
                ],

                delivery:
                  expect.objectContaining({
                    userId:
                      "user-123",

                    channel:
                      "email",

                    purpose:
                      "repeat-checkin",
                  }),
              }),
          })
        );
      }
    );

    it(
      "rejects a non-enqueueable envelope",
      async () => {
        const service =
          new BackgroundJobService(
            createClient()
          );

        await expect(
          service
            .enqueueFollowUpDelivery({
              envelope:
                createEnvelope({
                  enqueue:
                    false,

                  status:
                    "not-enqueueable",
                }),
            })
        ).rejects.toThrow(
          "A ready follow-up delivery envelope is required."
        );

        expect(
          rpcMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects an invalid availability time",
      async () => {
        const service =
          new BackgroundJobService(
            createClient()
          );

        await expect(
          service
            .enqueueFollowUpDelivery({
              envelope:
                createEnvelope({
                  availableAt:
                    "invalid-date",
                }),
            })
        ).rejects.toThrow(
          "A valid follow-up delivery availability time is required."
        );

        expect(
  rpcMock
).not.toHaveBeenCalled();
      }
    );

    it(
      "preserves retry and audit metadata without mutating the envelope",
      async () => {
        const envelope =
          createEnvelope();

        const originalPayload =
          envelope.payload;

        const service =
          new BackgroundJobService(
            createClient()
          );

        await service
          .enqueueFollowUpDelivery({
            envelope,
          });

        expect(
          envelope.payload
        ).toBe(
          originalPayload
        );

        expect(
          envelope
            .retryDelaysMinutes
        ).toEqual([
          30,
          180,
        ]);

                expect(
          rpcMock
        ).toHaveBeenCalledWith(
          "enqueue_follow_up_delivery_once",
          expect.objectContaining({
            p_payload:
              expect.objectContaining({
                auditMetadata:
                  expect.objectContaining({
                    source:
                      "follow-up-dispatch-adapter",

                    purpose:
                      "repeat-checkin",
                  }),
              }),
          })
        );
      }
    );
  }
);
