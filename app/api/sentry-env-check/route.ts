import * as Sentry from "@sentry/nextjs";

import "@/sentry.server.config";

import {
  NextResponse,
} from "next/server";

export const runtime =
  "nodejs";

export async function GET() {
  const eventId =
    Sentry.captureException(
      new Error(
        "OrganHeal Vercel Sentry production verification"
      )
    );

  const flushed =
    await Sentry.flush(
      5000
    );

  return NextResponse.json(
    {
      sentryConfigured:
        Boolean(
          process.env.SENTRY_DSN
        ),

      nodeEnv:
        process.env.NODE_ENV ??
        null,

      vercelEnv:
        process.env.VERCEL_ENV ??
        null,

      eventCreated:
        Boolean(
          eventId
        ),

      flushed,
    },
    {
      headers: {
        "cache-control":
          "no-store",
      },
    }
  );
}