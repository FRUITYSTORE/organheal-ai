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
  logApiInfo,
} from "@/lib/api/api-logger";

import {
  executeAuthenticatedFollowUp,
} from "@/lib/health-intelligence/application/authenticated-follow-up-runtime.service";

export const runtime =
  "nodejs";

type FollowUpRequest = {
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

    if (
      !authentication.success
    ) {
      return NextResponse.json(
        {
          success:
            false,

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

    let body:
      FollowUpRequest = {};

    try {
      body =
        (await request.json()) as
          FollowUpRequest;
    } catch {
      body = {};
    }

    const language =
      body.language === "ar"
        ? "ar"
        : "en";

    const result =
      await executeAuthenticatedFollowUp({
        userId:
          authentication
            .user
            .id,

        client:
          authentication
            .client,

        language,

        requestId,
      });

    logApiInfo(
      "follow_up.runtime_completed",
      {
        route:
          "/api/follow-up",

        requestId,

        userId:
          authentication
            .user
            .id,

        followUpRequired:
          result
            .followUp
            .decision
            .followUpRequired,

        deliveryEnqueueable:
          result
            .followUp
            .deliveryEnvelope
            .enqueue,

        jobCreated:
          result
            .enqueueResult
            ?.created ??
          false,

        jobId:
          result
            .enqueueResult
            ?.jobId ??
          null,
      }
    );

    return NextResponse.json(
      {
        success:
          true,

        followUpRequired:
          result
            .followUp
            .decision
            .followUpRequired,

        deliveryEnqueueable:
          result
            .followUp
            .deliveryEnvelope
            .enqueue,

        enqueueResult:
          result
            .enqueueResult,

        requestId,
      },
      {
        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  } catch (error) {
    logApiError(
      "follow_up.runtime_failed",
      error,
      {
        route:
          "/api/follow-up",

        requestId,
      }
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "Could not process the follow-up decision.",

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
