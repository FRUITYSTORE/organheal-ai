import {
  describe,
  expect,
  it,
} from "vitest";

import {
  validateProductAnalyticsRequest,
} from "../lib/analytics/product-analytics-request";

describe(
  "validateProductAnalyticsRequest",
  () => {
    it(
      "accepts a privacy-safe analytics event",
      () => {
        const result =
          validateProductAnalyticsRequest({
            name:
              "report_upload_completed",

            language:
              "en",

            source:
              "lab-upload",

            anonymousSessionId:
              "550e8400-e29b-41d4-a716-446655440000",
          });

        expect(
          result.success
        ).toBe(true);

        if (!result.success) {
          return;
        }

        expect(
          result.event
        ).toEqual({
          name:
            "report_upload_completed",

          language:
            "en",

          source:
            "lab-upload",

          anonymousSessionId:
            "550e8400-e29b-41d4-a716-446655440000",
        });
      }
    );

    it(
      "rejects unsupported event names",
      () => {
        const result =
          validateProductAnalyticsRequest({
            name:
              "medical_result_viewed",
          });

        expect(
          result.success
        ).toBe(false);
      }
    );

    it(
      "rejects direct user identity from the client",
      () => {
        const result =
          validateProductAnalyticsRequest({
            name:
              "assistant_used",

            userId:
              "user_123",
          });

        expect(
          result
        ).toEqual({
          success:
            false,

          error:
            "Analytics event contains unsupported properties.",
        });
      }
    );

    it(
      "rejects clinical or conversational content",
      () => {
        const result =
          validateProductAnalyticsRequest({
            name:
              "assistant_used",

            prompt:
              "What does my blood test mean?",

            reportId:
              "report_123",

            transcript:
              "private voice transcript",
          });

        expect(
          result.success
        ).toBe(false);
      }
    );

    it(
      "rejects an invalid anonymous session ID",
      () => {
        const result =
          validateProductAnalyticsRequest({
            name:
              "homepage_viewed",

            anonymousSessionId:
              "visitor-email@example.com",
          });

        expect(
          result
        ).toEqual({
          success:
            false,

          error:
            "Anonymous analytics session ID is invalid.",
        });
      }
    );

    it(
      "allows an event without an anonymous session ID",
      () => {
        const result =
          validateProductAnalyticsRequest({
            name:
              "homepage_viewed",

            language:
              "ar",

            source:
              "homepage",
          });

        expect(
          result.success
        ).toBe(true);
      }
    );
  }
);