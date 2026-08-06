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
  getCombinedIntelligenceSummary,
} from "@/lib/services/intelligence/intelligence-summary-v2.service";

import {
  getFocusedIntelligenceSummary,
} from "@/lib/services/intelligence/focused-intelligence-summary.service";

type IntelligenceSummaryRequest = {
  language?:
    | "en"
    | "ar";

  reportId?:
    number;
};

export async function POST(
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

    const body =
      (await request.json()) as
        IntelligenceSummaryRequest;

    const userId =
      authentication.user.id;

    const language =
      body.language === "ar"
        ? "ar"
        : "en";

    const requestedReportId =
      typeof body.reportId ===
        "number" &&
      Number.isInteger(
        body.reportId
      ) &&
      body.reportId > 0
        ? body.reportId
        : null;

    if (
      requestedReportId !==
      null
    ) {
      const focusedSummary =
        await getFocusedIntelligenceSummary(
          userId,
          requestedReportId,
          language,
          authentication.client
        );

      if (!focusedSummary) {
        return NextResponse.json(
          {
            error:
              "The requested report was not found in your account.",

            requestId,
          },
          {
            status:
              404,

            headers: {
              "x-request-id":
                requestId,
            },
          }
        );
      }

            logApiInfo(
        "intelligence_summary.completed",
        {
          route:
            "/api/intelligence-summary",

          requestId,

          mode:
            "focused",

          durationMs:
            timer.elapsedMs(),
        }
      );

      return NextResponse.json(
        focusedSummary,
        {
          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    const combinedSummary =
      await getCombinedIntelligenceSummary(
        userId,
        language,
        authentication.client
      );

       logApiInfo(
      "intelligence_summary.completed",
      {
        route:
          "/api/intelligence-summary",

        requestId,

        mode:
          "combined",

        durationMs:
          timer.elapsedMs(),
      }
    );

    return NextResponse.json(
      combinedSummary,
      {
        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  } catch (error) {
    logApiError(
      "intelligence_summary.request_failed",
      error,
      {
        route:
          "/api/intelligence-summary",

        requestId,
      }
    );

    return NextResponse.json(
      {
        error:
          "Could not build the intelligence summary.",

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