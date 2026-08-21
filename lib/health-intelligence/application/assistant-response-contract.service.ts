import type {
  AssistantOrchestratorResult,
  AssistantOrchestratorLanguage,
} from "@/lib/health-intelligence/application/assistant-orchestrator.service";

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

export type AssistantProductAction = {
  label: string;

  href: string;
};

export type AssistantResponseContract = {
  success: true;

  response: string;

  reasoning: AssistantPublicReasoningSummary;

  clinicalInterviewId:
    string | null;

  action:
    AssistantProductAction | null;
};

function resolveClinicalNarrative(
  result: AssistantOrchestratorResult,
): string | null {
  const narrative = result.reasoning.clinicalNarrative;

  return typeof narrative === "string" && narrative.trim()
    ? narrative
    : null;
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

function resolveProductAction(
  result: AssistantOrchestratorResult,
  language: AssistantOrchestratorLanguage,
): AssistantProductAction | null {
  if (result.reasoning.mode === "clarify") {
    return null;
  }

  const intent = result.reasoning.questionIntent;

  switch (intent) {
    case "report":
      return {
        label:
          language === "ar"
            ? "فتح التقارير"
            : "Open Reports",

        href: "/reports",
      };

    case "doctor":
      return {
        label:
          language === "ar"
            ? "فتح بوابة الطبيب"
            : "Open Doctor Portal",

        href: "/doctor-portal",
      };

    case "next-step":
    case "improvement":
      return {
        label:
          language === "ar"
            ? "فتح الخطة الصحية"
            : "Open Health Plan",

        href: "/health-plan",
      };

    case "risk":
    case "score":
    case "health-age":
      return {
        label:
          language === "ar"
            ? "فتح التحليل الصحي"
            : "Open Intelligence",

        href: "/intelligence",
      };

    case "cause-reasoning":
    case "general":
    default:
      return null;
  }
}

export function buildAssistantResponseContract(
  result: AssistantOrchestratorResult,
  clinicalInterviewId: string | null = null,
  language: AssistantOrchestratorLanguage = "en",
): AssistantResponseContract {
  return {
    success: true,

    response: result.response,

    clinicalInterviewId,

    action:
      resolveProductAction(
        result,
        language,
      ),

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