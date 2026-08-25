import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  mockedAuthenticateApiRequest,
  mockedConsumePersistentApiRateLimit,
  mockedGetSupabaseAdminClient,
  mockedCreateApiRequestId,
  mockedLogApiError,
  mockedLogApiInfo,
  mockedStartApiTimer,
  mockedFetch,
} = vi.hoisted(
  () => ({
    mockedAuthenticateApiRequest:
      vi.fn(),

    mockedConsumePersistentApiRateLimit:
      vi.fn(),

    mockedGetSupabaseAdminClient:
      vi.fn(),

    mockedCreateApiRequestId:
      vi.fn(),

    mockedLogApiError:
      vi.fn(),

    mockedLogApiInfo:
      vi.fn(),

    mockedStartApiTimer:
      vi.fn(),

    mockedFetch:
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

    logApiInfo:
      mockedLogApiInfo,

    startApiTimer:
      mockedStartApiTimer,
  })
);

import {
  POST,
} from "@/app/api/voice/realtime/route";

const ORIGINAL_ENV =
  process.env;

const ORIGINAL_FETCH =
  globalThis.fetch;

function createRequest(
  authorization?:
    string
): Request {
  return new Request(
    "http://localhost/api/voice/realtime",
    {
      method:
        "POST",

      headers: {
        "Content-Type":
          "application/json",

        ...(authorization
          ? {
              Authorization:
                authorization,
            }
          : {}),
      },

      body:
        JSON.stringify({
          sdp:
            "v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n",

          microphoneType:
            "far_field",
        }),
    }
  );
}

describe(
  "POST /api/voice/realtime",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks();

        process.env = {
          ...ORIGINAL_ENV,

          OPENAI_API_KEY:
            "test-openai-key",
        };

        mockedCreateApiRequestId
          .mockReturnValue(
            "req_voice_realtime_test"
          );

        mockedStartApiTimer
          .mockReturnValue({
            elapsedMs:
              () => 25,
          });

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

        globalThis.fetch =
          mockedFetch;
      }
    );

    afterEach(
      () => {
        process.env =
          ORIGINAL_ENV;

        globalThis.fetch =
          ORIGINAL_FETCH;
      }
    );

    it(
      "rejects unauthenticated requests before calling the realtime provider",
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
            createRequest()
          );

        expect(
          response.status
        ).toBe(
          401
        );

        const body =
          await response.json();

        expect(
          body
        ).toEqual({
          error:
            "Authentication is required.",

          requestId:
            "req_voice_realtime_test",
        });

        expect(
          response.headers.get(
            "x-request-id"
          )
        ).toBe(
          "req_voice_realtime_test"
        );

        expect(
          mockedFetch
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "calls the realtime provider for an authenticated user",
      async () => {
        mockedAuthenticateApiRequest
          .mockResolvedValue({
            success:
              true,

            token:
              "user-access-token",

            user: {
              id:
                "user-123",
            },

            client: {},
          });

        mockedFetch
          .mockResolvedValue(
            new Response(
              "v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n",
              {
                status:
                  201,

                headers: {
                  "Content-Type":
                    "application/sdp",
                },
              }
            )
          );

        const response =
          await POST(
            createRequest(
              "Bearer user-access-token"
            )
          );

        expect(
          response.status
        ).toBe(
          201
        );

        expect(
          mockedAuthenticateApiRequest
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          mockedFetch
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          mockedFetch
        ).toHaveBeenCalledWith(
          expect.stringContaining(
            "https://api.openai.com/v1/realtime/calls"
          ),
          expect.objectContaining({
            method:
              "POST",

            headers:
              expect.objectContaining({
                Authorization:
                  "Bearer test-openai-key",
              }),
          })
        );

        await expect(
          response.text()
        ).resolves.toContain(
          "v=0"
        );
      }
    );
    it(
  "returns 429 and does not call the realtime provider when the authenticated user exceeds the limit",
  async () => {
    mockedAuthenticateApiRequest
      .mockResolvedValue({
        success:
          true,

        token:
          "user-access-token",

        user: {
          id:
            "user-123",
        },

        client: {},
      });

    mockedConsumePersistentApiRateLimit
      .mockResolvedValue({
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
        createRequest(
          "Bearer user-access-token"
        )
      );

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
        "voice-realtime:user:user-123",

      policy: {
        limit:
          10,

        windowMs:
          60_000,
      },
    });

    expect(
      mockedFetch
    ).not.toHaveBeenCalled();

    const body =
      await response.json();

    expect(
      body
    ).toEqual({
      error:
        "Too many realtime voice requests. Please try again shortly.",

      requestId:
        "req_voice_realtime_test",
    });
  }
);
  }
);