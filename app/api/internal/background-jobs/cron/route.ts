import {
  timingSafeEqual,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createApiRequestId,
  logApiError,
  logApiWarning,
} from "@/lib/api/api-logger";

import {
  createBackgroundJobRuntime,
} from "@/lib/jobs/background-job-runtime";

export const runtime =
  "nodejs";

const CRON_BATCH_SIZE =
  10;

function secretsMatch(
  providedSecret: string,
  expectedSecret: string
): boolean {
  const providedBuffer =
    Buffer.from(
      providedSecret
    );

  const expectedBuffer =
    Buffer.from(
      expectedSecret
    );

  if (
    providedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    providedBuffer,
    expectedBuffer
  );
}

export async function GET(
  request: NextRequest
) {
  const requestId =
    createApiRequestId();

  try {
    const expectedSecret =
      process.env
        .CRON_SECRET;

    if (!expectedSecret) {
      throw new Error(
        "CRON_SECRET is not configured."
      );
    }

    const authorizationHeader =
      request.headers.get(
        "authorization"
      ) ?? "";

    const providedSecret =
      authorizationHeader.startsWith(
        "Bearer "
      )
        ? authorizationHeader
            .slice(
              "Bearer ".length
            )
            .trim()
        : "";

    if (
      !providedSecret ||
      !secretsMatch(
        providedSecret,
        expectedSecret
      )
    ) {
      logApiWarning(
        "background_jobs_cron.unauthorized",
        {
          route:
            "/api/internal/background-jobs/cron",

          requestId,
        }
      );

      return NextResponse.json(
        {
          error:
            "Unauthorized.",

          requestId,
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

    const runtimeInstance =
      createBackgroundJobRuntime();

    const result =
      await runtimeInstance
        .runner
        .runBatch(
          CRON_BATCH_SIZE
        );

    return NextResponse.json(
      {
        success:
          true,

        processedJobs:
          result.processedJobs,

        reachedLimit:
          result.reachedLimit,

        queueWasEmpty:
          result.queueWasEmpty,

        requestId,
      },
      {
        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  } catch (error) {
    logApiError(
      "background_jobs_cron.request_failed",
      error,
      {
        route:
          "/api/internal/background-jobs/cron",

        requestId,
      }
    );

    return NextResponse.json(
      {
        error:
          "Could not run scheduled background jobs.",

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