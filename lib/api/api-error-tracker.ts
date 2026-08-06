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

/*
 * The default tracker is intentionally silent.
 *
 * Structured local logging remains the responsibility
 * of api-logger.ts. An external provider such as Sentry
 * can be registered later through setApiErrorTracker().
 */
const noopApiErrorTracker:
  ApiErrorTracker = {
    captureException() {
      // No external tracking provider is configured.
    },
  };

let activeApiErrorTracker:
  ApiErrorTracker =
    noopApiErrorTracker;

export function setApiErrorTracker(
  tracker:
    ApiErrorTracker
): void {
  activeApiErrorTracker =
    tracker;
}

export function resetApiErrorTracker(): void {
  activeApiErrorTracker =
    noopApiErrorTracker;
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

        event:
          "error_tracking_failed",

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
}