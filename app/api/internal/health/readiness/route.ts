import {
  NextResponse,
} from "next/server";

import {
  classifyApiDuration,
  createApiRequestId,
  logApiError,
  logApiInfo,
  logApiWarning,
  startApiTimer,
} from "@/lib/api/api-logger";

import {
  getSupabaseAdminClient,
} from "@/lib/supabase-admin";

import {
  timingSafeEqual,
} from "node:crypto";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

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

type DependencyHealthStatus =
  | "healthy"
  | "unhealthy";

type QueueHealthStatus =
  | DependencyHealthStatus
  | "degraded";

type OverallHealthStatus =
  | "healthy"
  | "degraded"
  | "unhealthy";

type ServiceHealthCheck<
  TStatus extends string,
> = {
  status:
    TStatus;

  durationMs:
    number;
};

type QueueHealthCheck =
  ServiceHealthCheck<
    QueueHealthStatus
  > & {
    diagnostics: {
      waitingTooLongCount:
        number;

      staleRunningCount:
        number;
    };
  };

async function checkDatabase(
  requestId:
    string
):
  Promise<
    ServiceHealthCheck<
      DependencyHealthStatus
    >
  > {
  const timer =
    startApiTimer();

  try {
    const client =
      getSupabaseAdminClient();

    const {
      error,
    } =
      await client
        .from(
          "profiles"
        )
        .select(
          "id"
        )
        .limit(
          1
        );

    if (error) {
      const durationMs =
        timer.elapsedMs();

      logApiError(
        "health_check.database_query_failed",
        new Error(
          error.message ||
            "Database health query failed."
        ),
        {
          route:
            "/api/health",

          requestId,

          supabaseErrorCode:
            error.code,

          durationMs,
        }
      );

      return {
        status:
          "unhealthy",

        durationMs,
      };
    }

    return {
      status:
        "healthy",

      durationMs:
        timer.elapsedMs(),
    };
  } catch (error) {
    const durationMs =
      timer.elapsedMs();

    logApiError(
      "health_check.database_failed",
      error,
      {
        route:
          "/api/health",

        requestId,

        durationMs,
      }
    );

    return {
      status:
        "unhealthy",

      durationMs,
    };
  }
}

async function checkBackgroundJobsQueue(
  requestId:
    string
):
  Promise<QueueHealthCheck> {
  const timer =
    startApiTimer();

  const now =
    Date.now();

  const waitingCutoff =
    new Date(
      now -
      10 * 60 * 1000
    ).toISOString();

  const staleRunningCutoff =
    new Date(
      now -
      30 * 60 * 1000
    ).toISOString();

  try {
    const client =
      getSupabaseAdminClient();

    const [
      waitingResult,
      staleRunningResult,
    ] =
      await Promise.all([
        client
          .from(
            "background_jobs"
          )
          .select(
            "id",
            {
              count:
                "exact",

              head:
                true,
            }
          )
          .in(
            "status",
            [
              "pending",
              "retrying",
            ]
          )
          .lte(
            "available_at",
            waitingCutoff
          ),

        client
          .from(
            "background_jobs"
          )
          .select(
            "id",
            {
              count:
                "exact",

              head:
                true,
            }
          )
          .eq(
            "status",
            "running"
          )
          .is(
            "finished_at",
            null
          )
          .not(
            "started_at",
            "is",
            null
          )
          .lte(
            "started_at",
            staleRunningCutoff
          ),
      ]);

    if (
      waitingResult.error ||
      staleRunningResult.error
    ) {
      const error =
        waitingResult.error ??
        staleRunningResult.error ??
        new Error(
          "Background queue health query failed."
        );

      logApiError(
        "health_check.queue_query_failed",
        new Error(
          error.message ||
            "Background queue health query failed."
        ),
        {
          route:
            "/api/health",

          requestId,

          supabaseErrorCode:
            waitingResult.error?.code ??
            staleRunningResult.error?.code,

          waitingQueryFailed:
            Boolean(
              waitingResult.error
            ),

          staleRunningQueryFailed:
            Boolean(
              staleRunningResult.error
            ),

          durationMs:
            timer.elapsedMs(),
        }
      );

      return {
        status:
          "unhealthy",

        durationMs:
          timer.elapsedMs(),

        diagnostics: {
          waitingTooLongCount:
            0,

          staleRunningCount:
            0,
        },
      };
    }

    const waitingTooLongCount =
      waitingResult.count ??
      0;

    const staleRunningCount =
      staleRunningResult.count ??
      0;

    const isDegraded =
      waitingTooLongCount > 0 ||
      staleRunningCount > 0;

    return {
      status:
        isDegraded
          ? "degraded"
          : "healthy",

      durationMs:
        timer.elapsedMs(),

      diagnostics: {
        waitingTooLongCount,
        staleRunningCount,
      },
    };
  } catch (error) {
    const durationMs =
      timer.elapsedMs();

    logApiError(
      "health_check.queue_failed",
      error,
      {
        route:
          "/api/health",

        requestId,

        durationMs,
      }
    );

    return {
      status:
        "unhealthy",

      durationMs,

      diagnostics: {
        waitingTooLongCount:
          0,

        staleRunningCount:
          0,
      },
    };
  }
}

export async function GET(
  request:
    Request
) {
  const requestId =
    createApiRequestId();

  const expectedSecret =
  process.env
    .HEALTH_READINESS_SECRET;

if (!expectedSecret) {
  return NextResponse.json(
    {
      error:
        "Health readiness is not configured.",

      requestId,
    },
    {
      status:
        503,

      headers: {
        "cache-control":
          "no-store",

        "x-request-id":
          requestId,
      },
    }
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
        "cache-control":
          "no-store",

        "x-request-id":
          requestId,
      },
    }
  );
}

  const timer =
    startApiTimer();

  const [
    database,
    queue,
  ] =
    await Promise.all([
      checkDatabase(
        requestId
      ),
      checkBackgroundJobsQueue(
        requestId
      ),
    ]);

  let status:
    OverallHealthStatus;

  if (
    database.status ===
      "unhealthy" ||
    queue.status ===
      "unhealthy"
  ) {
    status =
      "unhealthy";
  } else if (
    queue.status ===
      "degraded"
  ) {
    status =
      "degraded";
  } else {
    status =
      "healthy";
  }

  const durationMs =
    timer.elapsedMs();

  const performance =
    classifyApiDuration(
      durationMs,
      {
        slowMs:
          250,

        verySlowMs:
          750,

        criticalMs:
          2000,
      }
    );

  const logDetails = {
    route:
      "/api/health",

    requestId,

    status,

    database:
      database.status,

    databaseDurationMs:
      database.durationMs,

    queue:
      queue.status,

    queueDurationMs:
      queue.durationMs,

    waitingTooLongCount:
      queue
        .diagnostics
        .waitingTooLongCount,

    staleRunningCount:
      queue
        .diagnostics
        .staleRunningCount,

    durationMs,

    performance,
  };

  if (
    status ===
    "healthy"
  ) {
    logApiInfo(
      "health_check.completed",
      logDetails
    );
  } else {
    logApiWarning(
      status ===
        "degraded"
        ? "health_check.degraded"
        : "health_check.unhealthy",
      logDetails
    );
  }

  return NextResponse.json(
    {
      status,

      checks: {
        database,

        queue: {
          status:
            queue.status,

          durationMs:
            queue.durationMs,
        },
      },

      environment:
        process.env.VERCEL_ENV ??
        process.env.NODE_ENV ??
        "unknown",

      timestamp:
        new Date().toISOString(),

      durationMs,

      performance,

      requestId,
    },
    {
      status:
        status ===
          "unhealthy"
          ? 503
          : 200,

      headers: {
        "cache-control":
          "no-store",

        "x-request-id":
          requestId,
      },
    }
  );
}