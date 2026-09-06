import type {
  AssistantIntent,
} from "@/lib/health-intelligence/application/assistant-intent/assistant-intent.types";

import type {
  AssistantSemanticRoutingDecision,
} from "./assistant-semantic-routing.types";

export function mapSemanticUnderstandingToAssistantIntent(
  decision:
    AssistantSemanticRoutingDecision | null | undefined
): AssistantIntent | null {
  const understanding =
    decision?.understanding;

  if (!understanding) {
    return null;
  }

  const goals =
    understanding.goals;

  if (
    understanding.asksForDiagnosis ||
    goals.includes(
      "diagnostic-meaning"
    ) ||
    goals.includes(
      "cause"
    )
  ) {
    return "cause-reasoning";
  }

  if (
    understanding.asksForAction ||
    goals.includes(
      "next-step"
    )
  ) {
    return "next-step";
  }

  if (
    understanding.asksForUrgency ||
    goals.includes(
      "risk"
    ) ||
    goals.includes(
      "significance"
    )
  ) {
    return "risk";
  }

  if (
    goals.includes(
      "doctor-preparation"
    )
  ) {
    return "doctor";
  }

  if (
    goals.includes(
      "history"
    ) ||
    goals.includes(
      "compare"
    ) ||
    goals.includes(
      "summarize"
    ) ||
    understanding.needsReportEvidence
  ) {
    return "report";
  }

  return null;
}