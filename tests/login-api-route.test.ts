import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  mockedConsumePersistentApiRateLimit,
  mockedResolveApiRateLimitIdentity,
  mockedGetSupabaseAdminClient,
  mockedCreateApiRequestId,
  mockedLogApiError,
  mockedStartApiTimer,
  mockedSignInWithPassword,
  mockedProfileMaybeSingle,
} = vi.hoisted(
  () => ({
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

    mockedSignInWithPassword:
      vi.fn(),

    mockedProfileMaybeSingle:
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
  "@supabase/supabase-js",
  () => ({
    createClient:
      vi.fn(() => ({
        auth: {
          signInWithPassword:
            mockedSignInWithPassword,
        },
      })),
  })
);

import {
  POST,
} from "@/app/api/auth/login/route";

function createLoginRequest(
  body: Record<string, unknown>
): Request {
  return new Request(
    "http://localhost/api/auth/login",
    {
      method:
        "POST",

      headers: {
        "content-type":
          "application/json",

        "x-forwarded-for":
          "203.0.113.10",
      },

      body:
        JSON.stringify(body),
    }
  );
}

describe(
  "POST /api/auth/login",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks();

        process.env.NEXT_PUBLIC_SUPABASE_URL =
  "https://example.supabase.co";

process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  "test-publishable-key";

        mockedCreateApiRequestId
          .mockReturnValue(
            "req_login_test"
          );

        mockedStartApiTimer
          .mockReturnValue({
            elapsedMs:
              () => 15,
          });

        mockedResolveApiRateLimitIdentity
          .mockReturnValue({
            type:
              "ip",

            value:
              "203.0.113.10",
          });

        mockedConsumePersistentApiRateLimit
          .mockResolvedValue({
            allowed:
              true,

            limit:
              10,

            remaining:
              9,

            retryAfterSeconds:
              0,
          });

        mockedProfileMaybeSingle
          .mockResolvedValue({
            data: {
              email:
                "resolved@example.com",
            },

            error:
              null,
          });

        mockedGetSupabaseAdminClient
          .mockReturnValue({
            from:
              vi.fn(() => ({
                select:
                  vi.fn(() => ({
                    ilike:
                      vi.fn(() => ({
                        maybeSingle:
                          mockedProfileMaybeSingle,
                      })),
                  })),
              })),
          });

        mockedSignInWithPassword
          .mockResolvedValue({
            data: {
              user: {
                id:
                  "user-123",
              },

              session: {
                access_token:
                  "access-token",

                refresh_token:
                  "refresh-token",
              },
            },

            error:
              null,
          });
      }
    );

    it(
      "signs in directly with an email address",
      async () => {
        const response =
          await POST(
            createLoginRequest({
              identifier:
                "person@example.com",

              password:
                "secret-password",
            })
          );

        const body =
          await response.json();

        console.log(
          "LOGIN TEST DEBUG",
        {
            status:
              response.status,
            body,
            logCalls:
              mockedLogApiError.mock.calls,
        }
      );

        expect(
          response.status
        ).toBe(200);

        expect(
          mockedProfileMaybeSingle
        ).not.toHaveBeenCalled();

        expect(
          mockedSignInWithPassword
        ).toHaveBeenCalledWith({
          email:
            "person@example.com",

          password:
            "secret-password",
        });

        expect(body).toEqual({
          success:
            true,

          session: {
            accessToken:
              "access-token",

            refreshToken:
              "refresh-token",
          },

          requestId:
            "req_login_test",
        });
      }
    );

    it(
      "resolves a username server-side before signing in",
      async () => {
        const response =
          await POST(
            createLoginRequest({
              identifier:
                "test_user",

              password:
                "secret-password",
            })
          );

        const body =
          await response.json();

        expect(
          response.status
        ).toBe(200);

        expect(
          mockedProfileMaybeSingle
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          mockedSignInWithPassword
        ).toHaveBeenCalledWith({
          email:
            "resolved@example.com",

          password:
            "secret-password",
        });

        expect(
          JSON.stringify(body)
        ).not.toContain(
          "resolved@example.com"
        );
      }
    );

    it(
      "uses the same error for an unknown username",
      async () => {
        mockedProfileMaybeSingle
          .mockResolvedValue({
            data:
              null,

            error:
              null,
          });

        const response =
          await POST(
            createLoginRequest({
              identifier:
                "missing_user",

              password:
                "secret-password",
            })
          );

        const body =
          await response.json();

        expect(
          response.status
        ).toBe(401);

        expect(body.error).toBe(
          "Incorrect email, username, or password."
        );

        expect(
          mockedSignInWithPassword
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "uses the same error for invalid credentials",
      async () => {
        mockedSignInWithPassword
          .mockResolvedValue({
            data: {
              user:
                null,

              session:
                null,
            },

            error: {
              message:
                "Invalid login credentials",
            },
          });

        const response =
          await POST(
            createLoginRequest({
              identifier:
                "person@example.com",

              password:
                "wrong-password",
            })
          );

        const body =
          await response.json();

        expect(
          response.status
        ).toBe(401);

        expect(body.error).toBe(
          "Incorrect email, username, or password."
        );
      }
    );

    it(
      "returns 429 when the login rate limit is exceeded",
      async () => {
        mockedConsumePersistentApiRateLimit
          .mockResolvedValue({
            allowed:
              false,

            limit:
              10,

            remaining:
              0,

            retryAfterSeconds:
              42,
          });

        const response =
          await POST(
            createLoginRequest({
              identifier:
                "test_user",

              password:
                "secret-password",
            })
          );

        expect(
          response.status
        ).toBe(429);

        expect(
          response.headers.get(
            "retry-after"
          )
        ).toBe("42");

        expect(
          mockedProfileMaybeSingle
        ).not.toHaveBeenCalled();

        expect(
          mockedSignInWithPassword
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "does not expose the resolved email in an authentication failure",
      async () => {
        mockedSignInWithPassword
          .mockResolvedValue({
            data: {
              user:
                null,

              session:
                null,
            },

            error: {
              message:
                "Invalid login credentials",
            },
          });

        const response =
          await POST(
            createLoginRequest({
              identifier:
                "test_user",

              password:
                "wrong-password",
            })
          );

        const body =
          await response.json();

        expect(
          JSON.stringify(body)
        ).not.toContain(
          "resolved@example.com"
        );

        expect(
          JSON.stringify(body)
        ).not.toContain(
          "test_user"
        );
      }
    );

    it(
      "returns a safe 500 response for an unexpected failure",
      async () => {
        mockedGetSupabaseAdminClient
          .mockImplementation(
            () => {
              throw new Error(
                "sensitive database failure"
              );
            }
          );

        const response =
          await POST(
            createLoginRequest({
              identifier:
                "test_user",

              password:
                "secret-password",
            })
          );

        const body =
          await response.json();

        expect(
          response.status
        ).toBe(500);

        expect(body.error).toBe(
          "Unable to sign in."
        );

        expect(
          JSON.stringify(body)
        ).not.toContain(
          "sensitive database failure"
        );

        expect(
          mockedLogApiError
        ).toHaveBeenCalledTimes(
          1
        );
      }
    );
  }
);