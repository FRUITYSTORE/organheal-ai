import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  mockedAuthenticateApiRequest,
  mockedConsumePersistentApiRateLimit,
  mockedResolveApiRateLimitIdentity,
  mockedCreateApiRequestId,
  mockedLogApiError,
  mockedLogApiInfo,
  mockedGetSupabaseAdminClient,
  mockedEnqueuePdfExtraction,
  mockedFindActivePdfExtraction,
  mockedProcessBackgroundJobById,
} = vi.hoisted(
  () => ({
    mockedAuthenticateApiRequest:
      vi.fn(),

    mockedProcessBackgroundJobById:
      vi.fn(),

    mockedConsumePersistentApiRateLimit:
      vi.fn(),

     mockedFindActivePdfExtraction:
      vi.fn(),

    mockedResolveApiRateLimitIdentity:
      vi.fn(),

    mockedCreateApiRequestId:
      vi.fn(),

    mockedLogApiError:
      vi.fn(),

    mockedLogApiInfo:
      vi.fn(),

    mockedGetSupabaseAdminClient:
      vi.fn(),

    mockedEnqueuePdfExtraction:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/api/api-auth",
  () => ({
    authenticateApiRequest:
      mockedAuthenticateApiRequest,
  })
);

vi.mock(
  "@/lib/api/api-rate-limit",
  () => ({
    consumePersistentApiRateLimit:
      mockedConsumePersistentApiRateLimit,
  })
);

vi.mock(
  "@/lib/api/api-rate-limit-identity",
  () => ({
    resolveApiRateLimitIdentity:
      mockedResolveApiRateLimitIdentity,
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
  })
);

vi.mock(
  "@/lib/supabase-admin",
  () => ({
    getSupabaseAdminClient:
      mockedGetSupabaseAdminClient,
  })
);

vi.mock(
  "@/lib/jobs/background-job.service",
  () => ({
    BackgroundJobService:
  class {
    findActivePdfExtraction =
      mockedFindActivePdfExtraction;

    enqueuePdfExtraction =
      mockedEnqueuePdfExtraction;
   },
  })
);

vi.mock(
  "next/server",
  async () => {
    const actual =
      await vi.importActual<
        typeof import("next/server")
      >(
        "next/server"
      );

    return {
      ...actual,

      after:
        vi.fn(
          (
            callback:
              () =>
                | void
                | Promise<void>
          ) => {
            void callback();
          }
        ),
    };
  }
);

vi.mock(
  "@/lib/jobs/background-job-runtime",
  () => ({
    createBackgroundJobRuntime:
      vi.fn(() => ({
        worker: {
          processById:
            mockedProcessBackgroundJobById,
        },

        runner: {
          runBatch:
            vi.fn(),
        },
      })),
  })
);

import {
  POST,
} from "@/app/api/extract-pdf/route";

function createSupabaseClient() {
  const maybeSingle =
    vi.fn()
      .mockResolvedValue({
        data: {
          id:
            701,

          file_name:
            "report.pdf",

          file_path:
            "user-123/report.pdf",
        },

        error:
          null,
      });

  const eqSecond =
    vi.fn(
      () => ({
        maybeSingle,
      })
    );

  const eqFirst =
    vi.fn(
      () => ({
        eq:
          eqSecond,
      })
    );

  const select =
    vi.fn(
      () => ({
        eq:
          eqFirst,
      })
    );

  const updateEqSecond =
    vi.fn()
      .mockResolvedValue({
        error:
          null,
      });

  const updateEqFirst =
    vi.fn(
      () => ({
        eq:
          updateEqSecond,
      })
    );

  const update =
    vi.fn(
      () => ({
        eq:
          updateEqFirst,
      })
    );

  const from =
    vi.fn(
      () => ({
        select,
        update,
      })
    );

  return {
    from,
  };
}

describe(
  "POST /api/extract-pdf",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks();

        mockedCreateApiRequestId
          .mockReturnValue(
            "req_extract_pdf_test"
          );

        mockedGetSupabaseAdminClient
          .mockReturnValue(
            {} as never
          );

          mockedProcessBackgroundJobById
          .mockResolvedValue(
            true
      );
        mockedResolveApiRateLimitIdentity
          .mockReturnValue({
           type:
           "user",

           value:
           "user-123",
           });

       mockedConsumePersistentApiRateLimit
         .mockResolvedValue({
           allowed:
            true,

            limit:
            10,

            remaining:
            9,

            resetAt:
            Date.now() +
            60_000,

            retryAfterSeconds:
            0,
        });

        mockedEnqueuePdfExtraction
          .mockResolvedValue({
            jobId:
              "job-123",

            created:
              false,
          });
      }
    );

    it(
      "rejects unauthenticated requests before queueing extraction",
      async () => {
        mockedAuthenticateApiRequest
          .mockResolvedValue({
            success:
              false,

            status:
              401,

            error:
              "Authentication is required.",
          });

        const response =
          await POST(
            new Request(
              "http://localhost/api/extract-pdf",
              {
                method:
                  "POST",

                headers: {
                  "content-type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    reportId:
                      701,
                  }),
              }
            )
          );

        expect(
          response.status
        ).toBe(
          401
        );

        expect(
          mockedEnqueuePdfExtraction
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "queues PDF extraction for a report owned by the authenticated user",
      async () => {
        const supabase =
          createSupabaseClient();

                mockedAuthenticateApiRequest
          .mockResolvedValue({
            success:
              true,

            token:
              "test-token",

            user: {
              id:
                "user-123",
            },

            client:
              supabase,
          } as never);

        mockedEnqueuePdfExtraction
          .mockResolvedValueOnce({
            jobId:
              "job-123",

            created:
              true,
          });

        const response =
          await POST(
            new Request(
              "http://localhost/api/extract-pdf",
              {
                method:
                  "POST",

                headers: {
                  "content-type":
                    "application/json",

                  authorization:
                    "Bearer test-token",
                },

                body:
                  JSON.stringify({
                    reportId:
                      701,
                  }),
              }
            )
          );

        const body =
          await response.json();

        expect(
          response.status
        ).toBe(
          202
        );

        expect(
          mockedEnqueuePdfExtraction
        ).toHaveBeenCalledWith({
          userId:
            "user-123",

          requestId:
            "req_extract_pdf_test",

          payload: {
            reportId:
              701,

            insightId:
              null,

            storagePath:
              "user-123/report.pdf",

            fileName:
              "report.pdf",
          },
        });

        expect(
          mockedProcessBackgroundJobById
        ).toHaveBeenCalledWith(
          "job-123"
        );

        expect(
          body
        ).toEqual({
          success:
            true,

          status:
            "pending",

          jobId:
            "job-123",

          reportId:
            701,

          requestId:
            "req_extract_pdf_test",
        });
      }
    );

        it(
      "reuses an active PDF extraction job without consuming rate limit quota",
      async () => {
        const supabase =
          createSupabaseClient();

        mockedAuthenticateApiRequest
          .mockResolvedValue({
            success:
              true,

            token:
              "test-token",

            user: {
              id:
                "user-123",
            },

            client:
              supabase,
          } as never);

                  mockedEnqueuePdfExtraction
          .mockResolvedValueOnce({
            jobId:
              "job-123",

            created:
              true,
          });

        mockedFindActivePdfExtraction
          .mockResolvedValueOnce(
            "job-existing-701"
          );

        const response =
          await POST(
            new Request(
              "http://localhost/api/extract-pdf",
              {
                method:
                  "POST",

                headers: {
                  "content-type":
                    "application/json",

                  authorization:
                    "Bearer test-token",
                },

                body:
                  JSON.stringify({
                    reportId:
                      701,
                  }),
              }
            )
          );

        const body =
          await response.json();

        expect(
          response.status
        ).toBe(
          202
        );

        expect(
          mockedFindActivePdfExtraction
        ).toHaveBeenCalledWith({
          userId:
            "user-123",

          reportId:
            701,
        });

        expect(
          mockedProcessBackgroundJobById
        ).toHaveBeenCalledWith(
          "job-existing-701"
        );

        expect(
          mockedConsumePersistentApiRateLimit
        ).not.toHaveBeenCalled();

        expect(
          mockedEnqueuePdfExtraction
        ).not.toHaveBeenCalled();

        expect(
          body
        ).toEqual({
          success:
            true,

          status:
            "processing",

          jobId:
            "job-existing-701",

          reportId:
            701,

          requestId:
            "req_extract_pdf_test",
        });
      }
    );

    it(
      "rejects a report path that does not belong to the authenticated user",
      async () => {
        const supabase =
          createSupabaseClient();

        mockedAuthenticateApiRequest
          .mockResolvedValue({
            success:
              true,

            token:
              "test-token",

            user: {
              id:
                "user-123",
            },

            client:
              supabase,
          } as never);

        const response =
          await POST(
            new Request(
              "http://localhost/api/extract-pdf",
              {
                method:
                  "POST",

                headers: {
                  "content-type":
                    "application/json",

                  authorization:
                    "Bearer test-token",
                },

                body:
                  JSON.stringify({
                    reportId:
                      701,

                    filePath:
                      "other-user/report.pdf",

                    fileName:
                      "report.pdf",
                  }),
              }
            )
          );

        expect(
          response.status
        ).toBe(
          404
        );

        expect(
          mockedEnqueuePdfExtraction
        ).not.toHaveBeenCalled();
      }
    );

    it(
  "returns 429 and does not queue extraction when the user exceeds the PDF extraction limit",
  async () => {
    const supabase =
      createSupabaseClient();

    mockedAuthenticateApiRequest
      .mockResolvedValue({
        success:
          true,

        token:
          "test-token",

        user: {
          id:
            "user-123",
        },

        client:
          supabase,
      } as never);

    mockedResolveApiRateLimitIdentity
      .mockReturnValue({
        type:
          "user",

        value:
          "user-123",
      });

    mockedConsumePersistentApiRateLimit
      .mockResolvedValueOnce({
        allowed:
          false,

        limit:
          10,

        remaining:
          0,

        resetAt:
          Date.now() +
          30_000,

        retryAfterSeconds:
          30,
      });

    const response =
      await POST(
        new Request(
          "http://localhost/api/extract-pdf",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json",

              authorization:
                "Bearer test-token",
            },

            body:
              JSON.stringify({
                reportId:
                  701,
              }),
          }
        )
      );

    const body =
      await response.json();

    expect(
      response.status
    ).toBe(
      429
    );

    expect(
      response.headers.get(
        "retry-after"
      )
    ).toBe(
      "30"
    );

    expect(
      response.headers.get(
        "x-ratelimit-limit"
      )
    ).toBe(
      "10"
    );

    expect(
      response.headers.get(
        "x-ratelimit-remaining"
      )
    ).toBe(
      "0"
    );

    expect(
      body.error
    ).toBe(
      "Too many report extraction requests. Please try again shortly."
    );

    expect(
      mockedConsumePersistentApiRateLimit
    ).toHaveBeenCalledWith({
      client:
        expect.anything(),

      key:
        "pdf-extraction:user:user-123",

      policy: {
        limit:
          10,

        windowMs:
          60_000,
      },
    });

    expect(
      mockedEnqueuePdfExtraction
    ).not.toHaveBeenCalled();
  }
);
  }
);