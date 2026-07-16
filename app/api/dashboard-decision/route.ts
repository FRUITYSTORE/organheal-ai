import {
  NextRequest,
  NextResponse,
} from "next/server";

import type {
  PatientSummary,
} from "@/lib/models/patient";

import {
  getDashboardDecision,
} from "@/lib/application/dashboard/dashboard-decision.service";

type DashboardDecisionRequest = {
  userId?: string;
  patient?: PatientSummary;

  language?: "en" | "ar";

  audience?:
    | "general"
    | "children"
    | "parents"
    | "older-adults"
    | "pregnancy"
    | "caregivers"
    | "healthcare-professionals";

  hasHealthPlan?: boolean;
  hasDoctorBrief?: boolean;
};

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as
        DashboardDecisionRequest;

    if (!body.userId) {
      return NextResponse.json(
        {
          error:
            "User ID is required to build the dashboard intelligence.",
        },
        {
          status: 400,
        }
      );
    }

    if (!body.patient) {
      return NextResponse.json(
        {
          error:
            "Patient summary is required to build the dashboard intelligence.",
        },
        {
          status: 400,
        }
      );
    }

    const decision =
      await getDashboardDecision({
        userId:
          body.userId,

        patient:
          body.patient,

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
      decision
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not build dashboard intelligence.",
      },
      {
        status: 500,
      }
    );
  }
}