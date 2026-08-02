import type {
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

import type {
  JourneyIntent,
} from "@/lib/health-intelligence/application/assistant-response/journey-intent";

export type SupportedJourneyHandlerIntent =
  Exclude<
    JourneyIntent,
    "unknown"
  >;

export type JourneyHandlerLanguage =
  | "en"
  | "ar";

export type JourneyHandlerInput = {
  intent:
    SupportedJourneyHandlerIntent;

  lowerMessage:
    string;

  language:
    JourneyHandlerLanguage;

  healthContext:
    AssistantResponseHealthContext;

  nextAction:
    string;
};

export type JourneyHandler =
  (
    input: JourneyHandlerInput
  ) => string | null;