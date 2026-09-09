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

import {
  enhanceAssistantGeneralResponse,
} from "@/lib/health-intelligence/application/assistant-general-intelligence/assistant-general-intelligence.service";

import {
  openAIAssistantGeneralIntelligenceClient,
} from "@/lib/health-intelligence/application/assistant-general-intelligence/openai-assistant-general-intelligence.client";

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

import {
  createTrustedAssistantReportReferenceResolver,
} from "@/lib/health-intelligence/application/assistant-report-reference/trusted-assistant-report-reference-resolver";

import type {
  AssistantReportReferenceResolution,
} from "@/lib/health-intelligence/application/assistant-report-reference/assistant-report-reference.types";

import {
  buildAssistantMultiReportComparison,
} from "@/lib/health-intelligence/application/assistant-multi-report-comparison/assistant-multi-report-comparison.service";

import {
  renderAssistantMultiReportComparison,
} from "@/lib/health-intelligence/application/assistant-multi-report-comparison/render-assistant-multi-report-comparison";

import type {
  PatientClinicalLongitudinalComparison,
} from "@/lib/application/clinical/patient-clinical-longitudinal-comparison.service";

import {
  enhanceAssistantMultiReportClinicalResponse,
} from "@/lib/health-intelligence/application/assistant-multi-report-comparison/assistant-multi-report-clinical-explanation.service";

import {
  openAIAssistantMultiReportClinicalExplanationClient,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/openai-assistant-clinical-explanation.client";

import {
  scheduleAfterResponse,
} from "@/lib/api/api-after-response";

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

  activeReportId?:
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
  activeReportId,
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

        const normalizedActiveReportId =
  typeof activeReportId ===
    "number" &&
  Number.isSafeInteger(
    activeReportId
  ) &&
  activeReportId >
    0
    ? activeReportId
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

      logApiInfo(
  "assistant.semantic_resolution.debug",
  {
    route:
      "/api/assistant",

    requestId,

    domain:
      semanticRoutingDecision.domain,

    source:
      semanticRoutingDecision.source,

    confidence:
      semanticRoutingDecision.confidence,

    goals:
      semanticRoutingDecision
        .understanding
        ?.goals ??
      [],

    primaryGoal:
      semanticRoutingDecision
        .understanding
        ?.primaryGoal ??
      null,

    reportReferenceKind:
      semanticRoutingDecision
        .understanding
        ?.reportReference
        ?.kind ??
      null,

    reportReferenceCount:
      semanticRoutingDecision
        .understanding
        ?.reportReference
        ?.count ??
      null,

    needsReportEvidence:
      semanticRoutingDecision
        .understanding
        ?.needsReportEvidence ??
      null,

    needsHistory:
      semanticRoutingDecision
        .understanding
        ?.needsHistory ??
      null,

    referentStatus:
      semanticRoutingDecision
        .understanding
        ?.referentStatus ??
      null,
  }
);

      let resolvedReportSelection:
  AssistantReportReferenceResolution | null =
    null;

let resolvedActiveReportId:
  number |
  null |
  undefined =
    undefined;

const semanticUnderstanding =
  semanticRoutingDecision
    .understanding;

const reportReference =
  semanticUnderstanding
    ?.reportReference ??
  null;

if (
  authenticatedContext &&
  reportReference
) {
  currentStage =
    "resolve_report_reference";

  const reportReferenceTimer =
    startApiTimer();

  const reportResolver =
    createTrustedAssistantReportReferenceResolver(
      authenticatedContext
        .client
    );

  resolvedReportSelection =
    await reportResolver.resolve({
      userId:
        authenticatedContext
          .userId,

      reference:
        reportReference,

      activeReportId:
  normalizedActiveReportId ??
  healthContext
    ?.latestReportContext
    ?.reportId ??
  null,
    });

  logStageCompleted(
    "resolve_report_reference",
    reportReferenceTimer
  );

  const resolvedReports =
    resolvedReportSelection
      .reports;

  /*
 * A single authenticated report selection becomes
 * the active conversational report.
 *
 * Multi-report selections deliberately clear the
 * single-report state so a later follow-up cannot
 * silently attach itself to one report from a
 * comparison.
 */
if (
  (
    resolvedReportSelection
      .status ===
      "resolved" ||
    resolvedReportSelection
      .status ===
      "partial"
  ) &&
  resolvedReports.length ===
    1
) {
  resolvedActiveReportId =
    resolvedReports[0]
      .id;
} else if (
  (
    resolvedReportSelection
      .status ===
      "resolved" ||
    resolvedReportSelection
      .status ===
      "partial"
  ) &&
  resolvedReports.length >
    1
) {
  resolvedActiveReportId =
    null;
} else if (
  reportReference.kind ===
    "current-conversation" &&
  normalizedActiveReportId !==
    null
) {
  /*
   * A client-provided conversation report that
   * cannot be verified must not remain active.
   */
  resolvedActiveReportId =
    null;
}

  /*
   * Existing clinical intelligence is currently
   * single-report oriented.
   *
   * When exactly one report has been resolved,
   * rebuild the authenticated health context
   * around that verified report.
   *
   * Multi-report selections are preserved for
   * the dedicated comparison capability and
   * must not silently collapse to one report.
   */
  if (
    (
      resolvedReportSelection
        .status ===
        "resolved" ||
      resolvedReportSelection
        .status ===
        "partial"
    ) &&
    resolvedReports.length ===
      1
  ) {
    const {
      buildAuthenticatedAssistantContext,
    } =
      await import(
        "@/lib/health-intelligence/application/authenticated-assistant-context.service"
      );

    currentStage =
      "build_selected_report_context";

    const selectedReportContextTimer =
      startApiTimer();

    healthContext =
      await buildAuthenticatedAssistantContext({
        userId:
          authenticatedContext
            .userId,

        language:
          normalizedLanguage,

        client:
          authenticatedContext
            .client,

        reportId:
          resolvedReports[0]
            .id,
      });

    logStageCompleted(
      "build_selected_report_context",
      selectedReportContextTimer
    );
  }
}

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

const hasMultiReportSelection =
  Boolean(
    resolvedReportSelection &&
    resolvedReportSelection
      .reports.length >
      1
  );

  let multiReportComparison:
  PatientClinicalLongitudinalComparison | null =
    null;

let multiReportComparisonResponse:
  string | null =
    null;

if (
  hasMultiReportSelection &&
  authenticatedContext &&
  resolvedReportSelection
) {
  currentStage =
    "multi_report_comparison";

  const multiReportComparisonTimer =
    startApiTimer();

  multiReportComparison =
  await buildAssistantMultiReportComparison({
      userId:
        authenticatedContext
          .userId,

      reports:
        resolvedReportSelection
          .reports,

      client:
        authenticatedContext
          .client,
    });

  multiReportComparisonResponse =
    renderAssistantMultiReportComparison(
      multiReportComparison,
      normalizedLanguage
    );

  logStageCompleted(
    "multi_report_comparison",
    multiReportComparisonTimer
  );
}

const multiReportDeterministicResult =
  hasMultiReportSelection
    ? {
        ...orchestratorResult,

        response:
          multiReportComparisonResponse ??
          orchestratorResult.response,
      }
    : orchestratorResult;

const clinicalExplanationPromise =
  hasMultiReportSelection
    ? multiReportComparison
      ? enhanceAssistantMultiReportClinicalResponse({
          question:
            message.trim(),

          language:
            normalizedLanguage,

          comparison:
            multiReportComparison,

          deterministicResult:
            multiReportDeterministicResult,

          semanticRoutingDecision,

          client:
            openAIAssistantMultiReportClinicalExplanationClient,

          requestId,
        })
      : Promise.resolve(
          multiReportDeterministicResult
        )
    : enhanceAssistantClinicalResponse({
        question:
          message.trim(),

        language:
          normalizedLanguage,

        healthContext,

        deterministicResult:
          orchestratorResult,

        semanticRoutingDecision,

        client:
          openAIAssistantClinicalExplanationClient,

        requestId,
      });

const clinicalExplanationResultPromise =
  clinicalExplanationPromise.then(
    (
      result
    ) => {
      logStageCompleted(
        "clinical_explanation",
        clinicalExplanationTimer
      );

      return result;
    }
  );

const finalAssistantResponsePromise =
  clinicalExplanationResultPromise.then(
    async (
      clinicalResult
    ) => {
      const generalIntelligenceTimer =
        startApiTimer();

      const result =
        await enhanceAssistantGeneralResponse({
          message:
            message.trim(),

          language:
            normalizedLanguage,

          conversation:
            normalizedConversation,

          semanticRoutingDecision,

          deterministicResult:
            clinicalResult,

          client:
            openAIAssistantGeneralIntelligenceClient,
        });

      logStageCompleted(
        "general_intelligence",
        generalIntelligenceTimer
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

/*
 * Clinical-interview persistence starts immediately so it
 * can overlap with clinical response generation.
 *
 * It must never delay an already completed user-facing
 * answer. Next.js keeps the persistence work alive after
 * the response through scheduleAfterResponse().
 */
const fallbackClinicalInterviewId =
  activeClinicalInterviewId;

let settledClinicalInterviewId =
  fallbackClinicalInterviewId;

let clinicalInterviewPersistenceSettled =
  false;

const clinicalInterviewPersistenceSafePromise =
  clinicalInterviewPersistencePromise
    .then(
      (
        persistedClinicalInterviewId
      ) => {
        settledClinicalInterviewId =
          persistedClinicalInterviewId;

        clinicalInterviewPersistenceSettled =
          true;

        return persistedClinicalInterviewId;
      }
    )
    .catch(
      () => {
        settledClinicalInterviewId =
          fallbackClinicalInterviewId;

        clinicalInterviewPersistenceSettled =
          true;

        return fallbackClinicalInterviewId;
      }
    );

scheduleAfterResponse(
  async () => {
    await clinicalInterviewPersistenceSafePromise;
  }
);

currentStage =
  "parallel_clinical_processing";

const finalOrchestratorResult =
  await finalAssistantResponsePromise;

/*
 * If persistence completed naturally while the clinical
 * answer was being generated, use its authoritative id.
 *
 * Otherwise return immediately without waiting for the
 * database. Existing active interviews keep their known id.
 */
if (
  clinicalInterviewPersistenceSettled
) {
  activeClinicalInterviewId =
    settledClinicalInterviewId;
}

/*
 * A closed reasoning state should never keep exposing an
 * active interview id merely because persistence is still
 * finishing in the background.
 */
if (
  authenticatedContext &&
  orchestratorResult
    .clinicalReasoningState
    ?.status ===
    "closed"
) {
  activeClinicalInterviewId =
    null;
}

    currentStage =
      "build_response_contract";

    const responseContractTimer =
      startApiTimer();

    const publicContract =
  resolvedActiveReportId ===
    undefined
    ? buildAssistantResponseContract(
        finalOrchestratorResult,
        activeClinicalInterviewId,
        normalizedLanguage
      )
    : buildAssistantResponseContract(
        finalOrchestratorResult,
        activeClinicalInterviewId,
        normalizedLanguage,
        resolvedActiveReportId
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