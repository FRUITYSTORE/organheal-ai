import {
  NextResponse,
} from "next/server";

import {
  authenticateApiRequest,
} from "@/lib/api/api-auth";

import {
  createApiRequestId,
  logApiError,
  logApiInfo,
  startApiTimer,
} from "@/lib/api/api-logger";

import {
  consumePersistentApiRateLimit,
} from "@/lib/api/api-rate-limit";

import {
  runAssistantOrchestrator,
  type AssistantOrchestratorLanguage,
} from "@/lib/health-intelligence/application/assistant-orchestrator.service";

import {
  buildAssistantResponseContract,
} from "@/lib/health-intelligence/application/assistant-response-contract.service";

import {
  resolveAssistantSemanticRouting,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/resolve-assistant-semantic-routing";

import {
  resolveAssistantSemanticRoutingWithModel,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/assistant-semantic-model.service";

import {
  openAIAssistantSemanticModelClient,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/openai-assistant-semantic-model.client";

import type {
  AssistantResponseConversationMessage,
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response.service";

import {
  enhanceAssistantClinicalResponse,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/assistant-clinical-explanation.service";

import {
  openAIAssistantClinicalExplanationClient,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/openai-assistant-clinical-explanation.client";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  createClinicalInterview,
  getClinicalInterview,
  getLatestActiveClinicalInterview,
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
  message?:
    unknown;

  language?:
    unknown;

  conversation?:
    unknown;

  clinicalInterviewId?:
    unknown;
};

export async function POST(
  request:
    Request
) {
  const requestId =
    createApiRequestId();

  const requestTimer =
    startApiTimer();

  let currentStage =
    "request_start";

  function logStageCompleted(
    stage:
      string,
    stageTimer:
      ReturnType<
        typeof startApiTimer
      >
  ): void {
    logApiInfo(
      "assistant.stage.completed",
      {
        route:
          "/api/assistant",

        requestId,

        stage,

        durationMs:
          stageTimer.elapsedMs(),

        totalDurationMs:
          requestTimer.elapsedMs(),
      }
    );
  }

  try {
    currentStage =
      "read_request";

    const body =
      (await request.json()) as
        AssistantRequestBody;

    const {
      message,
      language = "en",
      conversation,
      clinicalInterviewId,
    } = body;

    if (
      typeof message !==
        "string" ||
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

    if (
      authorizationHeader?.startsWith(
        "Bearer "
      )
    ) {
      currentStage =
        "authenticate";

      const authenticationTimer =
        startApiTimer();

      const authentication =
        await authenticateApiRequest(
          request
        );

      logStageCompleted(
        "authenticate",
        authenticationTimer
      );

      if (
        !authentication.success
      ) {
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

      currentStage =
        "rate_limit";

      const rateLimitTimer =
        startApiTimer();

      const rateLimit =
        await consumePersistentApiRateLimit({
          client:
            rateLimitClient,

          key:
            `assistant:user:${authentication.user.id}`,

          policy:
            ASSISTANT_RATE_LIMIT,
        });

      logStageCompleted(
        "rate_limit",
        rateLimitTimer
      );

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

      currentStage =
        "build_health_context";

      const healthContextTimer =
        startApiTimer();

      healthContext =
        await buildAuthenticatedAssistantContext({
          userId:
            authentication.user.id,

          language:
            normalizedLanguage,

          client:
            authentication.client,
        });

      logStageCompleted(
        "build_health_context",
        healthContextTimer
      );

      if (
        normalizedClinicalInterviewId
      ) {
        currentStage =
          "get_clinical_interview";

        const getClinicalInterviewTimer =
          startApiTimer();

        const existingInterview =
          await getClinicalInterview(
            authentication.user.id,
            normalizedClinicalInterviewId,
            authentication.client
          );

        logStageCompleted(
          "get_clinical_interview",
          getClinicalInterviewTimer
        );

        if (
          !existingInterview
        ) {
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
        currentStage =
          "get_latest_active_clinical_interview";

        const latestActiveInterviewTimer =
          startApiTimer();

        const activeInterview =
          await getLatestActiveClinicalInterview(
            authentication.user.id,
            authentication.client
          );

        logStageCompleted(
          "get_latest_active_clinical_interview",
          latestActiveInterviewTimer
        );

        const now =
          Date.now();

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
          currentStage =
            "abandon_clinical_interview";

          const abandonClinicalInterviewTimer =
            startApiTimer();

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

          logStageCompleted(
            "abandon_clinical_interview",
            abandonClinicalInterviewTimer
          );
        }
      }
    }

    const deterministicSemanticDecision =
      resolveAssistantSemanticRouting(
        message.trim()
      );

    currentStage =
      "semantic_routing";

    const semanticRoutingTimer =
      startApiTimer();

    const semanticRoutingDecision =
      await resolveAssistantSemanticRoutingWithModel({
        input: {
          currentMessage:
            message.trim(),

          language:
            normalizedLanguage,

          conversation:
            normalizedConversation,

          deterministicDecision:
            deterministicSemanticDecision,
        },

        client:
          openAIAssistantSemanticModelClient,
      });

    logStageCompleted(
      "semantic_routing",
      semanticRoutingTimer
    );

    currentStage =
      "orchestrator";

    const orchestratorTimer =
      startApiTimer();

    const orchestratorResult =
      runAssistantOrchestrator({
        message:
          message.trim(),

        language:
          normalizedLanguage,

        healthContext,

        conversation:
          normalizedConversation,

        semanticRoutingDecision,

        ...(trustedClinicalReasoningState
          ? {
              clinicalReasoningState:
                trustedClinicalReasoningState,
            }
          : {}),
      });

    logStageCompleted(
      "orchestrator",
      orchestratorTimer
    );

    const clinicalExplanationTimer =
  startApiTimer();

const clinicalExplanationPromise =
  enhanceAssistantClinicalResponse({
    question:
      message.trim(),

    language:
      normalizedLanguage,

    healthContext,

    deterministicResult:
      orchestratorResult,

    client:
      openAIAssistantClinicalExplanationClient,

    requestId,
  }).then(
    (result) => {
      logStageCompleted(
        "clinical_explanation",
        clinicalExplanationTimer
      );

      return result;
    }
  );

const clinicalInterviewPersistencePromise =
  (async (): Promise<
    string | null
  > => {
    if (
      !authenticatedContext ||
      !orchestratorResult
        .clinicalReasoningState
    ) {
      return activeClinicalInterviewId;
    }

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
      const updateClinicalInterviewTimer =
        startApiTimer();

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

      logStageCompleted(
        "update_clinical_interview",
        updateClinicalInterviewTimer
      );

      return sessionStatus ===
        "completed"
        ? null
        : updatedInterview.id;
    }

    const createClinicalInterviewTimer =
      startApiTimer();

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

    logStageCompleted(
      "create_clinical_interview",
      createClinicalInterviewTimer
    );

    return sessionStatus ===
      "completed"
      ? null
      : createdInterview.id;
  })();

currentStage =
  "parallel_clinical_processing";

const [
  finalOrchestratorResult,
  persistedClinicalInterviewId,
] =
  await Promise.all([
    clinicalExplanationPromise,
    clinicalInterviewPersistencePromise,
  ]);

activeClinicalInterviewId =
  persistedClinicalInterviewId;

    currentStage =
      "build_response_contract";

    const responseContractTimer =
      startApiTimer();

    const publicContract =
      buildAssistantResponseContract(
        finalOrchestratorResult,
        activeClinicalInterviewId,
        normalizedLanguage
      );

    logStageCompleted(
      "build_response_contract",
      responseContractTimer
    );

    logApiInfo(
      "assistant.request.completed",
      {
        route:
          "/api/assistant",

        requestId,

        durationMs:
          requestTimer.elapsedMs(),
      }
    );

    return NextResponse.json(
      publicContract,
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

        stage:
          currentStage,

        durationMs:
          requestTimer.elapsedMs(),
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