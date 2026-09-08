import type {
  AssistantOrchestratorResult,
} from "@/lib/health-intelligence/application/assistant-orchestrator.service";

import type {
  AssistantResponseConversationMessage,
} from "@/lib/health-intelligence/application/assistant-response.service";

import type {
  AssistantSemanticRoutingDecision,
} from "@/lib/health-intelligence/application/assistant-semantic-routing/assistant-semantic-routing.types";

import type {
  AssistantGeneralIntelligenceClient,
  AssistantGeneralIntelligenceLanguage,
} from "./assistant-general-intelligence.types";

export type EnhanceAssistantGeneralResponseInput = {
  message:
    string;

  language:
    AssistantGeneralIntelligenceLanguage;

  conversation:
    AssistantResponseConversationMessage[];

  semanticRoutingDecision:
    AssistantSemanticRoutingDecision | null;

  deterministicResult:
    AssistantOrchestratorResult;

  client:
    AssistantGeneralIntelligenceClient;
};

function shouldUseGeneralIntelligence(
  input:
    EnhanceAssistantGeneralResponseInput
): boolean {
  if (
    input.deterministicResult
      .reasoning.mode === "clarify"
  ) {
    return false;
  }

  if (
    input.deterministicResult
      .reasoning.clinicalUrgencyLevel !==
    "none"
  ) {
    return false;
  }

  const semanticDecision =
    input.semanticRoutingDecision;

  if (!semanticDecision) {
    return false;
  }

  if (
    semanticDecision.domain ===
      "product_navigation" ||
    semanticDecision.domain ===
      "clinical_question" ||
    semanticDecision.domain ===
      "health_journey"
  ) {
    return false;
  }

  const understanding =
    semanticDecision.understanding;

  if (
    understanding?.referentStatus ===
      "ambiguous" ||
    understanding?.referentStatus ===
      "missing"
  ) {
    return false;
  }

  if (
    understanding?.needsReportEvidence ||
    understanding?.needsHistory
  ) {
    return false;
  }

  return (
    semanticDecision.domain ===
      "general_conversation" ||
    semanticDecision.domain ===
      "general_health" ||
    semanticDecision.domain ===
      "unclear"
  );
}

export async function enhanceAssistantGeneralResponse(
  input:
    EnhanceAssistantGeneralResponseInput
): Promise<AssistantOrchestratorResult> {
  if (
    !shouldUseGeneralIntelligence(
      input
    )
  ) {
    return input.deterministicResult;
  }

  try {
    const generatedResponse =
      await input.client.generate({
        message:
          input.message,

        language:
          input.language,

        conversation:
          input.conversation,
      });

    const response =
      generatedResponse.trim();

    if (!response) {
      return input.deterministicResult;
    }

    return {
      ...input.deterministicResult,

      response,
    };
  } catch {
    /*
     * General intelligence is an enhancement.
     * Provider failure must never make the
     * entire assistant request fail.
     */
    return input.deterministicResult;
  }
}