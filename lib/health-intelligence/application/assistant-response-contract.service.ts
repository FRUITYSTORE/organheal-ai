import type { AssistantOrchestratorResult } from "@/lib/health-intelligence/application/assistant-orchestrator.service";

export type AssistantPublicReasoningMode = "clarify" | "answer";

export type AssistantPublicReasoningSummary = {
  mode: AssistantPublicReasoningMode;

  status: string;

  confidence: unknown;

  intent: unknown;

  clarification: string | null;

  narrative: string | null;

  hasDecisionTrace: boolean;

  hasClinicalInterpretation: boolean;
};

export type AssistantResponseContract = {
  success: true;

  response: string;

  reasoning: AssistantPublicReasoningSummary;
};

function resolveClinicalNarrative(
  result: AssistantOrchestratorResult,
): string | null {
  const narrative = result.reasoning.clinicalNarrative;

  return typeof narrative === "string" && narrative.trim() ? narrative : null;
}

function hasClinicalDecisionTrace(
  result: AssistantOrchestratorResult,
): boolean {
  const trace = result.reasoning.clinicalDecisionTrace;

  if (!trace || typeof trace !== "object") {
    return false;
  }

  if ("available" in trace) {
    return (
      (
        trace as {
          available?: unknown;
        }
      ).available === true
    );
  }

  return true;
}

function hasClinicalInterpretation(
  result: AssistantOrchestratorResult,
): boolean {
  return Boolean(
    result.reasoning.clinicalHypothesisRanking ||
    result.reasoning.clinicalConfidenceCalibration ||
    resolveClinicalNarrative(result),
  );
}

export function buildAssistantResponseContract(
  result: AssistantOrchestratorResult,
): AssistantResponseContract {
  return {
    success: true,

    response: result.response,

    reasoning: {
      mode: result.reasoning.mode,

      status: result.reasoning.status,

      confidence: result.reasoning.confidence,

      intent: result.reasoning.questionIntent,

      clarification: result.reasoning.clarifyingQuestion,

      narrative: resolveClinicalNarrative(result),

      hasDecisionTrace: hasClinicalDecisionTrace(result),

      hasClinicalInterpretation: hasClinicalInterpretation(result),
    },
  };
}
