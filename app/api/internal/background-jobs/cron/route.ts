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
} from "@/lib/api/api-logger";

import {
  createBackgroundJobRuntime,
} from "@/lib/jobs/background-job-runtime";

import {
  getSupabaseAdminClient,
} from "@/lib/supabase-admin";

import {
  runArticleGenerationOnce,
} from "@/lib/content/article-generation.service";

export const runtime =
  "nodejs";

// A model call plus a database write comfortably fits in the default
// function timeout on most plans, but this gives headroom on a slow day.
export const maxDuration =
  60;

const CRON_BATCH_SIZE =
  10;

const API_RATE_LIMIT_RETENTION_SECONDS =
  3600;

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

try {
  const adminClient =
    getSupabaseAdminClient();

  const {
    data:
      deletedRateLimitRows,
    error:
      cleanupError,
  } =
    await adminClient.rpc(
      "cleanup_expired_api_rate_limits",
      {
        p_retention_seconds:
          API_RATE_LIMIT_RETENTION_SECONDS,
      }
    );

  if (cleanupError) {
    logApiWarning(
      "background_jobs_cron.rate_limit_cleanup_failed",
      {
        route:
          "/api/internal/background-jobs/cron",

        requestId,

        supabaseErrorCode:
          cleanupError.code,

        errorMessage:
          cleanupError.message,
      }
    );
  } else {
    logApiInfo(
      "background_jobs_cron.rate_limit_cleanup_completed",
      {
        route:
          "/api/internal/background-jobs/cron",

        requestId,

        deletedRows:
          typeof deletedRateLimitRows ===
            "number"
            ? deletedRateLimitRows
            : null,
      }
    );
  }
} catch (cleanupError) {
  logApiWarning(
    "background_jobs_cron.rate_limit_cleanup_failed",
    {
      route:
        "/api/internal/background-jobs/cron",

      requestId,

      errorMessage:
        cleanupError instanceof
          Error
          ? cleanupError.message
          : "Unknown cleanup error.",
    }
  );
}

let articleGenerated = false;

// Opt-out, not opt-in: set ARTICLE_AUTOPILOT_ENABLED=false in Vercel to pause
// the AI knowledge-hub pipeline without a code change. A failure here never
// fails the cron run — the job queue above already did its work.
if (
  process.env
    .ARTICLE_AUTOPILOT_ENABLED !==
    "false"
) {
  try {
    const articleResult =
      await runArticleGenerationOnce();

    articleGenerated =
      articleResult.generated;

    if (
      articleResult.generated
    ) {
      logApiInfo(
        "background_jobs_cron.article_generated",
        {
          route:
            "/api/internal/background-jobs/cron",

          requestId,

          articleId:
            articleResult
              .article
              .id,

          topicKey:
            articleResult
              .article
              .topic_key ??
            null,
        }
      );
    } else {
      logApiInfo(
        "background_jobs_cron.article_generation_skipped",
        {
          route:
            "/api/internal/background-jobs/cron",

          requestId,

          reason:
            articleResult.reason,
        }
      );
    }
  } catch (
    articleError
  ) {
    logApiWarning(
      "background_jobs_cron.article_generation_failed",
      {
        route:
          "/api/internal/background-jobs/cron",

        requestId,

        errorMessage:
          articleError instanceof
            Error
            ? articleError.message
            : "Unknown article generation error.",
      }
    );
  }
}

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

        articleGenerated,

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