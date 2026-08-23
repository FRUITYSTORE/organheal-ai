import "server-only";

import * as Sentry from "@sentry/nextjs";

import "@/sentry.server.config";

export type ApiErrorTrackingContext = {
  event:
    string;

  route?:
    string;

  requestId?:
    string;

  details?:
    Record<
      string,
      unknown
    >;
};

export type ApiErrorTracker = {
  captureException(
    error:
      unknown,
    context:
      ApiErrorTrackingContext
  ): void;
};

const noopApiErrorTracker:
  ApiErrorTracker = {
    captureException() {
      // External tracking is intentionally disabled.
    },
  };

const sentryApiErrorTracker:
  ApiErrorTracker = {
    captureException(
      error,
      context
    ) {
      Sentry.withScope(
        (scope) => {
          scope.setTag(
            "organheal.event",
            context.event
          );

          if (
            context.route
          ) {
            scope.setTag(
              "organheal.route",
              context.route
            );
          }

          if (
            context.requestId
          ) {
            scope.setTag(
              "organheal.request_id",
              context.requestId
            );
          }

          /*
           * Do not send context.details to Sentry.
           * Application details may contain health or
           * other sensitive information.
           */
          Sentry.captureException(
            error instanceof Error
              ? error
              : new Error(
                  "Non-Error exception captured by API error tracker."
                )
          );
        }
      );
    },
  };

function getDefaultApiErrorTracker():
  ApiErrorTracker {
  if (
    process.env.NODE_ENV ===
      "production" &&
    process.env.SENTRY_DSN
  ) {
    return sentryApiErrorTracker;
  }

  return noopApiErrorTracker;
}

let activeApiErrorTracker:
  ApiErrorTracker =
    getDefaultApiErrorTracker();

export function setApiErrorTracker(
  tracker:
    ApiErrorTracker
): void {
  activeApiErrorTracker =
    tracker;
}

export function resetApiErrorTracker(): void {
  activeApiErrorTracker =
    getDefaultApiErrorTracker();
}

function logTrackingFailure(
  trackingError:
    unknown,
  context:
    ApiErrorTrackingContext,
  event:
    string
): void {
  /*
   * Error tracking must never break the API request.
   * Do not include the original error or health data.
   */
  console.error(
    JSON.stringify({
      timestamp:
        new Date().toISOString(),

      source:
        "api-error-tracker",

      event,

      originalEvent:
        context.event,

      requestId:
        context.requestId ??
        null,

      error: {
        name:
          trackingError instanceof Error
            ? trackingError.name
            : "UnknownError",

        message:
          trackingError instanceof Error
            ? trackingError.message
            : String(
                trackingError
              ),
      },
    })
  );
}

export function captureApiException(
  error:
    unknown,
  context:
    ApiErrorTrackingContext
): void {
  try {
    activeApiErrorTracker
      .captureException(
        error,
        context
      );
  } catch (
    trackingError
  ) {
    logTrackingFailure(
      trackingError,
      context,
      "error_tracking_failed"
    );
  }
}

export async function captureApiExceptionAndFlush(
  error:
    unknown,
  context:
    ApiErrorTrackingContext
): Promise<boolean> {
  const tracker =
    activeApiErrorTracker;

  try {
    tracker.captureException(
      error,
      context
    );
  } catch (
    trackingError
  ) {
    logTrackingFailure(
      trackingError,
      context,
      "error_tracking_failed"
    );

    return false;
  }

  /*
   * Custom test trackers and the noop tracker do not
   * require Sentry transport flushing.
   */
  if (
    tracker !==
      sentryApiErrorTracker
  ) {
    return true;
  }

  try {
    const flushed =
      await Sentry.flush(
        5000
      );

    if (!flushed) {
      console.error(
        JSON.stringify({
          timestamp:
            new Date().toISOString(),

          source:
            "api-error-tracker",

          event:
            "error_tracking_flush_timeout",

          originalEvent:
            context.event,

          requestId:
            context.requestId ??
            null,
        })
      );
    }

    return flushed;
  } catch (
    trackingError
  ) {
    logTrackingFailure(
      trackingError,
      context,
      "error_tracking_flush_failed"
    );

    return false;
  }
}
