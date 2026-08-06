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

import {
  runClinicalReasoningLoop,
} from "@/lib/health-intelligence/runtime/clinical-reasoning-loop";

export type AssistantOrchestratorLanguage =
  | "en"
  | "ar";

export type AssistantOrchestratorInput = {
  message:
    string;

  language:
    AssistantOrchestratorLanguage;

  healthContext:
    | AssistantResponseHealthContext
    | null;

  conversation:
    AssistantResponseConversationMessage[];
};

export type AssistantOrchestratorReasoning = {
  mode:
    | "clarify"
    | "answer";

  status:
    string;

  confidence:
    unknown;

  availableEvidence:
    unknown;

  missingInformation:
    unknown;

  questionIntent:
    unknown;

  questionEvidenceStatus:
    unknown;

  questionEvidenceConfidence:
    unknown;

  questionAvailableEvidence:
    unknown;

  questionMissingInformation:
    unknown;

  clarifyingQuestion:
    | string
    | null;

  reason:
    | string
    | null;
};

export type AssistantOrchestratorResult = {
  success:
    true;

  response:
    string;

  reasoning:
    AssistantOrchestratorReasoning;
};

export function runAssistantOrchestrator({
  message,
  language,
  healthContext,
  conversation,
}: AssistantOrchestratorInput):
  AssistantOrchestratorResult {
  const conversationAwareMessage =
    buildConversationAwareMessage(
      message.trim(),
      conversation
    );

  const detectedIntent =
    detectAssistantIntent(
      conversationAwareMessage
    );

   const clinicalReasoningLoop =
    healthContext
      ?.wholeBodyKnowledge
      ? runClinicalReasoningLoop({
          question:
            conversationAwareMessage,

          intent:
            detectedIntent.intent,

          language,

          knowledge:
            healthContext
              .wholeBodyKnowledge,

          conversation,

          /*
           * The loop is now the authoritative runtime entry
           * point inside the assistant request pipeline.
           *
           * Persistent or reconstructed reasoning state will
           * be supplied in the next scoped integration step.
           */
          previousState:
            null,
        })
      : null;

  const clinicalReasoningRuntime =
    clinicalReasoningLoop
      ?.runtime ??
    null;

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

  /*
   * Controlled whole-body reasoning authority:
   *
   * The clinical runtime may independently request
   * clarification for cause-reasoning and risk questions.
   *
   * The legacy decision remains available as a fallback.
   *
   * Report summaries, doctor preparation, scores,
   * health-age questions, and general educational questions
   * are not forced into clarification by this migration step.
   */
  const clinicalClarification =
    clinicalReasoningRuntime
      ?.clarification
      .question ??
    null;

  const clinicalIntentCanLeadClarification =
    detectedIntent.intent ===
      "cause-reasoning" ||
    detectedIntent.intent ===
      "risk";

  const clinicalRuntimeRequestsClarification =
    Boolean(
      clinicalIntentCanLeadClarification &&
        clinicalReasoningRuntime
          ?.requiresClarification &&
        clinicalClarification
    );

  const legacyRequestsClarification =
    reasoningDecision.mode ===
      "clarify" &&
    Boolean(
      reasoningDecision.question
    );

  const shouldClarify =
    clinicalRuntimeRequestsClarification ||
    legacyRequestsClarification;

  const selectedClarificationQuestion =
    clinicalRuntimeRequestsClarification
      ? clinicalClarification
          ?.question ??
        null
      : legacyRequestsClarification
        ? clinicalClarification
            ?.question ??
          reasoningDecision.question
        : null;

  const selectedClarificationReason =
    clinicalRuntimeRequestsClarification
      ? clinicalReasoningRuntime
          ?.clarification
          .reason ??
        clinicalClarification
          ?.reason ??
        null
      : legacyRequestsClarification &&
          clinicalClarification
        ? clinicalReasoningRuntime
            ?.clarification
            .reason ??
          clinicalClarification.reason
        : reasoningDecision.reason;

  if (
    shouldClarify &&
    selectedClarificationQuestion
  ) {
    return {
      success:
        true,

      response:
        selectedClarificationQuestion,

      reasoning: {
        mode:
          "clarify",

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
          selectedClarificationQuestion,

        reason:
          selectedClarificationReason,
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
    success:
      true,

    response,

    reasoning: {
      mode:
        "answer",

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

      reason:
        null,
    },
  };
}