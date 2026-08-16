import {
  NextResponse,
} from "next/server";

import {
  createApiRequestId,
  logApiError,
  logApiInfo,
  startApiTimer,
} from "@/lib/api/api-logger";

const OPENAI_REALTIME_MODEL =
  "gpt-realtime-1.5";

const OPENAI_REALTIME_CALL_URL =
  `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(
    OPENAI_REALTIME_MODEL
  )}`;

const REALTIME_MODEL =
  process.env
    .OPENAI_REALTIME_MODEL
    ?.trim() ||
  "gpt-realtime";

function getOpenAIApiKey():
  string {
  const apiKey =
    process.env
      .OPENAI_API_KEY
      ?.trim();

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured."
    );
  }

  return apiKey;
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
    const apiKey =
      getOpenAIApiKey();

    const body =
      await request
        .json()
        .catch(
          () =>
            null
        );

    const sdp =
  typeof body?.sdp ===
    "string"
    ? body.sdp
    : "";

    const microphoneType =
      body?.microphoneType ===
        "near_field"
        ? "near_field"
        : "far_field";

    if (!sdp.trim()) {
      return NextResponse.json(
        {
          error:
            "A WebRTC SDP offer is required.",

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
  process.env.NODE_ENV ===
  "development"
) {
  console.log(
    "[VOICE ROUTE SDP RECEIVED]",
    {
      length:
        sdp.length,

      startsWithV0:
        sdp.startsWith(
          "v=0"
        ),

      hasAudio:
        sdp.includes(
          "m=audio"
        ),

      hasDataChannel:
        sdp.includes(
          "m=application"
        ),

      firstCharacters:
        JSON.stringify(
          sdp.slice(
            0,
            40
          )
        ),
    }
  );
}
   const formData =
  new FormData();

formData.append(
  "sdp",
  sdp
);
formData.append(
  "session",
  new Blob(
    [
      JSON.stringify({
        type:
          "realtime",

        model:
          OPENAI_REALTIME_MODEL,

        audio: {
          input: {
            noise_reduction: {
              type:
                microphoneType,
            },

            transcription: {
              model:
                "gpt-4o-transcribe",

              prompt:
                "Accurately transcribe the user's speech. The speaker may use English, Arabic, or a mixture of both. Preserve medical terms, medication names, laboratory names, abbreviations, and numbers.",
            },

            turn_detection: {
              type:
                "server_vad",

              threshold:
                0.5,

              prefix_padding_ms:
                300,

              silence_duration_ms:
                700,
            },
          },
        },
      }),
    ],
    {
      type:
        "application/json",
    }
  )
);
if (
  process.env.NODE_ENV ===
  "development"
) {
  const forwardedSdp =
    formData.get(
      "sdp"
    );

  console.log(
    "[VOICE FORWARDED SDP]",
    {
      type:
        typeof forwardedSdp,

      length:
        typeof forwardedSdp ===
        "string"
          ? forwardedSdp.length
          : null,

      startsWithV0:
        typeof forwardedSdp ===
          "string" &&
        forwardedSdp.startsWith(
          "v=0"
        ),
    }
  );
}
    const response =
      await fetch(
        OPENAI_REALTIME_CALL_URL,
        {
          method:
            "POST",

          headers: {
  Authorization:
    `Bearer ${apiKey}`,
},

body:
  formData,
        }
      );

    const responseText =
      await response.text();

    if (!response.ok) {
  const providerError =
    responseText
      .slice(
        0,
        4000
      );

  logApiError(
    "voice_realtime.session_failed",
    new Error(
      `Realtime provider returned status ${response.status}.`
    ),
    {
      route:
        "/api/voice/realtime",

      requestId,

      providerStatus:
        response.status,

      providerError:
        process.env.NODE_ENV ===
          "development"
          ? providerError
          : undefined,

      durationMs:
        timer.elapsedMs(),
    }
  );
      return NextResponse.json(
        {
          error:
            "Could not establish the realtime voice session.",

          requestId,
        },
        {
          status:
            502,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    logApiInfo(
      "voice_realtime.session_created",
      {
        route:
          "/api/voice/realtime",

        requestId,

        microphoneType,

        durationMs:
          timer.elapsedMs(),
      }
    );

    return new Response(
      responseText,
      {
        status:
          201,

        headers: {
          "Content-Type":
            "application/sdp",

          "x-request-id":
            requestId,
        },
      }
    );
  } catch (
    error
  ) {
    logApiError(
      "voice_realtime.request_failed",
      error,
      {
        route:
          "/api/voice/realtime",

        requestId,

        durationMs:
          timer.elapsedMs(),
      }
    );

    return NextResponse.json(
      {
        error:
          "Could not initialize realtime voice.",

        requestId,
      },
      {
        status:
          500,

        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  }
}