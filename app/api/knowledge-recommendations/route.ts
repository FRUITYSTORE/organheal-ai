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
  buildHealthIntelligence,
} from "@/lib/health-intelligence/health-intelligence.service";

import {
  getPatientSummary,
} from "@/lib/services/shared/patient-summary.service";

import {
  getPersonalizedKnowledgeRecommendations,
} from "@/lib/services/knowledge/knowledge-recommendation.service";

type KnowledgeRecommendationRequest = {
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
        KnowledgeRecommendationRequest;

    const language =
      body.language === "ar"
        ? "ar"
        : "en";

    const patientSummary =
      await getPatientSummary(
        authentication.user.id,
        authentication.client
      );

    const intelligence =
      buildHealthIntelligence(
        patientSummary
      );

    const recommendations =
      getPersonalizedKnowledgeRecommendations({
        intelligence,

        language,

        audience:
          "general",
      });

    return NextResponse.json(
      recommendations,
      {
        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  } catch (error) {
    logApiError(
      "knowledge_recommendations.request_failed",
      error,
      {
        route:
          "/api/knowledge-recommendations",

        requestId,
      }
    );

    return NextResponse.json(
      {
        error:
          "Could not generate knowledge recommendations.",

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