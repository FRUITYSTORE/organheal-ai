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
  getDashboardDecision,
} from "@/lib/application/dashboard/dashboard-decision.service";

import {
  getPatientSummary,
} from "@/lib/services/shared/patient-summary.service";

type DashboardDecisionRequest = {
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

  hasHealthPlan?:
    boolean;

  hasDoctorBrief?:
    boolean;
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
        DashboardDecisionRequest;

    const userId =
      authentication.user.id;

    const patient =
      await getPatientSummary(
        userId,
        authentication.client
      );

    const decision =
      await getDashboardDecision({
        userId,

        patient,

        language:
          body.language === "ar"
            ? "ar"
            : "en",

        audience:
          body.audience ??
          "general",

        hasHealthPlan:
          body.hasHealthPlan ??
          false,

        hasDoctorBrief:
          body.hasDoctorBrief,
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
      "dashboard_decision.request_failed",
      error,
      {
        route:
          "/api/dashboard-decision",

        requestId,
      }
    );

    return NextResponse.json(
      {
        error:
          "Could not build dashboard intelligence.",

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