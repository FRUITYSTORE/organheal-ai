import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  classifyApiDuration,
  createApiRequestId,
  logApiError,
  startApiTimer,
} from "@/lib/api/api-logger";

import {
  resetApiErrorTracker,
  setApiErrorTracker,
  type ApiErrorTracker,
} from "@/lib/api/api-error-tracker";

describe(
  "API observability",
  () => {
    let consoleErrorSpy:
      ReturnType<
        typeof vi.spyOn
      >;

    beforeEach(() => {
      consoleErrorSpy =
        vi
          .spyOn(
            console,
            "error"
          )
          .mockImplementation(
            () => undefined
          );

      resetApiErrorTracker();
    });

    afterEach(() => {
      resetApiErrorTracker();

      vi.restoreAllMocks();
    });

    it(
      "creates request IDs with the expected prefix",
      () => {
        const requestId =
          createApiRequestId();

        expect(
          requestId
        ).toMatch(
          /^req_[0-9a-f-]+$/i
        );
      }
    );

    it(
      "writes one structured JSON error log",
      () => {
        logApiError(
          "assistant.request_failed",
          new Error(
            "Orchestrator failure"
          ),
          {
            route:
              "/api/assistant",

            requestId:
              "req_test",
          }
        );

        expect(
          consoleErrorSpy
        ).toHaveBeenCalledTimes(
          1
        );

        const loggedValue =
          consoleErrorSpy
            .mock
            .calls[0]?.[0];

        expect(
          typeof loggedValue
        ).toBe(
          "string"
        );

        const parsedLog =
          JSON.parse(
            loggedValue as string
          ) as {
            level?: string;
            event?: string;
            route?: string;
            requestId?: string;
            error?: {
              name?: string;
              message?: string;
            };
          };

        expect(
          parsedLog
        ).toMatchObject({
          level:
            "error",

          event:
            "assistant.request_failed",

          route:
            "/api/assistant",

          requestId:
            "req_test",

          error: {
            name:
              "Error",

            message:
              "Orchestrator failure",
          },
        });
      }
    );

    it(
      "redacts sensitive values at nested levels",
      () => {
        logApiError(
          "extract_pdf.request_failed",
          new Error(
            "Extraction failed"
          ),
          {
            token:
              "secret-token",

            nested: {
              userId:
                "user-123",

              email:
                "patient@example.com",

              extractedText:
                "private medical text",

              safeValue:
                "visible",
            },

            arrayValue: [
              {
                doctorBrief:
                  "private doctor brief",

                safeItem:
                  "visible-item",
              },
            ],
          }
        );

        const loggedValue =
          consoleErrorSpy
            .mock
            .calls[0]?.[0];

        const parsedLog =
          JSON.parse(
            loggedValue as string
          ) as {
            token?: string;
            nested?: {
              userId?: string;
              email?: string;
              extractedText?: string;
              safeValue?: string;
            };
            arrayValue?: Array<{
              doctorBrief?: string;
              safeItem?: string;
            }>;
          };

        expect(
          parsedLog.token
        ).toBe(
          "[REDACTED]"
        );

        expect(
          parsedLog.nested
        ).toMatchObject({
          userId:
            "[REDACTED]",

          email:
            "[REDACTED]",

          extractedText:
            "[REDACTED]",

          safeValue:
            "visible",
        });

        expect(
          parsedLog
            .arrayValue?.[0]
        ).toMatchObject({
          doctorBrief:
            "[REDACTED]",

          safeItem:
            "visible-item",
        });
      }
    );

    it(
      "passes the error and safe tracking context to the active tracker",
      () => {
        const captureException =
          vi.fn();

        const tracker:
          ApiErrorTracker = {
            captureException,
          };

        setApiErrorTracker(
          tracker
        );

        const error =
          new Error(
            "Tracked failure"
          );

        logApiError(
          "history_decision.request_failed",
          error,
          {
            route:
              "/api/history-decision",

            requestId:
              "req_tracking",

            token:
              "secret-token",

            safeValue:
              "visible",
          }
        );

        expect(
          captureException
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          captureException
        ).toHaveBeenCalledWith(
          error,
          {
            event:
              "history_decision.request_failed",

            route:
              "/api/history-decision",

            requestId:
              "req_tracking",

            details: {
              route:
                "/api/history-decision",

              requestId:
                "req_tracking",

              token:
                "[REDACTED]",

              safeValue:
                "visible",
            },
          }
        );

        expect(
          consoleErrorSpy
        ).toHaveBeenCalledTimes(
          1
        );
      }
    );

    it(
      "does not throw when the external tracker fails",
      () => {
        const tracker:
          ApiErrorTracker = {
            captureException() {
              throw new Error(
                "Tracker unavailable"
              );
            },
          };

        setApiErrorTracker(
          tracker
        );

        expect(() =>
          logApiError(
            "dashboard_decision.request_failed",
            new Error(
              "Dashboard failure"
            ),
            {
              route:
                "/api/dashboard-decision",

              requestId:
                "req_tracker_failure",
            }
          )
        ).not.toThrow();

        expect(
          consoleErrorSpy
        ).toHaveBeenCalledTimes(
          2
        );

        const trackerFailureLog =
          consoleErrorSpy
            .mock
            .calls[1]?.[0];

        const parsedTrackerFailure =
          JSON.parse(
            trackerFailureLog as string
          ) as {
            source?: string;
            event?: string;
            originalEvent?: string;
            requestId?: string;
          };

        expect(
          parsedTrackerFailure
        ).toMatchObject({
          source:
            "api-error-tracker",

          event:
            "error_tracking_failed",

          originalEvent:
            "dashboard_decision.request_failed",

          requestId:
            "req_tracker_failure",
        });
      }
    );

        it(
      "handles circular details without breaking logging",
      () => {
        const circular:
          Record<
            string,
            unknown
          > = {
            safeValue:
              "visible",
          };

        circular.self =
          circular;

        expect(() =>
          logApiError(
            "circular_test.request_failed",
            new Error(
              "Circular failure"
            ),
            {
              circular,
            }
          )
        ).not.toThrow();

        const loggedValue =
          consoleErrorSpy
            .mock
            .calls[0]?.[0];

        const parsedLog =
          JSON.parse(
            loggedValue as string
          ) as {
            circular?: {
              safeValue?: string;
              self?: string;
            };
          };

        expect(
          parsedLog.circular
        ).toMatchObject({
          safeValue:
            "visible",

          self:
            "[CIRCULAR]",
        });
      }
    );

       it(
      "measures elapsed time without returning negative values",
      async () => {
        const timer =
          startApiTimer();

        const firstElapsed =
          timer.elapsedMs();

        await new Promise<void>(
          (resolve) => {
            setTimeout(
              resolve,
              5
            );
          }
        );

        const secondElapsed =
          timer.elapsedMs();

        expect(
          typeof firstElapsed
        ).toBe(
          "number"
        );

        expect(
          firstElapsed
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          secondElapsed
        ).toBeGreaterThanOrEqual(
          firstElapsed
        );
      }
    );

    it(
      "classifies API durations using default thresholds",
      () => {
        expect(
          classifyApiDuration(
            100
          )
        ).toBe(
          "normal"
        );

        expect(
          classifyApiDuration(
            250
          )
        ).toBe(
          "slow"
        );

        expect(
          classifyApiDuration(
            750
          )
        ).toBe(
          "very_slow"
        );

        expect(
          classifyApiDuration(
            2000
          )
        ).toBe(
          "critical"
        );
      }
    );

    it(
      "supports custom performance thresholds",
      () => {
        const thresholds = {
          slowMs:
            1000,

          verySlowMs:
            5000,

          criticalMs:
            15000,
        };

        expect(
          classifyApiDuration(
            600,
            thresholds
          )
        ).toBe(
          "normal"
        );

        expect(
          classifyApiDuration(
            1500,
            thresholds
          )
        ).toBe(
          "slow"
        );

        expect(
          classifyApiDuration(
            7000,
            thresholds
          )
        ).toBe(
          "very_slow"
        );

        expect(
          classifyApiDuration(
            20000,
            thresholds
          )
        ).toBe(
          "critical"
        );
      }
    );
  }
);