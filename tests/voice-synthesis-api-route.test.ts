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
  mockedResolveApiRateLimitIdentity,
  mockedGetSupabaseAdminClient,
  mockedCreateApiRequestId,
  mockedLogApiError,
  mockedLogApiInfo,
  mockedStartApiTimer,
  mockedSynthesizeVoice,
} = vi.hoisted(
  () => ({
    mockedAuthenticateApiRequest:
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

    mockedLogApiInfo:
      vi.fn(),

    mockedStartApiTimer:
      vi.fn(),

    mockedSynthesizeVoice:
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

vi.mock(
  "@/lib/voice/voice-synthesis.service",
  () => ({
    synthesizeVoice:
      mockedSynthesizeVoice,
  })
);

import {
  POST,
} from "@/app/api/voice/speak/route";

const ORIGINAL_ENV =
  process.env;

function createJsonRequest(
  body:
    unknown,
  authorization?:
    string
): Request {
  return new Request(
    "http://localhost/api/voice/speak",
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
        JSON.stringify(
          body
        ),
    }
  );
}

describe(
  "POST /api/voice/speak",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      process.env = {
        ...ORIGINAL_ENV,

        OPENAI_API_KEY:
          "test-api-key",
      };

      mockedCreateApiRequestId
        .mockReturnValue(
          "req_voice_test"
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

      mockedResolveApiRateLimitIdentity
        .mockReturnValue({
           type:
          "anonymous",

          value:
         "unknown",
        });

mockedConsumePersistentApiRateLimit
  .mockResolvedValue({
    allowed:
      true,

    limit:
      20,

    remaining:
      19,

    resetAt:
      Date.now() +
      60_000,

    retryAfterSeconds:
      0,
  });

      mockedSynthesizeVoice
        .mockResolvedValue({
          audio:
            new Uint8Array([
              1,
              2,
              3,
            ]).buffer,

          model:
            "gpt-4o-mini-tts",

          voice:
            "alloy",

          contentType:
            "audio/mpeg",
        });
    });

    afterEach(() => {
      process.env =
        ORIGINAL_ENV;
    });

    it(
      "rejects invalid JSON",
      async () => {
        const request =
          new Request(
            "http://localhost/api/voice/speak",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                "{invalid-json",
            }
          );

        const response =
          await POST(
            request
          );

        const body =
          await response.json();

        expect(
          response.status
        ).toBe(400);

        expect(body).toEqual({
          error:
            "A valid JSON voice synthesis request is required.",

          requestId:
            "req_voice_test",
        });

        expect(
          response.headers.get(
            "x-request-id"
          )
        ).toBe(
          "req_voice_test"
        );

        expect(
          mockedSynthesizeVoice
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects missing text",
      async () => {
        const response =
          await POST(
            createJsonRequest({
              language:
                "en",
            })
          );

        const body =
          await response.json();

        expect(
          response.status
        ).toBe(400);

        expect(body.error).toBe(
          "Text is required."
        );

        expect(
          mockedSynthesizeVoice
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects text longer than the supported limit",
      async () => {
        const response =
          await POST(
            createJsonRequest({
              text:
                "a".repeat(
                  4001
                ),

              language:
                "en",
            })
          );

        const body =
          await response.json();

        expect(
          response.status
        ).toBe(413);

        expect(body.error).toBe(
          "Text must not exceed 4000 characters."
        );

        expect(
          mockedSynthesizeVoice
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns unavailable when voice synthesis is not configured",
      async () => {
        delete process.env
          .OPENAI_API_KEY;

        const response =
          await POST(
            createJsonRequest({
              text:
                "Hello",

              language:
                "en",
            })
          );

        const body =
          await response.json();

        expect(
          response.status
        ).toBe(503);

        expect(body.error).toBe(
          "Voice synthesis is not configured."
        );

        expect(
          mockedSynthesizeVoice
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns synthesized audio with the expected headers",
      async () => {
        const response =
          await POST(
            createJsonRequest({
              text:
                "Your health summary is ready.",

              language:
                "en",
            })
          );

        expect(
          response.status
        ).toBe(200);

        expect(
          response.headers.get(
            "content-type"
          )
        ).toBe(
          "audio/mpeg"
        );

        expect(
          response.headers.get(
            "content-length"
          )
        ).toBe("3");

        expect(
          response.headers.get(
            "cache-control"
          )
        ).toBe(
          "no-store"
        );

        expect(
          response.headers.get(
            "x-request-id"
          )
        ).toBe(
          "req_voice_test"
        );

        const audio =
          await response.arrayBuffer();

        expect(
          audio.byteLength
        ).toBe(3);

        expect(
          mockedSynthesizeVoice
        ).toHaveBeenCalledWith({
          text:
            "Your health summary is ready.",

          language:
            "en",

          signal:
            expect.any(
              AbortSignal
            ),
        });

        expect(
          mockedLogApiInfo
        ).toHaveBeenCalledWith(
          "voice_synthesis.completed",
          expect.objectContaining({
            route:
              "/api/voice/speak",

            requestId:
              "req_voice_test",

            authenticated:
              false,

            language:
              "en",

            textLength:
              29,

            model:
              "gpt-4o-mini-tts",

            voice:
              "alloy",

            audioBytes:
              3,
          })
        );
      }
    );

    it(
      "passes Arabic language to voice synthesis",
      async () => {
        const response =
          await POST(
            createJsonRequest({
              text:
                "مرحبا بك",

              language:
                "ar",
            })
          );

        expect(
          response.status
        ).toBe(200);

        expect(
          mockedSynthesizeVoice
        ).toHaveBeenCalledWith({
          text:
            "مرحبا بك",

          language:
            "ar",

          signal:
            expect.any(
              AbortSignal
            ),
        });
      }
    );

    it(
      "authenticates a supplied bearer token",
      async () => {
        mockedAuthenticateApiRequest
          .mockResolvedValue({
            success:
              true,

            user: {
              id:
                "user-1",
            },

            client: {},
          });

        const response =
          await POST(
            createJsonRequest(
              {
                text:
                  "Hello",

                language:
                  "en",
              },
              "Bearer test-token"
            )
          );

        expect(
          response.status
        ).toBe(200);

        expect(
          mockedAuthenticateApiRequest
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          mockedLogApiInfo
        ).toHaveBeenCalledWith(
          "voice_synthesis.completed",
          expect.objectContaining({
            authenticated:
              true,
          })
        );
      }
    );

    it(
      "rejects an invalid supplied bearer token",
      async () => {
        mockedAuthenticateApiRequest
          .mockResolvedValue({
            success:
              false,

            error:
              "Unauthorized",

            status:
              401,
          });

        const response =
          await POST(
            createJsonRequest(
              {
                text:
                  "Hello",
              },
              "Bearer invalid-token"
            )
          );

        const body =
          await response.json();

        expect(
          response.status
        ).toBe(401);

        expect(body).toEqual({
          error:
            "Unauthorized",

          requestId:
            "req_voice_test",
        });

        expect(
          mockedSynthesizeVoice
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns a safe error when the synthesis provider fails",
      async () => {
        mockedSynthesizeVoice
          .mockRejectedValue(
            new Error(
              "Provider failure"
            )
          );

        const response =
          await POST(
            createJsonRequest({
              text:
                "Hello",

              language:
                "en",
            })
          );

        const body =
          await response.json();

        expect(
          response.status
        ).toBe(500);

        expect(body.error).toBe(
          "Could not synthesize the voice response."
        );

        expect(
          mockedLogApiError
        ).toHaveBeenCalledWith(
          "voice_synthesis.request_failed",
          expect.any(
            Error
          ),
          expect.objectContaining({
            route:
              "/api/voice/speak",

            requestId:
              "req_voice_test",

            timeout:
              false,
          })
        );
      }
    );

    it(
      "returns a timeout response when synthesis is aborted",
      async () => {
        mockedSynthesizeVoice
          .mockRejectedValue(
            new DOMException(
              "Aborted",
              "AbortError"
            )
          );

        const response =
          await POST(
            createJsonRequest({
              text:
                "Hello",

              language:
                "en",
            })
          );

        const body =
          await response.json();

        expect(
          response.status
        ).toBe(504);

        expect(body.error).toBe(
          "Voice synthesis timed out."
        );

        expect(
          mockedLogApiError
        ).toHaveBeenCalledWith(
          "voice_synthesis.request_failed",
          expect.any(
            DOMException
          ),
          expect.objectContaining({
            timeout:
              true,
          })
        );
      }
    );
  }
);