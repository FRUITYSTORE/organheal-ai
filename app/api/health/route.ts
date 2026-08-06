import {
  NextResponse,
} from "next/server";

import {
  classifyApiDuration,
  createApiRequestId,
  logApiInfo,
  logApiWarning,
  startApiTimer,
} from "@/lib/api/api-logger";

import {
  getSupabaseAdminClient,
} from "@/lib/supabase-admin";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

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

async function checkDatabase():
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

    return {
      status:
        error
          ? "unhealthy"
          : "healthy",

      durationMs:
        timer.elapsedMs(),
    };
  } catch {
    return {
      status:
        "unhealthy",

      durationMs:
        timer.elapsedMs(),
    };
  }
}

async function checkBackgroundJobsQueue():
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
  } catch {
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
}

export async function GET() {
  const requestId =
    createApiRequestId();

  const timer =
    startApiTimer();

  const [
    database,
    queue,
  ] =
    await Promise.all([
      checkDatabase(),
      checkBackgroundJobsQueue(),
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