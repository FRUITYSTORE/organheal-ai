import {
  assessQuestionEvidence,
  assessReasoningReadiness,
  decideReasoningPath,
} from "@/lib/health-intelligence/application/assistant-decision.service";

import {
  buildConversationAwareMessage,
} from "@/lib/health-intelligence/application/assistant-conversation.service";

import {
  buildPersonalizedResponse,
  type AssistantResponseConversationMessage,
  type AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response.service";

import {
  detectAssistantIntent,
} from "@/lib/health-intelligence/application/assistant-intent/assistant-intent";

export type AssistantOrchestratorLanguage =
  | "en"
  | "ar";

export type AssistantOrchestratorInput = {
  message: string;
  language: AssistantOrchestratorLanguage;
  healthContext:
    | AssistantResponseHealthContext
    | null;
  conversation:
    AssistantResponseConversationMessage[];
};

export type AssistantOrchestratorReasoning = {
  mode: "clarify" | "answer";

  status: string;
  confidence: unknown;

  availableEvidence: unknown;
  missingInformation: unknown;

  questionIntent: unknown;
  questionEvidenceStatus: unknown;
  questionEvidenceConfidence: unknown;

  questionAvailableEvidence: unknown;
  questionMissingInformation: unknown;

  clarifyingQuestion:
    | string
    | null;

  reason:
    | string
    | null;
};

export type AssistantOrchestratorResult = {
  success: true;
  response: string;
  reasoning: AssistantOrchestratorReasoning;
};

export function runAssistantOrchestrator({
  message,
  language,
  healthContext,
  conversation,
}: AssistantOrchestratorInput): AssistantOrchestratorResult {
  const conversationAwareMessage =
    buildConversationAwareMessage(
      message.trim(),
      conversation
    );

    const detectedIntent =
  detectAssistantIntent(
    conversationAwareMessage
  );

  const reasoningReadiness =
    assessReasoningReadiness(
      healthContext,
      language
    );

  const questionEvidence =
  assessQuestionEvidence(
    conversationAwareMessage,
    healthContext,
    language,
    detectedIntent.intent
  );

  const reasoningDecision =
    decideReasoningPath(
      questionEvidence,
      language
    );

  if (
    reasoningDecision.mode === "clarify" &&
    reasoningDecision.question
  ) {
    return {
      success: true,

      response:
        reasoningDecision.question,

      reasoning: {
        mode: "clarify",

        status:
          reasoningReadiness.status,

        confidence:
          reasoningReadiness.confidence,

        availableEvidence:
          reasoningReadiness.availableEvidence,

        missingInformation:
          reasoningReadiness.missingInformation,

        questionIntent:
          questionEvidence.intent,

        questionEvidenceStatus:
          questionEvidence.status,

        questionEvidenceConfidence:
          questionEvidence.confidence,

        questionAvailableEvidence:
          questionEvidence.availableEvidence,

        questionMissingInformation:
          questionEvidence.missingInformation,

        clarifyingQuestion:
          reasoningDecision.question,

        reason:
          reasoningDecision.reason,
      },
    };
  }

  const response =
    buildPersonalizedResponse(
      conversationAwareMessage,
      language,
      healthContext,
      conversation
    );

  return {
    success: true,

    response,

    reasoning: {
      mode: "answer",

      status:
        reasoningReadiness.status,

      confidence:
        reasoningReadiness.confidence,

      availableEvidence:
        reasoningReadiness.availableEvidence,

      missingInformation:
        reasoningReadiness.missingInformation,

      questionIntent:
        questionEvidence.intent,

      questionEvidenceStatus:
        questionEvidence.status,

      questionEvidenceConfidence:
        questionEvidence.confidence,

      questionAvailableEvidence:
        questionEvidence.availableEvidence,

      questionMissingInformation:
        questionEvidence.missingInformation,

      clarifyingQuestion:
        questionEvidence.clarifyingQuestion,

      reason: null,
    },
  };
}