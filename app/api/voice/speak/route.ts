import {
  NextResponse,
} from "next/server";

import {
  authenticateApiRequest,
} from "@/lib/api/api-auth";

import {
  resolveApiRateLimitIdentity,
} from "@/lib/api/api-rate-limit-identity";

import {
  consumePersistentApiRateLimit,
} from "@/lib/api/api-rate-limit";

import {
  createApiRequestId,
  logApiError,
  logApiInfo,
  startApiTimer,
} from "@/lib/api/api-logger";

import {
  getSupabaseAdminClient,
} from "@/lib/supabase-admin";

import {
  synthesizeVoice,
  type VoiceSynthesisLanguage,
} from "@/lib/voice/voice-synthesis.service";

const SYNTHESIS_TIMEOUT_MS =
  45_000;

const MAX_SYNTHESIS_TEXT_LENGTH =
  4000;

const VOICE_SYNTHESIS_RATE_LIMIT = {
  limit:
    20,

  windowMs:
    60_000,
} as const;

type VoiceSynthesisRequestBody = {
  text?:
    unknown;

  language?:
    unknown;
};

export async function POST(
  request:
    Request
) {
  const requestId =
    createApiRequestId();

  const timer =
    startApiTimer();

  try {
    const authorizationHeader =
      request.headers.get(
        "authorization"
      );

    let authenticated =
      false;

    let authenticatedUserId:
      string | null =
        null;

    if (
      authorizationHeader
        ?.startsWith(
          "Bearer "
        )
    ) {
      const authentication =
        await authenticateApiRequest(
          request
        );

      if (
        !authentication.success
      ) {
        return NextResponse.json(
          {
            error:
              authentication.error,

            requestId,
          },
          {
            status:
              authentication.status,

            headers: {
              "x-request-id":
                requestId,
            },
          }
        );
      }

      authenticated =
        true;

      authenticatedUserId =
        authentication.user.id;
    }

    let body:
      VoiceSynthesisRequestBody;

    try {
      body =
        (await request.json()) as
          VoiceSynthesisRequestBody;
    } catch {
      return NextResponse.json(
        {
          error:
            "A valid JSON voice synthesis request is required.",

          requestId,
        },
        {
          status:
            400,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    const requestedText =
      typeof body.text ===
      "string"
        ? body.text.trim()
        : "";

    if (
      !requestedText
    ) {
      return NextResponse.json(
        {
          error:
            "Text is required.",

          requestId,
        },
        {
          status:
            400,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    if (
      requestedText.length >
      MAX_SYNTHESIS_TEXT_LENGTH
    ) {
      return NextResponse.json(
        {
          error:
            `Text must not exceed ${MAX_SYNTHESIS_TEXT_LENGTH} characters.`,

          requestId,
        },
        {
          status:
            413,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    const rateLimitIdentity =
      resolveApiRateLimitIdentity({
        request,

        userId:
          authenticatedUserId,
      });

    const rateLimitClient =
      getSupabaseAdminClient();

    const rateLimit =
      await consumePersistentApiRateLimit({
        client:
          rateLimitClient,

        key:
          `voice-synthesis:${rateLimitIdentity.type}:${rateLimitIdentity.value}`,

        policy:
          VOICE_SYNTHESIS_RATE_LIMIT,
      });

    if (
      !rateLimit.allowed
    ) {
      return NextResponse.json(
        {
          error:
            "Too many voice synthesis requests. Please try again shortly.",

          requestId,
        },
        {
          status:
            429,

          headers: {
            "x-request-id":
              requestId,

            "retry-after":
              String(
                rateLimit.retryAfterSeconds
              ),

            "x-ratelimit-limit":
              String(
                rateLimit.limit
              ),

            "x-ratelimit-remaining":
              String(
                rateLimit.remaining
              ),
          },
        }
      );
    }

    const language:
      VoiceSynthesisLanguage =
        body.language ===
        "ar"
          ? "ar"
          : "en";

    if (
      !process.env
        .OPENAI_API_KEY
        ?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Voice synthesis is not configured.",

          requestId,
        },
        {
          status:
            503,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => {
          controller.abort();
        },
        SYNTHESIS_TIMEOUT_MS
      );

    try {
      const synthesis =
        await synthesizeVoice({
          text:
            requestedText,

          language,

          signal:
            controller.signal,
        });

      logApiInfo(
        "voice_synthesis.completed",
        {
          route:
            "/api/voice/speak",

          requestId,

          authenticated,

          language,

          textLength:
            requestedText.length,

          durationMs:
            timer.elapsedMs(),

          model:
            synthesis.model,

          voice:
            synthesis.voice,

          audioBytes:
            synthesis.audio.byteLength,
        }
      );

      return new Response(
        synthesis.audio,
        {
          status:
            200,

          headers: {
            "Content-Type":
              synthesis.contentType,

            "Content-Length":
              String(
                synthesis.audio.byteLength
              ),

            "Cache-Control":
              "no-store",

            "x-request-id":
              requestId,
          },
        }
      );
    } finally {
      clearTimeout(
        timeout
      );
    }
  } catch (
    error
  ) {
    const isTimeout =
      error instanceof
        DOMException &&
      error.name ===
        "AbortError";

    logApiError(
      "voice_synthesis.request_failed",
      error,
      {
        route:
          "/api/voice/speak",

        requestId,

        timeout:
          isTimeout,

        durationMs:
          timer.elapsedMs(),
      }
    );

    return NextResponse.json(
      {
        error:
          isTimeout
            ? "Voice synthesis timed out."
            : "Could not synthesize the voice response.",

        requestId,
      },
      {
        status:
          isTimeout
            ? 504
            : 500,

        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  }
}