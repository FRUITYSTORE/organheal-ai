import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  triggerReportFollowUp,
} from "@/lib/services/intelligence/report-follow-up-runtime.service";

describe(
  "Report follow-up runtime",
  () => {
    afterEach(
      () => {
        vi.restoreAllMocks();
      }
    );

    it(
      "triggers authenticated follow-up and maps the enqueue result",
      async () => {
        const fetchMock =
          vi.spyOn(
            globalThis,
            "fetch"
          )
            .mockResolvedValue(
              new Response(
                JSON.stringify({
                  success:
                    true,

                  followUpRequired:
                    true,

                  deliveryEnqueueable:
                    true,

                  enqueueResult: {
                    jobId:
                      "job-123",

                    created:
                      true,
                  },

                  requestId:
                    "req-123",
                }),
                {
                  status:
                    200,

                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                }
              )
            );

        const result =
          await triggerReportFollowUp({
            accessToken:
              " test-token ",

            language:
              "ar",
          });

        expect(
          fetchMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          fetchMock
        ).toHaveBeenCalledWith(
          "/api/follow-up",
          {
            method:
              "POST",

            headers: {
              Authorization:
                "Bearer test-token",

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                language:
                  "ar",
              }),
          }
        );

        expect(
          result
        ).toEqual({
          success:
            true,

          enqueued:
            true,

          jobId:
            "job-123",

          created:
            true,
        });
      }
    );

    it(
      "returns a successful non-enqueued result when no delivery job is required",
      async () => {
        vi.spyOn(
          globalThis,
          "fetch"
        )
          .mockResolvedValue(
            new Response(
              JSON.stringify({
                success:
                  true,

                followUpRequired:
                  false,

                deliveryEnqueueable:
                  false,

                enqueueResult:
                  null,
              }),
              {
                status:
                  200,

                headers: {
                  "Content-Type":
                    "application/json",
                },
              }
            )
          );

        const result =
          await triggerReportFollowUp({
            accessToken:
              "test-token",
          });

        expect(
          result
        ).toEqual({
          success:
            true,

          enqueued:
            false,

          jobId:
            null,

          created:
            false,
        });
      }
    );

    it(
      "rejects an empty access token without calling the API",
      async () => {
        const fetchMock =
          vi.spyOn(
            globalThis,
            "fetch"
          );

        const result =
          await triggerReportFollowUp({
            accessToken:
              "   ",
          });

        expect(
          fetchMock
        ).not.toHaveBeenCalled();

        expect(
          result
        ).toEqual({
          success:
            false,

          errorMessage:
            "A valid access token is required to trigger report follow-up.",
        });
      }
    );

    it(
      "returns the API error when the follow-up request fails",
      async () => {
        vi.spyOn(
          globalThis,
          "fetch"
        )
          .mockResolvedValue(
            new Response(
              JSON.stringify({
                success:
                  false,

                error:
                  "Follow-up failed.",
              }),
              {
                status:
                  500,

                headers: {
                  "Content-Type":
                    "application/json",
                },
              }
            )
          );

        const result =
          await triggerReportFollowUp({
            accessToken:
              "test-token",
          });

        expect(
          result
        ).toEqual({
          success:
            false,

          errorMessage:
            "Follow-up failed.",
        });
      }
    );

    it(
      "fails safely when the network request throws",
      async () => {
        vi.spyOn(
          globalThis,
          "fetch"
        )
          .mockRejectedValue(
            new Error(
              "Network unavailable"
            )
          );

        const result =
          await triggerReportFollowUp({
            accessToken:
              "test-token",
          });

        expect(
          result
        ).toEqual({
          success:
            false,

          errorMessage:
            "Network unavailable",
        });
      }
    );
  }
);