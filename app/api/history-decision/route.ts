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
} from "@/lib/api/api-logger";

import {
  getHistoryDecision,
} from "@/lib/application/history/history-decision.service";

import {
  getPatientSummary,
} from "@/lib/services/shared/patient-summary.service";

type HistoryDecisionRequest = {
  language?:
    | "en"
    | "ar";

  audience?:
    | "general"
    | "children"
    | "parents"
    | "older-adults"
    | "pregnancy"
    | "caregivers"
    | "healthcare-professionals";
};

export async function POST(
  request:
    NextRequest
) {
  const requestId =
    createApiRequestId();

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
        HistoryDecisionRequest;

    const userId =
      authentication.user.id;

    const language =
      body.language === "ar"
        ? "ar"
        : "en";

    const audience =
      body.audience ??
      "general";

    const patient =
      await getPatientSummary(
        userId,
        authentication.client
      );

    const decision =
      await getHistoryDecision({
        userId,

        patient,

        language,

        audience,
      });

    return NextResponse.json(
      decision,
      {
        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  } catch (error) {
    logApiError(
      "history_decision.request_failed",
      error,
      {
        route:
          "/api/history-decision",

        requestId,
      }
    );

    return NextResponse.json(
      {
        error:
          "Could not build the history decision.",

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