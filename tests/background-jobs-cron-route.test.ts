import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  mockedCreateApiRequestId,
  mockedLogApiError,
  mockedLogApiInfo,
  mockedLogApiWarning,
  mockedCreateBackgroundJobRuntime,
  mockedGetSupabaseAdminClient,
  mockedAdminRpc,
  mockedRunBatch,
} = vi.hoisted(
  () => ({
    mockedCreateApiRequestId:
      vi.fn(),

    mockedLogApiError:
      vi.fn(),

    mockedLogApiInfo:
      vi.fn(),

    mockedLogApiWarning:
      vi.fn(),

    mockedCreateBackgroundJobRuntime:
      vi.fn(),

    mockedGetSupabaseAdminClient:
      vi.fn(),

    mockedAdminRpc:
      vi.fn(),

    mockedRunBatch:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/api/api-logger",
  () => ({
    createApiRequestId:
      mockedCreateApiRequestId,

    logApiError:
      mockedLogApiError,

    logApiInfo:
      mockedLogApiInfo,

    logApiWarning:
      mockedLogApiWarning,
  })
);

vi.mock(
  "@/lib/jobs/background-job-runtime",
  () => ({
    createBackgroundJobRuntime:
      mockedCreateBackgroundJobRuntime,
  })
);

vi.mock(
  "@/lib/supabase-admin",
  () => ({
    getSupabaseAdminClient:
      mockedGetSupabaseAdminClient,
  })
);

import {
  NextRequest,
} from "next/server";

import {
  GET,
} from "@/app/api/internal/background-jobs/cron/route";

const ORIGINAL_ENV =
  process.env;

function createCronRequest(
  authorization?:
    string
): NextRequest {
  return new NextRequest(
    "http://localhost/api/internal/background-jobs/cron",
    {
      method:
        "GET",

      headers:
        authorization
          ? {
              authorization,
            }
          : {},
    }
  );
}

describe(
  "GET /api/internal/background-jobs/cron",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks();

        process.env = {
          ...ORIGINAL_ENV,

          CRON_SECRET:
            "test-cron-secret",
        };

        mockedCreateApiRequestId
          .mockReturnValue(
            "req_cron_test"
          );

        mockedRunBatch
          .mockResolvedValue({
            processedJobs:
              2,

            reachedLimit:
              false,

            queueWasEmpty:
              true,

            recoveredRetrying:
              0,

            recoveredFailed:
              0,
          });

        mockedCreateBackgroundJobRuntime
          .mockReturnValue({
            runner: {
              runBatch:
                mockedRunBatch,
            },
          } as never);

        mockedGetSupabaseAdminClient
          .mockReturnValue({
             rpc:
        mockedAdminRpc,
          } as never);

        mockedAdminRpc
          .mockResolvedValue({
           data:
            3,

        error:
         null,
      });
    }
  );

    afterEach(
      () => {
        process.env =
          ORIGINAL_ENV;
      }
    );

    it(
      "rejects an invalid cron secret",
      async () => {
        const response =
          await GET(
            createCronRequest(
              "Bearer wrong-secret"
            )
          );

        const body =
          await response.json();

        expect(
          response.status
        ).toBe(
          401
        );

        expect(
          body
        ).toEqual({
          error:
            "Unauthorized.",

          requestId:
            "req_cron_test",
        });

        expect(
          mockedCreateBackgroundJobRuntime
        ).not.toHaveBeenCalled();

        expect(
          mockedRunBatch
        ).not.toHaveBeenCalled();

        expect(
          mockedLogApiWarning
        ).toHaveBeenCalledWith(
          "background_jobs_cron.unauthorized",
          {
            route:
              "/api/internal/background-jobs/cron",

            requestId:
              "req_cron_test",
          }
        );
      }
    );

    it(
      "runs a background-job batch with the configured cron batch size",
      async () => {
        const response =
          await GET(
            createCronRequest(
              "Bearer test-cron-secret"
            )
          );

        const body =
          await response.json();

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          mockedCreateBackgroundJobRuntime
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          mockedRunBatch
        ).toHaveBeenCalledWith(
          10
        );

        expect(
          body
        ).toEqual({
          success:
            true,

          processedJobs:
            2,

          reachedLimit:
            false,

          queueWasEmpty:
            true,

          requestId:
            "req_cron_test",
        });

        expect(
          response.headers.get(
            "x-request-id"
          )
        ).toBe(
          "req_cron_test"
        );
      }
    );

    it(
  "cleans expired API rate-limit rows after a successful job batch",
  async () => {
    const response =
      await GET(
        createCronRequest(
          "Bearer test-cron-secret"
        )
      );

    expect(
      response.status
    ).toBe(
      200
    );

    expect(
      mockedAdminRpc
    ).toHaveBeenCalledWith(
      "cleanup_expired_api_rate_limits",
      {
        p_retention_seconds:
          3600,
      }
    );

    expect(
      mockedLogApiInfo
    ).toHaveBeenCalledWith(
      "background_jobs_cron.rate_limit_cleanup_completed",
      {
        route:
          "/api/internal/background-jobs/cron",

        requestId:
          "req_cron_test",

        deletedRows:
          3,
      }
    );
  }
);

it(
  "keeps the cron successful when rate-limit cleanup fails",
  async () => {
    mockedAdminRpc
      .mockResolvedValueOnce({
        data:
          null,

        error: {
          code:
            "PGRST_TEST",

          message:
            "Cleanup failed",
        },
      });

    const response =
      await GET(
        createCronRequest(
          "Bearer test-cron-secret"
        )
      );

    const body =
      await response.json();

    expect(
      response.status
    ).toBe(
      200
    );

    expect(
      body.success
    ).toBe(
      true
    );

    expect(
      mockedRunBatch
    ).toHaveBeenCalledWith(
      10
    );

    expect(
      mockedLogApiWarning
    ).toHaveBeenCalledWith(
      "background_jobs_cron.rate_limit_cleanup_failed",
      {
        route:
          "/api/internal/background-jobs/cron",

        requestId:
          "req_cron_test",

        supabaseErrorCode:
          "PGRST_TEST",

        errorMessage:
          "Cleanup failed",
      }
    );
  }
);

    it(
      "returns 500 when the background-job runner fails",
      async () => {
        mockedRunBatch
          .mockRejectedValue(
            new Error(
              "Runner failure"
            )
          );

        const response =
          await GET(
            createCronRequest(
              "Bearer test-cron-secret"
            )
          );

        const body =
          await response.json();

        expect(
          response.status
        ).toBe(
          500
        );

        expect(
          body
        ).toEqual({
          error:
            "Could not run scheduled background jobs.",

          requestId:
            "req_cron_test",
        });

        expect(
          mockedLogApiError
        ).toHaveBeenCalledWith(
          "background_jobs_cron.request_failed",
          expect.any(
            Error
          ),
          {
            route:
              "/api/internal/background-jobs/cron",

            requestId:
              "req_cron_test",
          }
        );
      }
    );
  }
);