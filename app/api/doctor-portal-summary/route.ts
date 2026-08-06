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
  getDoctorPortalSummary,
} from "@/lib/services/doctor/doctor-portal.service";

type DoctorPortalSummaryRequest = {
  language?:
    | "en"
    | "ar";
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
        },
        {
          status:
            authentication.status,
        }
      );
    }

    const body =
      (await request.json()) as
        DoctorPortalSummaryRequest;

    const summary =
      await getDoctorPortalSummary(
        authentication.user.id,

        body.language === "ar"
          ? "ar"
          : "en",

        authentication.client
      );

    return NextResponse.json(
      summary
    );
  } catch (error) {
  logApiError(
    "doctor_portal_summary.request_failed",
    error,
    {
  route:
    "/api/doctor-portal-summary",

  requestId,
}
  );

  return NextResponse.json(
  {
    error:
      "Could not build the doctor portal summary.",

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