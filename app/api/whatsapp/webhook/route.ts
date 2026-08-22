import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createApiRequestId,
  logApiInfo,
} from "@/lib/api/api-logger";

export const runtime =
  "nodejs";

function getWebhookVerifyToken():
  string {
  const token =
    process.env
      .WHATSAPP_WEBHOOK_VERIFY_TOKEN
      ?.trim();

  if (!token) {
    throw new Error(
      "WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured."
    );
  }

  return token;
}

function getWhatsAppAppSecret():
  string {
  const secret =
    process.env
      .WHATSAPP_APP_SECRET
      ?.trim();

  if (!secret) {
    throw new Error(
      "WHATSAPP_APP_SECRET is not configured."
    );
  }

  return secret;
}

function safeTextEqual(
  left:
    string,
  right:
    string
): boolean {
  const leftBuffer =
    Buffer.from(
      left,
      "utf8"
    );

  const rightBuffer =
    Buffer.from(
      right,
      "utf8"
    );

  if (
    leftBuffer.length !==
      rightBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    leftBuffer,
    rightBuffer
  );
}

function verifyWebhookSignature({
  rawBody,
  signature,
  appSecret,
}: {
  rawBody:
    string;

  signature:
    string | null;

  appSecret:
    string;
}): boolean {
  if (
    !signature ||
    !signature.startsWith(
      "sha256="
    )
  ) {
    return false;
  }

  const digest =
    createHmac(
      "sha256",
      appSecret
    )
      .update(
        rawBody,
        "utf8"
      )
      .digest(
        "hex"
      );

  const expectedSignature =
    `sha256=${digest}`;

  return safeTextEqual(
    signature,
    expectedSignature
  );
}

export async function GET(
  request:
    NextRequest
) {
  const requestId =
    createApiRequestId();
  const mode =
    request.nextUrl.searchParams.get(
      "hub.mode"
    );

  const verifyToken =
    request.nextUrl.searchParams.get(
      "hub.verify_token"
    );

  const challenge =
    request.nextUrl.searchParams.get(
      "hub.challenge"
    );

  if (
    mode !==
      "subscribe" ||
    !verifyToken ||
    !challenge
  ) {
    return NextResponse.json(
      {
        success:
          false,

        error:
          "Invalid webhook verification request.",
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

  let expectedVerifyToken:
    string;

  try {
    expectedVerifyToken =
      getWebhookVerifyToken();
  } catch {
    return NextResponse.json(
      {
        success:
          false,

        error:
          "WhatsApp webhook verification is not configured.",
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

  if (
    !safeTextEqual(
      verifyToken,
      expectedVerifyToken
    )
  ) {
    return NextResponse.json(
      {
        success:
          false,

        error:
          "Webhook verification failed.",
      },
      {
        status:
          403,

        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  }

  logApiInfo(
    "whatsapp_webhook.verified",
    {
      route:
        "/api/whatsapp/webhook",

      requestId,
    }
  );

  return new NextResponse(
    challenge,
    {
      status:
        200,

      headers: {
        "Content-Type":
          "text/plain",

        "x-request-id":
          requestId,
      },
    }
  );
}

export async function POST(
  request:
    NextRequest
) {
  const requestId =
    createApiRequestId();
  let appSecret:
    string;

  try {
    appSecret =
      getWhatsAppAppSecret();
  } catch {
    return NextResponse.json(
      {
        success:
          false,

        error:
          "WhatsApp webhook signature verification is not configured.",
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

  let rawBody:
    string;

  try {
    rawBody =
      await request.text();
  } catch {
    return NextResponse.json(
      {
        success:
          false,

        error:
          "Could not read webhook payload.",
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

  const signature =
    request.headers.get(
      "x-hub-signature-256"
    );

  if (
    !verifyWebhookSignature({
      rawBody,
      signature,
      appSecret,
    })
  ) {
    return NextResponse.json(
      {
        success:
          false,

        error:
          "Webhook signature verification failed.",
      },
      {
        status:
          401,

        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  }

  let payload:
    unknown;

  try {
    payload =
      JSON.parse(
        rawBody
      ) as unknown;
  } catch {
    return NextResponse.json(
      {
        success:
          false,

        error:
          "Invalid webhook payload.",
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

  /*
   * Meta webhook authenticity has been verified
   * before the JSON payload is processed.
   *
   * Do not log the raw payload because it may
   * contain phone numbers, message content,
   * provider identifiers, or other user data.
   *
   * Delivery-status persistence and inbound
   * message processing remain separate future
   * integration steps.
   */
  logApiInfo(
    "whatsapp_webhook.received",
    {
      route:
        "/api/whatsapp/webhook",

      requestId,

      signatureVerified:
        true,

      payloadReceived:
        payload !== null,
    }
  );

  return NextResponse.json(
    {
      success:
        true,
    },
    {
      status:
        200,

        headers: {
          "x-request-id":
            requestId,
        },
    }
  );
}