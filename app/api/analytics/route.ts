import {
  NextResponse,
} from "next/server";

import {
  authenticateOptionalApiRequest,
} from "@/lib/api/api-auth";

import {
  resolveApiRateLimitIdentity,
} from "@/lib/api/api-rate-limit-identity";

import {
  consumePersistentApiRateLimit,
} from "@/lib/api/api-rate-limit";

import {
  createApiRequestId,
  logApiError,
  startApiTimer,
} from "@/lib/api/api-logger";

import {
  ProductAnalyticsRepository,
} from "@/lib/analytics/product-analytics.repository";

import {
  validateProductAnalyticsRequest,
} from "@/lib/analytics/product-analytics-request";

import {
  getSupabaseAdminClient,
} from "@/lib/supabase-admin";

const ANALYTICS_RATE_LIMIT = {
  limit:
    60,

  windowMs:
    60_000,
} as const;

export async function POST(
  request:
    Request
) {
  const requestId =
    createApiRequestId();

  const timer =
    startApiTimer();

  try {
    const authentication =
      await authenticateOptionalApiRequest(
        request
      );

    if (
      !authentication.success
    ) {
      return NextResponse.json(
        {
          error:
            authentication.error,

          requestId,
        },
        {
          status:
            authentication.status,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    const authenticatedUserId =
      authentication.user?.id ??
      null;

    const rateLimitIdentity =
      resolveApiRateLimitIdentity({
        request,

        userId:
          authenticatedUserId,
      });

    const adminClient =
      getSupabaseAdminClient();

    const rateLimit =
      await consumePersistentApiRateLimit({
        client:
          adminClient,

        key:
          `analytics:${rateLimitIdentity.type}:${rateLimitIdentity.value}`,

        policy:
          ANALYTICS_RATE_LIMIT,
      });

    if (
      !rateLimit.allowed
    ) {
      return NextResponse.json(
        {
          error:
            "Too many analytics requests. Please try again shortly.",

          requestId,
        },
        {
          status:
            429,

          headers: {
            "x-request-id":
              requestId,

            "retry-after":
              String(
                rateLimit.retryAfterSeconds
              ),

            "x-ratelimit-limit":
              String(
                rateLimit.limit
              ),

            "x-ratelimit-remaining":
              String(
                rateLimit.remaining
              ),
          },
        }
      );
    }

    let body:
      unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "A valid analytics event is required.",

          requestId,
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

    const validation =
      validateProductAnalyticsRequest(
        body
      );

    if (
      !validation.success
    ) {
      return NextResponse.json(
        {
          error:
            validation.error,

          requestId,
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

    const repository =
      new ProductAnalyticsRepository(
        adminClient
      );

    await repository.insertEvent({
      eventName:
        validation.event.name,

      userId:
        authenticatedUserId,

      anonymousSessionId:
        authenticatedUserId
          ? null
          : validation.event
              .anonymousSessionId ??
            null,

      language:
        validation.event.language,

      source:
        validation.event.source,

      authenticated:
        authenticatedUserId !==
        null,
    });

    return NextResponse.json(
      {
        success:
          true,

        requestId,
      },
      {
        status:
          201,

        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  } catch (error) {
    logApiError(
      "analytics_event_failed",
      {
        requestId,

        durationMs:
          timer.elapsedMs(),

        error,
      }
    );

    return NextResponse.json(
      {
        error:
          "Unable to record analytics event.",

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