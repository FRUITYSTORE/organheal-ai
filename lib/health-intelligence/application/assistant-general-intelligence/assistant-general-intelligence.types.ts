import type {
  AssistantResponseConversationMessage,
} from "@/lib/health-intelligence/application/assistant-response.service";

export type AssistantGeneralIntelligenceLanguage =
  | "en"
  | "ar";

export type AssistantGeneralIntelligenceInput = {
  message:
    string;

  language:
    AssistantGeneralIntelligenceLanguage;

  conversation:
    AssistantResponseConversationMessage[];
};

export type AssistantGeneralIntelligenceClient = {
  generate(
    input:
      AssistantGeneralIntelligenceInput
  ): Promise<string>;
};