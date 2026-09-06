import type {
  AssistantOrchestratorResult,
} from "@/lib/health-intelligence/application/assistant-orchestrator.service";

import type {
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

import type {
  AssistantSemanticRoutingDecision,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/assistant-semantic-routing.types";

import type {
  AssistantClinicalExplanationClient,
  AssistantClinicalExplanationLanguage,
  AssistantClinicalExplanationMode,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/assistant-clinical-explanation.types";

import {
  detectAssistantIntent,
} from "@/lib/health-intelligence/application/assistant-intent/assistant-intent";

import {
  diagnoseAssistantClinicalExplanationValidationFailure,
  validateAssistantClinicalExplanation,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/validate-assistant-clinical-explanation";

import {
  renderAssistantClinicalExplanation,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/render-assistant-clinical-explanation";

import {
  logApiError,
  logApiInfo,
  startApiTimer,
} from "@/lib/api/api-logger";

export type EnhanceAssistantClinicalResponseInput = {
  question:
    string;

  language:
    AssistantClinicalExplanationLanguage;

  healthContext:
    AssistantResponseHealthContext | null;

  deterministicResult:
    AssistantOrchestratorResult;

  semanticRoutingDecision?:
    AssistantSemanticRoutingDecision | null;

  client:
    AssistantClinicalExplanationClient;

  requestId:
    string;
};

function isClinicalExplanationEnabled():
  boolean {
  return (
    process.env
      .OPENAI_CLINICAL_EXPLANATION_ENABLED
      ?.trim()
      .toLowerCase() ===
    "true"
  );
}

function isEligibleIntent(
  question:
    string,
  semanticRoutingDecision?:
    AssistantSemanticRoutingDecision | null
): boolean {
  const semanticUnderstanding =
    semanticRoutingDecision
      ?.understanding;

  if (
    semanticRoutingDecision?.domain ===
      "clinical_question" &&
    semanticUnderstanding
  ) {
    return true;
  }

  const intent =
    detectAssistantIntent(
      question
    ).intent;

  return (
    intent === "report" ||
    intent === "doctor" ||
    intent === "cause-reasoning" ||
    intent === "risk" ||
    intent === "next-step"
  );
}

function resolveClinicalExplanationMode(
  question:
    string,
  semanticRoutingDecision?:
    AssistantSemanticRoutingDecision | null
): AssistantClinicalExplanationMode {
  const understanding =
    semanticRoutingDecision
      ?.understanding;

  if (understanding) {
    const goals =
      understanding.goals;

    /*
     * Multi-goal questions require one integrated response.
     *
     * Example:
     * "Why is my glucose high, is it dangerous,
     * and what should I do?"
     *
     * A focused cause or next-step mode would discard
     * part of the user's request, so use full mode.
     */
    if (goals.length > 1) {
      return "full";
    }

    if (
      understanding.primaryGoal ===
        "next-step" ||
      understanding.asksForAction
    ) {
      return "next-step";
    }

    if (
      understanding.primaryGoal ===
        "cause" ||
      understanding.primaryGoal ===
        "diagnostic-meaning" ||
      understanding.asksForDiagnosis
    ) {
      return "cause-reasoning";
    }

    return "full";
  }

  /*
   * Legacy fallback when semantic understanding is
   * unavailable because of provider failure or timeout.
   */
  const intent =
    detectAssistantIntent(
      question
    ).intent;

  if (
    intent ===
    "next-step"
  ) {
    return "next-step";
  }

  if (
    intent ===
    "cause-reasoning"
  ) {
    return "cause-reasoning";
  }

  return "full";
}

function buildSemanticClinicalQuestion(
  question:
    string,
  semanticRoutingDecision?:
    AssistantSemanticRoutingDecision | null
): string {
  const understanding =
    semanticRoutingDecision
      ?.understanding;

  if (!understanding) {
    return question;
  }

  const subject =
    understanding.subject;

  const contextLines:
    string[] = [];

  if (
    understanding.isFollowUp ||
    understanding.refersToPreviousTurn
  ) {
    contextLines.push(
      "This is a conversational follow-up to the recent discussion."
    );
  }

  if (
    subject.value
  ) {
    contextLines.push(
      `Resolved conversational subject: ${subject.value}`
    );
  } else if (
    subject.kind !== "unknown"
  ) {
    contextLines.push(
      `Resolved subject type: ${subject.kind}`
    );
  }

  if (
    understanding.goals.length > 1
  ) {
    contextLines.push(
      `User goals: ${understanding.goals.join(", ")}`
    );
  }

  if (
    understanding.needsHistory
  ) {
    contextLines.push(
      "The user is asking for longitudinal or previous-result context."
    );
  }

  if (
    contextLines.length === 0
  ) {
    return question;
  }

  return [
    question,
    "",
    "Resolved semantic conversation context:",
    ...contextLines,
  ].join(
    "\n"
  );
}

function resolveClinicalExplanationEvidence(
  latestReport:
    NonNullable<
      AssistantResponseHealthContext["latestReportContext"]
    >,
  mode:
    AssistantClinicalExplanationMode
) {
  if (
  mode ===
    "full" &&
  (
    latestReport
      .expandedReportEvidence
      ?.length ??
    0
  ) >
    0
) {
  return latestReport
    .expandedReportEvidence!;
}

  return latestReport
    .reportEvidence;
}

function canGenerateClinicalExplanation(
  input:
    EnhanceAssistantClinicalResponseInput
): boolean {
  if (
    !isClinicalExplanationEnabled() ||
    input.deterministicResult
      .reasoning
      .mode !== "answer" ||
    input.deterministicResult
      .reasoning
      .clinicalUrgencyLevel !==
      "none" ||
    input.deterministicResult
      .reasoning
      .productNavigation
      ?.matched ||
    !isEligibleIntent(
    input.question,
    input.semanticRoutingDecision
    )
  ) {
    return false;
  }

  const latestReport =
    input.healthContext
      ?.latestReportContext;

  const knowledge =
    input.healthContext
      ?.wholeBodyKnowledge;

  return Boolean(
    latestReport &&
    latestReport.reportEvidence.length >
      0 &&
    knowledge
  );
}

export async function enhanceAssistantClinicalResponse(
  input:
    EnhanceAssistantClinicalResponseInput
): Promise<AssistantOrchestratorResult> {
  if (
    !canGenerateClinicalExplanation(
      input
    )
  ) {
    return input.deterministicResult;
  }

  const latestReport =
    input.healthContext
      ?.latestReportContext;

  const knowledge =
    input.healthContext
      ?.wholeBodyKnowledge;

  if (
    !latestReport ||
    !knowledge
  ) {
    return input.deterministicResult;
  }

  const timer =
    startApiTimer();

  const explanationMode =
  resolveClinicalExplanationMode(
    input.question,
    input.semanticRoutingDecision
  );

const semanticClinicalQuestion =
  buildSemanticClinicalQuestion(
    input.question,
    input.semanticRoutingDecision
  );

    const explanationEvidence =
    resolveClinicalExplanationEvidence(
      latestReport,
      explanationMode
    );

  const explanationReport = {
    ...latestReport,

    reportEvidence:
      explanationEvidence,
  };

  try {
    const rawExplanation =
      await input.client.generate({
        question:
          semanticClinicalQuestion,

        language:
          input.language,

        mode:
          explanationMode,

        report:
          explanationReport,

        knowledge,

        deterministicClinicalNarrative:
          typeof input
            .deterministicResult
            .reasoning
            .clinicalNarrative ===
            "string"
            ? input
                .deterministicResult
                .reasoning
                .clinicalNarrative
            : null,
      });

    const explanation =
    validateAssistantClinicalExplanation(
      rawExplanation,
      explanationEvidence
   );

    if (!explanation) {
  const validationReason =
    diagnoseAssistantClinicalExplanationValidationFailure(
      rawExplanation,
      explanationEvidence
    );

  logApiInfo(
    "assistant.clinical_explanation.rejected",
    {
      route:
        "/api/assistant",

      requestId:
        input.requestId,

      reportId:
        latestReport.reportId,

      reason:
        "validation_failed",

      validationReason,

      durationMs:
        timer.elapsedMs(),
    }
  );

  return input.deterministicResult;
}

    if (
      explanation.urgency ===
        "urgent" ||
      explanation.urgency ===
        "emergency"
    ) {
      logApiInfo(
        "assistant.clinical_explanation.rejected",
        {
          route:
            "/api/assistant",

          requestId:
            input.requestId,

          reportId:
            latestReport.reportId,

          reason:
            "model_urgency_not_authoritative",

          durationMs:
            timer.elapsedMs(),
        }
      );

      return input.deterministicResult;
    }

    const responseIntent =
      detectAssistantIntent(
       input.question
    ).intent;

    const response =
  renderAssistantClinicalExplanation(
    explanation,
    input.language,
    responseIntent ===
      "next-step"
      ? "next-step"
      : responseIntent ===
          "cause-reasoning"
        ? "cause-reasoning"
        : "full"
  );

    logApiInfo(
      "assistant.clinical_explanation.completed",
      {
        route:
          "/api/assistant",

        requestId:
          input.requestId,

        reportId:
          latestReport.reportId,

        priorityFindingCount:
          explanation
            .priorityFindings
            .length,

        relationshipCount:
          explanation
            .relationships
            .length,

        durationMs:
          timer.elapsedMs(),
      }
    );

    return {
      ...input.deterministicResult,

      response,

      reasoning: {
        ...input
          .deterministicResult
          .reasoning,

        clinicalNarrative:
          response,
      },
    };
  } catch (error) {
    logApiError(
      "assistant.clinical_explanation.failed",
      error,
      {
        route:
          "/api/assistant",

        requestId:
          input.requestId,

        reportId:
          latestReport.reportId,

        durationMs:
          timer.elapsedMs(),
      }
    );

    return input.deterministicResult;
  }
}