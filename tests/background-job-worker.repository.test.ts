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
  BackgroundJobWorkerRepository,
} from "@/lib/jobs/background-job-worker.repository";

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

describe(
  "BackgroundJobWorkerRepository claimById",
  () => {
    beforeEach(
      () => {
        rpcMock.mockReset();
      }
    );

    it(
      "claims the requested background job by id",
      async () => {
        const jobId =
          "11111111-1111-4111-8111-111111111111";

        rpcMock
          .mockResolvedValue({
            data: [
              {
                id:
                  jobId,

                user_id:
                  "user-123",

                request_id:
                  "req-123",

                job_type:
                  "pdf-extraction",

                status:
                  "running",

                payload: {
                  reportId:
                    111,
                },

                attempts:
                  0,

                max_attempts:
                  3,

                available_at:
                  "2026-09-05T00:00:00.000Z",

                started_at:
                  "2026-09-05T00:00:01.000Z",

                finished_at:
                  null,

                last_error:
                  null,

                created_at:
                  "2026-09-05T00:00:00.000Z",

                updated_at:
                  "2026-09-05T00:00:01.000Z",
              },
            ],

            error:
              null,
          });

        const repository =
          new BackgroundJobWorkerRepository(
            createClient()
          );

        const result =
          await repository
            .claimById<{
              reportId:
                number;
            }>(
              jobId
            );

        expect(
          rpcMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          rpcMock
        ).toHaveBeenCalledWith(
          "claim_background_job_by_id",
          {
            p_job_id:
              jobId,
          }
        );

        expect(
          result
        ).toEqual(
          expect.objectContaining({
            id:
              jobId,

            userId:
              "user-123",

            requestId:
              "req-123",

            type:
              "pdf-extraction",

            status:
              "running",

            payload: {
              reportId:
                111,
            },

            attempts:
              0,

            maxAttempts:
              3,
          })
        );
      }
    );

    it(
      "returns null when the requested job cannot be claimed",
      async () => {
        rpcMock
          .mockResolvedValue({
            data:
              [],

            error:
              null,
          });

        const repository =
          new BackgroundJobWorkerRepository(
            createClient()
          );

        const result =
          await repository
            .claimById(
              "22222222-2222-4222-8222-222222222222"
            );

        expect(
          result
        ).toBeNull();

        expect(
          rpcMock
        ).toHaveBeenCalledWith(
          "claim_background_job_by_id",
          {
            p_job_id:
              "22222222-2222-4222-8222-222222222222",
          }
        );
      }
    );
  }
);