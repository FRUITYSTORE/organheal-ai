import type {
  PatientClinicalLongitudinalComparison,
} from "@/lib/application/clinical/patient-clinical-longitudinal-comparison.service";

import {
  logApiError,
  logApiInfo,
  startApiTimer,
} from "@/lib/api/api-logger";

import type {
  AssistantOrchestratorResult,
} from "@/lib/health-intelligence/application/assistant-orchestrator.service";

import type {
  AssistantClinicalGenerationOutcome,
} from "@/lib/health-intelligence/application/assistant-clinical-explanation/assistant-clinical-generation-outcome";

import type {
  AssistantSemanticRoutingDecision,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/assistant-semantic-routing.types";

import type {
  AssistantMultiReportClinicalExplanationClient,
} from "@/lib/health-intelligence/application/assistant-multi-report-comparison/assistant-multi-report-clinical-explanation.types";

import {
  validateAssistantMultiReportClinicalExplanation,
} from "@/lib/health-intelligence/application/assistant-multi-report-comparison/validate-assistant-multi-report-clinical-explanation";

import {
  renderAssistantMultiReportClinicalExplanation,
} from "@/lib/health-intelligence/application/assistant-multi-report-comparison/render-assistant-multi-report-clinical-explanation";

export type EnhanceAssistantMultiReportClinicalResponseInput = {
  question:
    string;

  language:
    "en" | "ar";

  comparison:
    PatientClinicalLongitudinalComparison;

  deterministicResult:
    AssistantOrchestratorResult;

  semanticRoutingDecision?:
    AssistantSemanticRoutingDecision | null;

  client:
    AssistantMultiReportClinicalExplanationClient;

  requestId:
    string;
};

function isEnabled():
  boolean {
  return (
    process.env
      .OPENAI_CLINICAL_EXPLANATION_ENABLED
      ?.trim()
      .toLowerCase() ===
    "true"
  );
}

function buildSemanticQuestion(
  question:
    string,
  decision?:
    AssistantSemanticRoutingDecision | null
): string {
  const understanding =
    decision
      ?.understanding;

  if (
    !understanding
  ) {
    return question;
  }

  const context:
    string[] = [];

  if (
    understanding.subject.value
  ) {
    context.push(
      `Resolved subject: ${understanding.subject.value}`
    );
  }

  if (
    understanding.goals.length >
    0
  ) {
    context.push(
      `User goals: ${understanding.goals.join(", ")}`
    );
  }

  if (
    understanding.asksForAction
  ) {
    context.push(
      "The user is asking what to do next."
    );
  }

  if (
    understanding.needsHistory
  ) {
    context.push(
      "The user explicitly wants longitudinal comparison."
    );
  }

  if (
    context.length ===
    0
  ) {
    return question;
  }

  return [
    question,
    "",
    "Resolved semantic context:",
    ...context,
  ].join(
    "\n"
  );
}

function canGenerate(
  input:
    EnhanceAssistantMultiReportClinicalResponseInput
): boolean {
  return Boolean(
    isEnabled() &&
    input.deterministicResult
      .reasoning.mode ===
      "answer" &&
    input.deterministicResult
      .reasoning
      .clinicalUrgencyLevel ===
      "none" &&
    !input.deterministicResult
      .reasoning
      .productNavigation
      ?.matched &&
    input.comparison.reportCount >=
      2 &&
    input.comparison
      .comparableMarkerCount >
      0
  );
}

export async function generateAssistantMultiReportClinicalResponseOutcome(
  input:
    EnhanceAssistantMultiReportClinicalResponseInput
): Promise<
  AssistantClinicalGenerationOutcome
> {
  if (
    !canGenerate(
      input
    )
  ) {
    return {
      status:
        "not-eligible",

      result:
        input.deterministicResult,
    };
  }

  const timer =
    startApiTimer();

  try {
    const raw =
      await input.client.generate({
        question:
          buildSemanticQuestion(
            input.question,
            input.semanticRoutingDecision
          ),

        language:
          input.language,

        comparison:
          input.comparison,

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
      validateAssistantMultiReportClinicalExplanation(
        raw,
        input.comparison
      );

    if (
      !explanation
    ) {
      logApiInfo(
        "assistant.multi_report_clinical_explanation.rejected",
        {
          route:
            "/api/assistant",

          requestId:
            input.requestId,

          reason:
            "validation_failed",

          reportCount:
            input.comparison
              .reportCount,

          markerCount:
            input.comparison
              .comparableMarkerCount,

          durationMs:
            timer.elapsedMs(),
        }
      );

      return {
        status:
          "validation-rejected",

        result:
          input.deterministicResult,
      };
    }

    const response =
      renderAssistantMultiReportClinicalExplanation(
        explanation,
        input.comparison,
        input.language
      );

    logApiInfo(
      "assistant.multi_report_clinical_explanation.completed",
      {
        route:
          "/api/assistant",

        requestId:
          input.requestId,

        reportCount:
          input.comparison
            .reportCount,

        markerCount:
          input.comparison
            .comparableMarkerCount,

        selectedChangeCount:
          explanation
            .importantChanges
            .length,

        durationMs:
          timer.elapsedMs(),
      }
    );

    const result:
      AssistantOrchestratorResult = {
        ...input
          .deterministicResult,

        response,

        reasoning: {
          ...input
            .deterministicResult
            .reasoning,

          clinicalNarrative:
            response,
        },
      };

    return {
      status:
        "completed",

      result,
    };
  } catch (
    error
  ) {
    logApiError(
      "assistant.multi_report_clinical_explanation.failed",
      error,
      {
        route:
          "/api/assistant",

        requestId:
          input.requestId,

        reportCount:
          input.comparison
            .reportCount,

        durationMs:
          timer.elapsedMs(),
      }
    );

    return {
      status:
        "provider-failed",

      result:
        input.deterministicResult,
    };
  }
}

/*
 * Backward-compatible API.
 *
 * Existing callers continue receiving AssistantOrchestratorResult
 * while the assistant route migrates to the explicit outcome contract.
 */
export async function enhanceAssistantMultiReportClinicalResponse(
  input:
    EnhanceAssistantMultiReportClinicalResponseInput
): Promise<
  AssistantOrchestratorResult
> {
  const outcome =
    await generateAssistantMultiReportClinicalResponseOutcome(
      input
    );

  return outcome.result;
}