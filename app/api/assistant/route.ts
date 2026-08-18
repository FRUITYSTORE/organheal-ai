import { NextResponse } from "next/server";

import { authenticateApiRequest } from "@/lib/api/api-auth";

import { createApiRequestId, logApiError } from "@/lib/api/api-logger";

import {
  runAssistantOrchestrator,
  type AssistantOrchestratorLanguage,
} from "@/lib/health-intelligence/application/assistant-orchestrator.service";

import { buildAssistantResponseContract } from "@/lib/health-intelligence/application/assistant-response-contract.service";

import type {
  AssistantResponseConversationMessage,
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response.service";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  createClinicalInterview,
  getClinicalInterview,
  updateClinicalInterview,
} from "@/lib/repositories/clinical-interview.repository";

type AssistantRequestBody = {
  message?: unknown;

  language?: unknown;

  conversation?: unknown;

  clinicalInterviewId?: unknown;
};

export async function POST(request: Request) {
  const requestId = createApiRequestId();

  try {
    const body = (await request.json()) as AssistantRequestBody;

    const {
  message,
  language = "en",
  conversation,
  clinicalInterviewId,
} = body;

    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        {
          error: "Message is required",

          requestId,
        },
        {
          status: 400,

          headers: {
            "x-request-id": requestId,
          },
        },
      );
    }

    const normalizedLanguage: AssistantOrchestratorLanguage =
      language === "ar" ? "ar" : "en";

    const normalizedConversation = Array.isArray(conversation)
      ? (conversation as AssistantResponseConversationMessage[])
      : [];

    const normalizedClinicalInterviewId =
      typeof clinicalInterviewId ===
      "string" &&
      clinicalInterviewId.trim()
      ? clinicalInterviewId.trim()
      : null;

   let healthContext:
  AssistantResponseHealthContext | null =
    null;

let authenticatedContext:
  | {
      userId:
        string;

      client:
        SupabaseClient;
    }
  | null =
    null;

let trustedClinicalReasoningState =
  null;

let activeClinicalInterviewId:
  string | null =
    null;

const authorizationHeader =
  request.headers.get(
    "authorization"
  );

/*
 * Authentication remains optional for the public
 * educational assistant.
 *
 * Persistent clinical interviews are available only
 * for authenticated users. The browser supplies only
 * an opaque interview id; the reasoning state itself
 * is always loaded from trusted server-side storage.
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

  authenticatedContext = {
    userId:
      authentication.user.id,

    client:
      authentication.client,
  };

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

  if (
    normalizedClinicalInterviewId
  ) {
    const existingInterview =
      await getClinicalInterview(
        authentication.user.id,
        normalizedClinicalInterviewId,
        authentication.client
      );

    if (!existingInterview) {
      return NextResponse.json(
        {
          error:
            "Clinical interview was not found.",

          requestId,
        },
        {
          status:
            404,

          headers: {
            "x-request-id":
              requestId,
          },
        }
      );
    }

    trustedClinicalReasoningState =
      existingInterview.reasoning_state;

    activeClinicalInterviewId =
      existingInterview.id;
  }
}

const orchestratorResult =
  runAssistantOrchestrator({
    message:
      message.trim(),

    language:
      normalizedLanguage,

    healthContext,

    conversation:
      normalizedConversation,

    ...(trustedClinicalReasoningState
      ? {
          clinicalReasoningState:
            trustedClinicalReasoningState,
        }
      : {}),
  });

if (
  authenticatedContext &&
  orchestratorResult
    .clinicalReasoningState
) {
  const reasoningState =
    orchestratorResult
      .clinicalReasoningState;

  const sessionStatus =
    reasoningState.status ===
      "closed"
      ? "completed"
      : "active";

  if (
    activeClinicalInterviewId
  ) {
    const updatedInterview =
      await updateClinicalInterview(
        {
          userId:
            authenticatedContext
              .userId,

          interviewId:
            activeClinicalInterviewId,

          reasoningState,

          status:
            sessionStatus,
        },
        authenticatedContext
          .client
      );

    activeClinicalInterviewId =
      updatedInterview.id;
  } else {
    const createdInterview =
      await createClinicalInterview(
        {
          userId:
            authenticatedContext
              .userId,

          reasoningState,

          status:
            sessionStatus,
        },
        authenticatedContext
          .client
      );

    activeClinicalInterviewId =
      createdInterview.id;
  }
}

    const publicContract =
  buildAssistantResponseContract(
    orchestratorResult,
    activeClinicalInterviewId
  );

    return NextResponse.json(publicContract, {
      headers: {
        "x-request-id": requestId,
      },
    });
  } catch (error) {
    logApiError("assistant.request_failed", error, {
      route: "/api/assistant",

      requestId,
    });

    return NextResponse.json(
      {
        error: "Server error",

        requestId,
      },
      {
        status: 500,

        headers: {
          "x-request-id": requestId,
        },
      },
    );
  }
}
