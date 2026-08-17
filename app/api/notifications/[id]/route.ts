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
  dismissUserNotification,
  markNotificationRead,
} from "@/lib/notifications/notification-application.service";

type NotificationLifecycleAction =
  | "read"
  | "dismiss";

type NotificationLifecycleRequest = {
  action?:
    unknown;
};

type NotificationRouteContext = {
  params:
    Promise<{
      id:
        string;
    }>;
};

function normalizeNotificationId(
  value:
    string
): string | null {
  const normalized =
    value.trim();

  return normalized ||
    null;
}

function normalizeAction(
  value:
    unknown
): NotificationLifecycleAction | null {
  if (
    value ===
      "read" ||
    value ===
      "dismiss"
  ) {
    return value;
  }

  return null;
}

export async function PATCH(
  request:
    NextRequest,
  {
    params,
  }:
    NotificationRouteContext
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

    const routeParams =
      await params;

    const notificationId =
      normalizeNotificationId(
        routeParams.id
      );

    if (!notificationId) {
      return NextResponse.json(
        {
          error:
            "Notification ID is required.",

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

    let body:
      NotificationLifecycleRequest;

    try {
      body =
        (await request.json()) as
          NotificationLifecycleRequest;
    } catch {
      return NextResponse.json(
        {
          error:
            "A valid JSON request body is required.",

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

    const action =
      normalizeAction(
        body.action
      );

    if (!action) {
      return NextResponse.json(
        {
          error:
            'Notification action must be "read" or "dismiss".',

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

    const lifecycleInput = {
      userId:
        authentication
          .user
          .id,

      notificationId,

      client:
        authentication
          .client,
    };

    if (
      action ===
        "read"
    ) {
      await markNotificationRead(
        lifecycleInput
      );
    } else {
      await dismissUserNotification(
        lifecycleInput
      );
    }

    logApiInfo(
      "notification_lifecycle.completed",
      {
        route:
          "/api/notifications/[id]",

        requestId,

        notificationId,

        action,

        durationMs:
          timer.elapsedMs(),
      }
    );

    return NextResponse.json(
      {
        success:
          true,

        notificationId,

        action,
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
      "notification_lifecycle.request_failed",
      error,
      {
        route:
          "/api/notifications/[id]",

        requestId,
      }
    );

    return NextResponse.json(
      {
        error:
          "Could not update the notification.",

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