import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getCombinedIntelligenceSummary,
} from "@/lib/services/intelligence/intelligence-summary-v2.service";

type IntelligenceSummaryRequest = {
  userId?: string;
  language?: "en" | "ar";
};

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as
        IntelligenceSummaryRequest;

    if (!body.userId) {
      return NextResponse.json(
        {
          error:
            "User ID is required to build the intelligence summary.",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await getCombinedIntelligenceSummary(
        body.userId,
        body.language === "ar"
          ? "ar"
          : "en"
      );

    return NextResponse.json(
      result
    );
  } catch (error) {
    console.error(
      "Intelligence summary error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not build the intelligence summary.",
      },
      {
        status: 500,
      }
    );
  }
}