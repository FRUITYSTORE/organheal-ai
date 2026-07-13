import { NextRequest, NextResponse } from "next/server";

import { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";
import { getPersonalizedKnowledgeRecommendations } from "@/lib/services/knowledge/knowledge-recommendation.service";

type KnowledgeRecommendationRequest = {
  intelligence?: HealthIntelligenceResult;
  language?: "en" | "ar";
};

export async function POST(request: NextRequest) {
  try {
    const body =
      (await request.json()) as KnowledgeRecommendationRequest;

    if (!body.intelligence) {
      return NextResponse.json(
        {
          error:
            "Health intelligence is required to generate knowledge recommendations.",
        },
        {
          status: 400,
        }
      );
    }

    const language =
      body.language === "ar" ? "ar" : "en";

    const recommendations =
      getPersonalizedKnowledgeRecommendations({
        intelligence: body.intelligence,
        language,
        audience: "general",
      });

    return NextResponse.json(recommendations);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not generate knowledge recommendations.",
      },
      {
        status: 500,
      }
    );
  }
}