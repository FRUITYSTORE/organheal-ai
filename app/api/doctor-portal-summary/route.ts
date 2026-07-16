import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getDoctorPortalSummary,
} from "@/lib/services/doctor/doctor-portal.service";

type DoctorPortalSummaryRequest = {
  userId?: string;
  language?: "en" | "ar";
};

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as
        DoctorPortalSummaryRequest;

    if (!body.userId) {
      return NextResponse.json(
        {
          error:
            "User ID is required to build the doctor portal summary.",
        },
        {
          status: 400,
        }
      );
    }

    const summary =
      await getDoctorPortalSummary(
        body.userId,
        body.language === "ar"
          ? "ar"
          : "en"
      );

    return NextResponse.json(
      summary
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not build the doctor portal summary.",

        stack:
          error instanceof Error
            ? error.stack
            : null,
      },
      {
        status: 500,
      }
    );
  }
}