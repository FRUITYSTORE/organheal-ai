import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  authenticateApiRequest,
} from "@/lib/api/api-auth";

import {
  createApiRequestId,
  logApiError,
  logApiInfo,
  startApiTimer,
} from "@/lib/api/api-logger";

import {
  getNotificationCenter,
} from "@/lib/notifications/notification-application.service";

import {
  buildNotificationResponseContract,
} from "@/lib/notifications/notification-response-contract.service";

function normalizeLimit(
  value:
    string | null
): number {
  if (!value) {
    return 20;
  }

  const parsed =
    Number(
      value
    );

  if (
    !Number.isInteger(
      parsed
    ) ||
    parsed <=
      0
  ) {
    return 20;
  }

  return Math.min(
    parsed,
    100
  );
}

export async function GET(
  request:
    NextRequest
) {
  const requestId =
    createApiRequestId();

  const timer =
    startApiTimer();

  try {
    const authentication =
      await authenticateApiRequest(
        request
      );

    if (!authentication.success) {
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

       const requestUrl =
      new URL(
        request.url
      );

    const limit =
      normalizeLimit(
        requestUrl
          .searchParams
          .get(
            "limit"
          )
      );

    const summary =
      await getNotificationCenter({
        userId:
          authentication
            .user
            .id,

        limit,

        client:
          authentication
            .client,
      });

    const contract =
      buildNotificationResponseContract(
        summary
      );

    logApiInfo(
      "notifications.completed",
      {
        route:
          "/api/notifications",

        requestId,

        notificationCount:
          contract
            .notifications
            .length,

        unreadCount:
          contract
            .unreadCount,

        durationMs:
          timer.elapsedMs(),
      }
    );

    return NextResponse.json(
      contract,
      {
        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  } catch (error) {
    logApiError(
      "notifications.request_failed",
      error,
      {
        route:
          "/api/notifications",

        requestId,
      }
    );

    return NextResponse.json(
      {
        error:
          "Could not load notifications.",

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