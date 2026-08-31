import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  mockedAuthenticateOptionalApiRequest,
  mockedConsumePersistentApiRateLimit,
  mockedResolveApiRateLimitIdentity,
  mockedGetSupabaseAdminClient,
  mockedCreateApiRequestId,
  mockedLogApiError,
  mockedStartApiTimer,
  mockedInsertEvent,
} = vi.hoisted(
  () => ({
    mockedAuthenticateOptionalApiRequest:
      vi.fn(),

    mockedConsumePersistentApiRateLimit:
      vi.fn(),

    mockedResolveApiRateLimitIdentity:
      vi.fn(),

    mockedGetSupabaseAdminClient:
      vi.fn(),

    mockedCreateApiRequestId:
      vi.fn(),

    mockedLogApiError:
      vi.fn(),

    mockedStartApiTimer:
      vi.fn(),

    mockedInsertEvent:
      vi.fn(),
  })
);

vi.mock(
  "@/lib/api/api-auth",
  () => ({
    authenticateOptionalApiRequest:
      mockedAuthenticateOptionalApiRequest,
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
  "@/lib/supabase-admin",
  () => ({
    getSupabaseAdminClient:
      mockedGetSupabaseAdminClient,
  })
);

vi.mock(
  "@/lib/api/api-logger",
  () => ({
    createApiRequestId:
      mockedCreateApiRequestId,

    logApiError:
      mockedLogApiError,

    startApiTimer:
      mockedStartApiTimer,
  })
);

vi.mock(
  "@/lib/analytics/product-analytics.repository",
  () => ({
    ProductAnalyticsRepository:
      class {
        async insertEvent(
          event:
            unknown
        ): Promise<void> {
          return mockedInsertEvent(
            event
          );
        }
      },
  })
);

import {
  POST,
} from "@/app/api/analytics/route";

function createAnalyticsRequest({
  body,
  authorization,
  forwardedFor,
}: {
  body:
    Record<string, unknown>;

  authorization?:
    string;

  forwardedFor?:
    string;
}): Request {
  const headers:
    Record<string, string> = {
      "content-type":
        "application/json",
  };

  if (
    authorization
  ) {
    headers.Authorization =
      authorization;
  }

  if (
    forwardedFor
  ) {
    headers[
      "x-forwarded-for"
    ] =
      forwardedFor;
  }

  return new Request(
    "http://localhost/api/analytics",
    {
      method:
        "POST",

      headers,

      body:
        JSON.stringify(
          body
        ),
    }
  );
}

describe(
  "POST /api/analytics",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks();

        mockedCreateApiRequestId
          .mockReturnValue(
            "req_analytics_test"
          );

        mockedStartApiTimer
          .mockReturnValue({
            elapsedMs:
              () => 20,
          });

        mockedGetSupabaseAdminClient
          .mockReturnValue(
            {} as never
          );

        mockedAuthenticateOptionalApiRequest
          .mockResolvedValue({
            success:
              true,

            token:
              null,

            user:
              null,

            client:
              null,
          });

        mockedResolveApiRateLimitIdentity
          .mockReturnValue({
            type:
              "ip",

            value:
              "127.0.0.1",
          });

        mockedConsumePersistentApiRateLimit
          .mockResolvedValue({
            allowed:
              true,

            limit:
              60,

            remaining:
              59,

            resetAt:
              Date.now() +
              60_000,

            retryAfterSeconds:
              0,
          });

        mockedInsertEvent
          .mockResolvedValue(
            undefined
          );
      }
    );

    it(
      "records a guest analytics event",
      async () => {
        const response =
          await POST(
            createAnalyticsRequest({
              body: {
                name:
                  "homepage_viewed",

                language:
                  "en",

                source:
                  "homepage",

                anonymousSessionId:
                  "550e8400-e29b-41d4-a716-446655440000",
              },

              forwardedFor:
                "127.0.0.1",
            })
          );

        expect(
          response.status
        ).toBe(201);

        expect(
          mockedInsertEvent
        ).toHaveBeenCalledWith({
          eventName:
            "homepage_viewed",

          userId:
            null,

          anonymousSessionId:
            "550e8400-e29b-41d4-a716-446655440000",

          language:
            "en",

          source:
            "homepage",

          authenticated:
            false,
        });
      }
    );

    it(
      "uses the authenticated server user id",
      async () => {
        mockedAuthenticateOptionalApiRequest
          .mockResolvedValue({
            success:
              true,

            token:
              "valid-token",

            user: {
              id:
                "server-user-123",
            },

            client:
              {},
          } as never);

        mockedResolveApiRateLimitIdentity
          .mockReturnValue({
            type:
              "user",

            value:
              "server-user-123",
          });

        const response =
          await POST(
            createAnalyticsRequest({
              authorization:
                "Bearer valid-token",

              body: {
                name:
                  "health_plan_viewed",

                language:
                  "en",

                source:
                  "health-plan",

                anonymousSessionId:
                  "550e8400-e29b-41d4-a716-446655440000",
              },
            })
          );

        expect(
          response.status
        ).toBe(201);

        expect(
          mockedInsertEvent
        ).toHaveBeenCalledWith({
          eventName:
            "health_plan_viewed",

          userId:
            "server-user-123",

          anonymousSessionId:
            null,

          language:
            "en",

          source:
            "health-plan",

          authenticated:
            true,
        });
      }
    );

    it(
      "rejects a forged user id from the client",
      async () => {
        const response =
          await POST(
            createAnalyticsRequest({
              body: {
                name:
                  "assistant_used",

                userId:
                  "forged-user-999",
              },
            })
          );

        expect(
          response.status
        ).toBe(400);

        expect(
          mockedInsertEvent
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects clinical or conversational content",
      async () => {
        const response =
          await POST(
            createAnalyticsRequest({
              body: {
                name:
                  "assistant_used",

                prompt:
                  "What does my blood test mean?",

                reportId:
                  "report_123",

                transcript:
                  "private voice content",
              },
            })
          );

        expect(
          response.status
        ).toBe(400);

        expect(
          mockedInsertEvent
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects an invalid authenticated session",
      async () => {
        mockedAuthenticateOptionalApiRequest
          .mockResolvedValue({
            success:
              false,

            status:
              401,

            error:
              "Your session is invalid or has expired.",
          });

        const response =
          await POST(
            createAnalyticsRequest({
              authorization:
                "Bearer invalid-token",

              body: {
                name:
                  "homepage_viewed",
              },
            })
          );

        expect(
          response.status
        ).toBe(401);

        expect(
          mockedInsertEvent
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns 429 when the analytics rate limit is exceeded",
      async () => {
        mockedConsumePersistentApiRateLimit
          .mockResolvedValue({
            allowed:
              false,

            limit:
              60,

            remaining:
              0,

            resetAt:
              Date.now() +
              60_000,

            retryAfterSeconds:
              30,
          });

        const response =
          await POST(
            createAnalyticsRequest({
              body: {
                name:
                  "homepage_viewed",

                language:
                  "en",

                source:
                  "homepage",
              },
            })
          );

        expect(
          response.status
        ).toBe(429);

        expect(
          response.headers.get(
            "retry-after"
          )
        ).toBe("30");

        expect(
          mockedInsertEvent
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns a safe error when persistence fails",
      async () => {
        mockedInsertEvent
          .mockRejectedValue(
            new Error(
              "database failure"
            )
          );

        const response =
          await POST(
            createAnalyticsRequest({
              body: {
                name:
                  "homepage_viewed",

                language:
                  "en",

                source:
                  "homepage",
              },
            })
          );

        const body =
          await response.json();

        expect(
          response.status
        ).toBe(500);

        expect(
          body.error
        ).toBe(
          "Unable to record analytics event."
        );

        expect(
          mockedLogApiError
        ).toHaveBeenCalled();

        expect(
          JSON.stringify(
            body
          )
        ).not.toContain(
          "database failure"
        );
      }
    );
  }
);