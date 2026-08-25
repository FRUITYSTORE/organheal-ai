import {
  NextResponse,
} from "next/server";

import {
  createApiRequestId,
} from "@/lib/api/api-logger";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export async function GET() {
  const requestId =
    createApiRequestId();

  return NextResponse.json(
    {
      status:
        "healthy",

      service:
        "organheal",

      timestamp:
        new Date().toISOString(),

      requestId,
    },
    {
      status:
        200,

      headers: {
        "cache-control":
          "no-store",

        "x-request-id":
          requestId,
      },
    }
  );
}