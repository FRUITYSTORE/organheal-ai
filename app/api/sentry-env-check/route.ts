import {
  NextResponse,
} from "next/server";

export const runtime =
  "nodejs";

export async function GET() {
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
    },
    {
      headers: {
        "cache-control":
          "no-store",
      },
    }
  );
}
