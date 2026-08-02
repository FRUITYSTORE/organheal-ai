import type {
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

import type {
  ClinicalIntent,
} from "@/lib/health-intelligence/application/assistant-response/clinical-intent";

export type SupportedClinicalHandlerIntent =
  Exclude<
    ClinicalIntent,
    "unknown"
  >;

export type ClinicalHandlerLanguage =
  | "en"
  | "ar";

export type ClinicalHandlerInput = {
  intent:
    SupportedClinicalHandlerIntent;

  lowerMessage:
    string;

  language:
    ClinicalHandlerLanguage;

  healthContext:
    AssistantResponseHealthContext;

  nextAction:
    string;
};

export type ClinicalHandler =
  (
    input: ClinicalHandlerInput
  ) => string | null;