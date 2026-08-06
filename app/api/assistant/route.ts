import {
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
  runAssistantOrchestrator,
  type AssistantOrchestratorLanguage,
} from "@/lib/health-intelligence/application/assistant-orchestrator.service";

import type {
  AssistantResponseConversationMessage,
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response.service";

type AssistantRequestBody = {
  message?: unknown;
  language?: unknown;
  conversation?: unknown;
};

export async function POST(
  request: Request
) {
  const requestId =
    createApiRequestId();

  try {
    const body =
      (await request.json()) as
        AssistantRequestBody;

    const {
      message,
      language = "en",
      conversation,
    } = body;

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Message is required",

          requestId,
        },
        {
          status:
            400,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    const normalizedLanguage:
      AssistantOrchestratorLanguage =
        language === "ar"
          ? "ar"
          : "en";

    const normalizedConversation =
      Array.isArray(
        conversation
      )
        ? (
            conversation as
              AssistantResponseConversationMessage[]
          )
        : [];

    let healthContext:
      AssistantResponseHealthContext | null =
        null;

    const authorizationHeader =
      request.headers.get(
        "authorization"
      );

    /*
     * Authentication is optional for the public
     * educational assistant.
     *
     * Authenticated requests rebuild the user's health
     * context securely from server-side data.
     */
    if (
      authorizationHeader?.startsWith(
        "Bearer "
      )
    ) {
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

      const {
        buildAuthenticatedAssistantContext,
      } =
        await import(
          "@/lib/health-intelligence/application/authenticated-assistant-context.service"
        );

      healthContext =
        await buildAuthenticatedAssistantContext({
          userId:
            authentication.user.id,

          language:
            normalizedLanguage,

          client:
            authentication.client,
        });
    }

    const result =
      runAssistantOrchestrator({
        message:
          message.trim(),

        language:
          normalizedLanguage,

        healthContext,

        conversation:
          normalizedConversation,
      });

    return NextResponse.json(
      result,
      {
        headers: {
          "x-request-id":
            requestId,
        },
      }
    );
  } catch (error) {
    logApiError(
      "assistant.request_failed",
      error,
      {
        route:
          "/api/assistant",

        requestId,
      }
    );

    return NextResponse.json(
      {
        error:
          "Server error",

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