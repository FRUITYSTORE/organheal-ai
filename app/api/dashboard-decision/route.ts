import { NextRequest, NextResponse } from "next/server";

import type { PatientSummary } from "@/lib/models/patient";
import { getDashboardDecision } from "@/lib/application/dashboard/dashboard-decision.service";

type DashboardDecisionRequest = {
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
};

export async function POST(request: NextRequest) {
  try {
    const body =
      (await request.json()) as DashboardDecisionRequest;

    if (!body.patient) {
      return NextResponse.json(
        {
          error:
            "Patient summary is required to build the dashboard decision.",
        },
        {
          status: 400,
        }
      );
    }

    const decision = await getDashboardDecision({
      patient: body.patient,
      language:
        body.language === "ar"
          ? "ar"
          : "en",
      audience:
        body.audience ?? "general",
    });

    return NextResponse.json(decision);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not build dashboard decision.",
      },
      {
        status: 500,
      }
    );
  }
}