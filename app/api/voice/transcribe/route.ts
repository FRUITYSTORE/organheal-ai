import {
  NextResponse,
} from "next/server";

import {
  authenticateApiRequest,
} from "@/lib/api/api-auth";

import {
  createApiRequestId,
  logApiError,
  logApiInfo,
  startApiTimer,
} from "@/lib/api/api-logger";

import {
  transcribeVoice,
  type VoiceTranscriptionLanguage,
} from "@/lib/voice/voice-transcription.service";

const MAX_AUDIO_BYTES =
  12 *
  1024 *
  1024;

const TRANSCRIPTION_TIMEOUT_MS =
  45_000;

const ALLOWED_AUDIO_TYPES =
  new Set([
    "audio/webm",
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/mpeg",
    "audio/mp3",
    "audio/ogg",
    "audio/ogg;codecs=opus",
    "audio/wav",
    "audio/x-wav",
  ]);

function normalizeAudioType(
  value:
    string
): string {
  return value
    .toLowerCase()
    .trim();
}

function isAllowedAudioFile(
  file:
    File
): boolean {
  const mimeType =
    normalizeAudioType(
      file.type
    );

  if (!mimeType) {
    return true;
  }

  return (
    ALLOWED_AUDIO_TYPES.has(
      mimeType
    ) ||
    mimeType.startsWith(
      "audio/webm;"
    ) ||
    mimeType.startsWith(
      "audio/ogg;"
    )
  );
}

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
    }

    let formData:
      FormData;

    try {
      formData =
        await request.formData();
    } catch {
      return NextResponse.json(
        {
          error:
            "A valid multipart audio request is required.",

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

    const audio =
      formData.get(
        "audio"
      );

    const requestedLanguage =
      formData.get(
        "language"
      );

    if (
      !(audio instanceof File)
    ) {
      return NextResponse.json(
        {
          error:
            "An audio file is required.",

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
      audio.size <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "The audio recording is empty.",

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
      audio.size >
      MAX_AUDIO_BYTES
    ) {
      return NextResponse.json(
        {
          error:
            "The audio recording is too large.",

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

    if (
      !isAllowedAudioFile(
        audio
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Unsupported audio format.",

          requestId,
        },
        {
          status:
            415,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    const language:
      VoiceTranscriptionLanguage =
        requestedLanguage ===
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
            "Voice transcription is not configured.",

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
        TRANSCRIPTION_TIMEOUT_MS
      );

    try {
      const transcription =
        await transcribeVoice({
          audio,

          language,

          signal:
            controller.signal,
        });

      logApiInfo(
        "voice_transcription.completed",
        {
          route:
            "/api/voice/transcribe",

          requestId,

          authenticated,

          language,

          audioBytes:
            audio.size,

          durationMs:
            timer.elapsedMs(),

          model:
            transcription.model,
        }
      );

      return NextResponse.json(
        {
          success:
            true,

          transcript:
            transcription.transcript,

          language,

          requestId,
        },
        {
          headers: {
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
      "voice_transcription.request_failed",
      error,
      {
        route:
          "/api/voice/transcribe",

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
            ? "Voice transcription timed out."
            : "Could not transcribe the audio recording.",

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