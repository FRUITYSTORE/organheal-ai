import type {
  ReasoningIntent,
} from "@/lib/health-intelligence/application/assistant-decision.service";

import type {
  AssistantIntent,
} from "./assistant-intent.types";

export function mapAssistantIntentToReasoningIntent(
  intent: AssistantIntent
): ReasoningIntent {
  switch (intent) {
    case "report":
      return "report_summary";

    case "doctor":
      return "doctor_preparation";

    case "cause-reasoning":
      return "cause_reasoning";

    default:
      return "general";
  }
}