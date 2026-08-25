import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

const {
  mockedAfter,
  mockedRunBatch,
  mockedConsumePersistentApiRateLimit,
  mockedGetSupabaseAdminClient,
} = vi.hoisted(
  () => ({
    mockedAfter:
      vi.fn(),

    mockedRunBatch:
      vi.fn(),

    mockedConsumePersistentApiRateLimit:
      vi.fn(),

    mockedGetSupabaseAdminClient:
      vi.fn(),
  })
);

vi.mock(
  "next/server",
  async (
    importOriginal
  ) => {
    const actual =
      await importOriginal<
        typeof import(
          "next/server"
        )
      >();

    return {
      ...actual,

      after:
        mockedAfter,
    };
  }
);

vi.mock(
  "@/lib/jobs/background-job-runtime",
  () => ({
    createBackgroundJobRuntime:
      vi.fn(
        () => ({
          runner: {
            runBatch:
              mockedRunBatch,
          },
        })
      ),
  })
);

vi.mock(
  "@/lib/api/api-auth",
  () => ({
    authenticateApiRequest:
      vi.fn(),
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
  "@/lib/supabase-admin",
  () => ({
    getSupabaseAdminClient:
      mockedGetSupabaseAdminClient,
  })
);

vi.mock(
  "@/lib/health-intelligence/application/authenticated-follow-up-runtime.service",
  () => ({
    executeAuthenticatedFollowUp:
      vi.fn(),
  })
);

import {
  authenticateApiRequest,
} from "@/lib/api/api-auth";

import {
  executeAuthenticatedFollowUp,
} from "@/lib/health-intelligence/application/authenticated-follow-up-runtime.service";

import {
  POST,
} from "@/app/api/follow-up/route";

const mockedAuthenticateApiRequest =
  vi.mocked(
    authenticateApiRequest
  );

const mockedExecuteAuthenticatedFollowUp =
  vi.mocked(
    executeAuthenticatedFollowUp
  );

function createClient():
  SupabaseClient {
  return {} as
    SupabaseClient;
}

function createRequest(
  body:
    Record<
      string,
      unknown
    > = {}
): Request {
  return new Request(
    "http://localhost/api/follow-up",
    {
      method:
        "POST",

      headers: {
        Authorization:
          "Bearer test-token",

        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify(
          body
        ),
    }
  );
}

function createFollowUpResult({
  enqueue = true,
  enqueueResult = {
    jobId:
      "job-follow-up",
    created:
      true,
  },
}: {
  enqueue?:
    boolean;

  enqueueResult?:
    {
      jobId:
        string;

      created:
        boolean;
    } | null;
} = {}) {
  return {
    followUp: {
      decision: {
        followUpRequired:
          true,
      },

      deliveryEnvelope: {
        enqueue,
      },
    },

    enqueueResult,
  } as Awaited<
    ReturnType<
      typeof executeAuthenticatedFollowUp
    >
  >;
}

describe(
  "POST /api/follow-up",
  () => {
    let consoleErrorSpy:
      ReturnType<
        typeof vi.spyOn
      >;

    let consoleInfoSpy:
      ReturnType<
        typeof vi.spyOn
      >;

    beforeEach(
      () => {
        vi.clearAllMocks();

        mockedAfter
          .mockImplementation(
            (
              callback:
                () =>
                  Promise<void>
            ) => {
              void callback();
            }
          );

        mockedRunBatch
          .mockResolvedValue({
            processedJobs:
              1,

            queueWasEmpty:
              false,

            recovery: {
              recoveredRetrying:
                0,

              recoveredFailed:
                0,
            },
          });

        consoleErrorSpy =
          vi.spyOn(
            console,
            "error"
          )
            .mockImplementation(
              () => undefined
            );

        consoleInfoSpy =
          vi.spyOn(
            console,
            "info"
          )
            .mockImplementation(
              () => undefined
            );

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
              createClient(),
          } as Awaited<
            ReturnType<
              typeof authenticateApiRequest
            >
          >);

      mockedGetSupabaseAdminClient
        .mockReturnValue(
        {} as never
        );

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

        mockedExecuteAuthenticatedFollowUp
          .mockResolvedValue(
            createFollowUpResult()
          );
        }
      );

    afterEach(
      () => {
        consoleErrorSpy
          .mockRestore();

        consoleInfoSpy
          .mockRestore();
      }
    );

    it(
      "returns 401 and does not execute follow-up when authentication fails",
      async () => {
        mockedAuthenticateApiRequest
          .mockResolvedValue({
            success:
              false,

            status:
              401,

            error:
              "Unauthorized",
          } as Awaited<
            ReturnType<
              typeof authenticateApiRequest
            >
          >);

        const response =
          await POST(
            createRequest() as never
          );

        expect(
          response.status
        ).toBe(
          401
        );

        const body =
          (await response.json()) as {
            success?:
              boolean;

            error?:
              string;

            requestId?:
              string;
          };

        expect(
          body.success
        ).toBe(
          false
        );

        expect(
          body.error
        ).toBe(
          "Unauthorized"
        );

        expect(
          body.requestId
        ).toMatch(
          /^req_[0-9a-f-]+$/i
        );

        expect(
          response.headers.get(
            "x-request-id"
          )
        ).toBe(
          body.requestId
        );

        expect(
          mockedExecuteAuthenticatedFollowUp
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "uses the authenticated user identity and enqueues the follow-up",
      async () => {
        const response =
          await POST(
            createRequest({
              language:
                "en",

              userId:
                "attacker-user-id",
            }) as never
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          mockedExecuteAuthenticatedFollowUp
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          mockedExecuteAuthenticatedFollowUp
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            userId:
              "user-123",

            client:
              expect.anything(),

            language:
              "en",

            requestId:
              expect.stringMatching(
                /^req_[0-9a-f-]+$/i
              ),
          })
        );

        expect(
          mockedExecuteAuthenticatedFollowUp
        ).not.toHaveBeenCalledWith(
          expect.objectContaining({
            userId:
              "attacker-user-id",
          })
        );

        const body =
          await response.json();

        expect(
          body
        ).toEqual(
          expect.objectContaining({
            success:
              true,

            followUpRequired:
              true,

            deliveryEnqueueable:
              true,

            enqueueResult: {
              jobId:
                "job-follow-up",

              created:
                true,
            },

            requestId:
              expect.stringMatching(
                /^req_[0-9a-f-]+$/i
              ),
          })
        );
      }
    );

    it(
  "returns 429 and does not execute follow-up when the authenticated user exceeds the limit",
  async () => {
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
          createClient(),
      } as never);

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
        createRequest({
          language:
            "en",
        }) as never
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
      mockedConsumePersistentApiRateLimit
    ).toHaveBeenCalledWith({
      client:
        expect.anything(),

      key:
        "follow-up:user:user-123",

      policy: {
        limit:
          10,

        windowMs:
          60_000,
      },
    });

    expect(
      mockedExecuteAuthenticatedFollowUp
    ).not.toHaveBeenCalled();

    expect(
      body
    ).toEqual({
      success:
        false,

      error:
        "Too many follow-up requests. Please try again shortly.",

      requestId:
        expect.any(
          String
        ),
    });
  }
);

    it(
      "kicks the durable worker when a new follow-up job is created",
      async () => {
        const response =
          await POST(
            createRequest() as never
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          mockedAfter
        ).toHaveBeenCalledTimes(
          1
        );

        await vi.waitFor(
          () => {
            expect(
              mockedRunBatch
            ).toHaveBeenCalledTimes(
              1
            );
          }
        );

        expect(
          mockedRunBatch
        ).toHaveBeenCalledWith(
          1
        );
      }
    );

    it(
      "does not kick the worker when the follow-up job already exists",
      async () => {
        mockedExecuteAuthenticatedFollowUp
          .mockResolvedValue(
            createFollowUpResult({
              enqueueResult: {
                jobId:
                  "job-existing",

                created:
                  false,
              },
            })
          );

        const response =
          await POST(
            createRequest() as never
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          mockedAfter
        ).not.toHaveBeenCalled();

        expect(
          mockedRunBatch
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "preserves Arabic language",
      async () => {
        const response =
          await POST(
            createRequest({
              language:
                "ar",
            }) as never
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          mockedExecuteAuthenticatedFollowUp
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            userId:
              "user-123",

            language:
              "ar",
          })
        );
      }
    );

    it(
      "returns success without a job when delivery is not enqueueable",
      async () => {
        mockedExecuteAuthenticatedFollowUp
          .mockResolvedValue(
            createFollowUpResult({
              enqueue:
                false,

              enqueueResult:
                null,
            })
          );

        const response =
          await POST(
            createRequest() as never
          );

        expect(
          response.status
        ).toBe(
          200
        );

        const body =
          await response.json();

        expect(
          body
        ).toEqual(
          expect.objectContaining({
            success:
              true,

            followUpRequired:
              true,

            deliveryEnqueueable:
              false,

            enqueueResult:
              null,
          })
        );
      }
    );

    it(
      "defaults unsupported language values to English",
      async () => {
        const response =
          await POST(
            createRequest({
              language:
                "fr",
            }) as never
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          mockedExecuteAuthenticatedFollowUp
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            language:
              "en",
          })
        );
      }
    );

    it(
      "returns a controlled 500 response when follow-up execution fails",
      async () => {
        mockedExecuteAuthenticatedFollowUp
          .mockRejectedValue(
            new Error(
              "Follow-up runtime failed."
            )
          );

        const response =
          await POST(
            createRequest() as never
          );

        expect(
          response.status
        ).toBe(
          500
        );

        const body =
          (await response.json()) as {
            success?:
              boolean;

            error?:
              string;

            requestId?:
              string;
          };

        expect(
          body.success
        ).toBe(
          false
        );

        expect(
          body.error
        ).toBe(
          "Could not process the follow-up decision."
        );

        expect(
          body.requestId
        ).toMatch(
          /^req_[0-9a-f-]+$/i
        );

        expect(
          response.headers.get(
            "x-request-id"
          )
        ).toBe(
          body.requestId
        );
      }
    );
  }
);
