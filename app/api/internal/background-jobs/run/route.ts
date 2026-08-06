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
  logApiInfo,
  logApiWarning,
  startApiTimer,
} from "@/lib/api/api-logger";

import {
  createBackgroundJobRuntime,
} from "@/lib/jobs/background-job-runtime";

export const runtime =
  "nodejs";

type BackgroundJobRunRequest = {
  maximumJobs?:
    unknown;
};

function secretsMatch(
  providedSecret:
    string,
  expectedSecret:
    string
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

function getRequestedMaximumJobs(
  value:
    unknown
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(
      value
    ) ||
    value <= 0
  ) {
    return 5;
  }

  return Math.min(
    value,
    10
  );
}

export async function POST(
  request:
    NextRequest
) {
    const requestId =
    createApiRequestId();

  const timer =
    startApiTimer();

  try {
    const expectedSecret =
      process.env
        .JOB_RUNNER_SECRET;

    if (!expectedSecret) {
      throw new Error(
        "JOB_RUNNER_SECRET is not configured."
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
        "background_jobs_runner.unauthorized",
        {
          route:
            "/api/internal/background-jobs/run",

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

    const body =
      (await request
        .json()
        .catch(
          () => ({})
        )) as
        BackgroundJobRunRequest;

    const maximumJobs =
      getRequestedMaximumJobs(
        body.maximumJobs
      );

    const runtimeInstance =
      createBackgroundJobRuntime();

        const result =
      await runtimeInstance
        .runner
        .runBatch(
          maximumJobs
        );

    logApiInfo(
      "background_jobs_runner.completed",
      {
        route:
          "/api/internal/background-jobs/run",

        requestId,

        maximumJobs,

        processedJobs:
          result.processedJobs,

        recoveredRetrying:
          result.recoveredRetrying,

        recoveredFailed:
          result.recoveredFailed,

        reachedLimit:
          result.reachedLimit,

        queueWasEmpty:
          result.queueWasEmpty,

        durationMs:
          timer.elapsedMs(),
      }
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
      "background_jobs_runner.request_failed",
      error,
      {
        route:
          "/api/internal/background-jobs/run",

               requestId,

        durationMs:
          timer.elapsedMs(),
      }
    );

    return NextResponse.json(
      {
        error:
          "Could not run background jobs.",

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