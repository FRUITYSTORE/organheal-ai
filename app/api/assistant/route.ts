import { NextResponse } from "next/server";

import { authenticateApiRequest } from "@/lib/api/api-auth";

import { createApiRequestId, logApiError } from "@/lib/api/api-logger";

import {
  consumePersistentApiRateLimit,
} from "@/lib/api/api-rate-limit";

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
  getRecentClinicalInterviews,
  updateClinicalInterview,
} from "@/lib/repositories/clinical-interview.repository";

import {
  getSupabaseAdminClient,
} from "@/lib/supabase-admin";

const CLINICAL_INTERVIEW_RESUME_WINDOW_MS =
  24 *
  60 *
  60 *
  1000;

const ASSISTANT_RATE_LIMIT = {
  limit:
    20,

  windowMs:
    60_000,
} as const;

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

  const rateLimitClient =
  getSupabaseAdminClient();

const rateLimit =
  await consumePersistentApiRateLimit({
    client:
      rateLimitClient,

    key:
      `assistant:user:${authentication.user.id}`,

    policy:
      ASSISTANT_RATE_LIMIT,
  });

if (
  !rateLimit.allowed
) {
  return NextResponse.json(
    {
      error:
        "Too many assistant requests. Please try again shortly.",

      requestId,
    },
    {
      status:
        429,

      headers: {
        "x-request-id":
          requestId,

        "retry-after":
          String(
            rateLimit.retryAfterSeconds
          ),

        "x-ratelimit-limit":
          String(
            rateLimit.limit
          ),

        "x-ratelimit-remaining":
          String(
            rateLimit.remaining
          ),
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

  if (
  existingInterview.status !==
  "active"
) {
  return NextResponse.json(
    {
      error:
        "Clinical interview is no longer active.",

      requestId,
    },
    {
      status:
        409,

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
} else {
  const recentClinicalInterviews =
    await getRecentClinicalInterviews(
      authentication.user.id,
      10,
      authentication.client
    );

 const now =
  Date.now();

const activeInterview =
  recentClinicalInterviews.find(
    (interview) =>
      interview.status ===
      "active"
  ) ?? null;

const activeInterviewUpdatedAt =
  activeInterview
    ? new Date(
        activeInterview.updated_at
      ).getTime()
    : Number.NaN;

const isResumableInterview =
  Boolean(
    activeInterview &&
    Number.isFinite(
      activeInterviewUpdatedAt
    ) &&
    now -
      activeInterviewUpdatedAt <=
      CLINICAL_INTERVIEW_RESUME_WINDOW_MS
  );

if (
  activeInterview &&
  isResumableInterview
) {
  trustedClinicalReasoningState =
    activeInterview.reasoning_state;

  activeClinicalInterviewId =
    activeInterview.id;
} else if (
  activeInterview
) {
  await updateClinicalInterview(
    {
      userId:
        authentication.user.id,

      interviewId:
        activeInterview.id,

      reasoningState:
        activeInterview.reasoning_state,

      status:
        "abandoned",
    },
    authentication.client
  );
}
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
      if (
  sessionStatus ===
  "completed"
) {
  activeClinicalInterviewId =
    null;
}
  }
}

   const publicContract =
  buildAssistantResponseContract(
    orchestratorResult,
    activeClinicalInterviewId,
    normalizedLanguage
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
