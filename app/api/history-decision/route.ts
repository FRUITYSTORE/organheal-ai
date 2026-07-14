import { NextRequest, NextResponse } from "next/server";

import { getHistoryDecision } from "@/lib/application/history/history-decision.service";
import { getPatientSummary } from "@/lib/services/shared/patient-summary.service";

type HistoryDecisionRequest = {
  userId?: string;
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
      (await request.json()) as HistoryDecisionRequest;

    if (!body.userId) {
      return NextResponse.json(
        {
          error:
            "User ID is required to build the history decision.",
        },
        {
          status: 400,
        }
      );
    }

    const patient =
      await getPatientSummary(body.userId);

    const decision =
      await getHistoryDecision({
        patient,
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
            : "Could not build the history decision.",
      },
      {
        status: 500,
      }
    );
  }
}