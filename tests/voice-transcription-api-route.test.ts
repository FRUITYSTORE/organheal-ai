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
  mockedGetSupabaseAdminClient,
  mockedCreateApiRequestId,
  mockedLogApiError,
  mockedLogApiInfo,
  mockedStartApiTimer,
  mockedTranscribeVoice,
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

    mockedTranscribeVoice:
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
  "@/lib/voice/voice-transcription.service",
  () => ({
    transcribeVoice:
      mockedTranscribeVoice,
  })
);

import {
  POST,
} from "@/app/api/voice/transcribe/route";

function createAudioRequest({
  authorization,
  forwardedFor,
}: {
  authorization?:
    string;

  forwardedFor?:
    string;
} = {}): Request {
  const formData =
    new FormData();

  formData.append(
    "audio",
    new File(
      [
        "test-audio",
      ],
      "voice.webm",
      {
        type:
          "audio/webm",
      }
    )
  );

  formData.append(
    "language",
    "en"
  );

  const headers:
    Record<string, string> = {};

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
    "http://localhost/api/voice/transcribe",
    {
      method:
        "POST",

      headers,

      body:
        formData,
    }
  );
}

describe(
  "POST /api/voice/transcribe",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks();

        process.env.OPENAI_API_KEY =
          "test-openai-key";

        mockedCreateApiRequestId
          .mockReturnValue(
            "req_voice_transcription_test"
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
      }
    );

    it(
      "returns 429 for an authenticated user when the transcription limit is exceeded",
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
              {} as never,
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
            createAudioRequest({
              authorization:
                "Bearer test-token",
            })
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
          "Too many voice transcription requests. Please try again shortly."
        );

        expect(
          mockedTranscribeVoice
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "uses anonymous IP identity and returns 429 before transcription",
      async () => {
        mockedResolveApiRateLimitIdentity
          .mockReturnValue({
            type:
              "ip",

            value:
              "203.0.113.10",
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
              20_000,

            retryAfterSeconds:
              20,
          });

        const response =
          await POST(
            createAudioRequest({
              forwardedFor:
                "203.0.113.10",
            })
          );

        expect(
          response.status
        ).toBe(
          429
        );

        expect(
          mockedResolveApiRateLimitIdentity
        ).toHaveBeenCalledWith({
          request:
            expect.any(
              Request
            ),

          userId:
            null,
        });

        expect(
          mockedConsumePersistentApiRateLimit
        ).toHaveBeenCalledWith({
          client:
            expect.anything(),

          key:
            "voice-transcribe:ip:203.0.113.10",

          policy: {
            limit:
              10,

            windowMs:
              60_000,
          },
        });

        expect(
          mockedAuthenticateApiRequest
        ).not.toHaveBeenCalled();

        expect(
          mockedTranscribeVoice
        ).not.toHaveBeenCalled();
      }
    );
  }
);