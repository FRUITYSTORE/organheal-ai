import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  startApiTimer,
} from "@/lib/api/api-logger";

import {
  getSupabaseAdminClient,
} from "@/lib/supabase-admin";

export type BackgroundJobQueueMetrics = {
  pending:
    number;

  running:
    number;

  retrying:
    number;

  failed:
    number;

  waitingTooLong:
    number;

  staleRunning:
    number;

  durationMs:
    number;

  generatedAt:
    string;
};

type CountQueryResult = {
  count:
    number | null;

  error:
    {
      message:
        string;
    } | null;
};

const WAITING_TOO_LONG_MINUTES =
  10;

const STALE_RUNNING_MINUTES =
  30;

function requireCount(
  result:
    CountQueryResult,
  metricName:
    string
): number {
  if (result.error) {
    throw new Error(
      `Could not collect ${metricName} background-job metric.`
    );
  }

  return result.count ?? 0;
}

export async function getBackgroundJobQueueMetrics(
  client:
    SupabaseClient =
      getSupabaseAdminClient()
): Promise<
  BackgroundJobQueueMetrics
> {
  const timer =
    startApiTimer();

  const now =
    Date.now();

  const waitingCutoff =
    new Date(
      now -
        WAITING_TOO_LONG_MINUTES *
          60 *
          1000
    ).toISOString();

  const staleRunningCutoff =
    new Date(
      now -
        STALE_RUNNING_MINUTES *
          60 *
          1000
    ).toISOString();

  const [
    pendingResult,
    runningResult,
    retryingResult,
    failedResult,
    waitingTooLongResult,
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
        .eq(
          "status",
          "pending"
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
          "retrying"
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
          "failed"
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

  return {
    pending:
      requireCount(
        pendingResult,
        "pending"
      ),

    running:
      requireCount(
        runningResult,
        "running"
      ),

    retrying:
      requireCount(
        retryingResult,
        "retrying"
      ),

    failed:
      requireCount(
        failedResult,
        "failed"
      ),

    waitingTooLong:
      requireCount(
        waitingTooLongResult,
        "waiting-too-long"
      ),

    staleRunning:
      requireCount(
        staleRunningResult,
        "stale-running"
      ),

    durationMs:
      timer.elapsedMs(),

    generatedAt:
      new Date().toISOString(),
  };
}