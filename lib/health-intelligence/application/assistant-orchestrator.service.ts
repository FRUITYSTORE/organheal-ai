import {
  assessQuestionEvidence,
  assessReasoningReadiness,
  decideReasoningPath,
} from "@/lib/health-intelligence/application/assistant-decision.service";

import { buildConversationAwareMessage } from "@/lib/health-intelligence/application/assistant-conversation.service";

import {
  buildPersonalizedResponse,
  type AssistantResponseConversationMessage,
  type AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response.service";

import { detectAssistantIntent } from "@/lib/health-intelligence/application/assistant-intent/assistant-intent";

import { runClinicalReasoningLoop } from "@/lib/health-intelligence/runtime/clinical-reasoning-loop";

import { composeClinicalResponse } from "@/lib/health-intelligence/application/clinical-response-composer.service";

export type AssistantOrchestratorLanguage = "en" | "ar";

export type AssistantOrchestratorInput = {
  message: string;

  language: AssistantOrchestratorLanguage;

  healthContext: AssistantResponseHealthContext | null;

  conversation: AssistantResponseConversationMessage[];
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

  clinicalHypothesisRanking: unknown;

  clinicalConflictResolution: unknown;

  clinicalConfidenceCalibration: unknown;

  clinicalDecisionTrace?: unknown;

  clinicalNarrative?: unknown;

  clarifyingQuestion: string | null;

  reason: string | null;
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
  const conversationAwareMessage = buildConversationAwareMessage(
    message.trim(),
    conversation,
  );

  const detectedIntent = detectAssistantIntent(conversationAwareMessage);

  const clinicalReasoningLoop = healthContext?.wholeBodyKnowledge
    ? runClinicalReasoningLoop({
        question: conversationAwareMessage,

        intent: detectedIntent.intent,

        language,

        knowledge: healthContext.wholeBodyKnowledge,

        conversation,

        /*
         * The loop is now the authoritative runtime entry
         * point inside the assistant request pipeline.
         *
         * Persistent or reconstructed reasoning state will
         * be supplied in the next scoped integration step.
         */
        previousState: null,
      })
    : null;

  const clinicalReasoningRuntime = clinicalReasoningLoop?.runtime ?? null;

  const clinicalResponseComposition = clinicalReasoningRuntime
    ? composeClinicalResponse({
        language,

        ranking: clinicalReasoningRuntime.hypothesisRanking,

        conflictResolution: clinicalReasoningRuntime.conflictResolution,

        confidenceCalibration: clinicalReasoningRuntime.confidenceCalibration,
      })
    : null;

  const reasoningReadiness = assessReasoningReadiness(healthContext, language);

  const questionEvidence = assessQuestionEvidence(
    conversationAwareMessage,
    healthContext,
    language,
    detectedIntent.intent,
  );

  const reasoningDecision = decideReasoningPath(questionEvidence, language);

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
    clinicalReasoningRuntime?.clarification.question ?? null;

  const clinicalIntentCanLeadClarification =
    detectedIntent.intent === "cause-reasoning" ||
    detectedIntent.intent === "risk";

  const clinicalRuntimeOwnsClarification = Boolean(
    clinicalIntentCanLeadClarification &&
    clinicalReasoningRuntime?.requiresClarification &&
    clinicalClarification,
  );

  const clinicalRuntimeRequestsClarification = clinicalRuntimeOwnsClarification;

  const legacyRequestsClarification = Boolean(
    !clinicalRuntimeOwnsClarification &&
    reasoningDecision.mode === "clarify" &&
    reasoningDecision.question,
  );

      const normalizedQuestion =
    conversationAwareMessage
      .toLocaleLowerCase();

  const hasExplicitReportReference =
    normalizedQuestion.includes(
      "report"
    ) ||
    normalizedQuestion.includes(
      "lab"
    ) ||
    normalizedQuestion.includes(
      "laboratory"
    ) ||
    normalizedQuestion.includes(
      "result"
    ) ||
    normalizedQuestion.includes(
      "finding"
    ) ||
    normalizedQuestion.includes(
      "تقرير"
    ) ||
    normalizedQuestion.includes(
      "فحص"
    ) ||
    normalizedQuestion.includes(
      "نتيجة"
    ) ||
    normalizedQuestion.includes(
      "نتائج"
    );

  const isReportGroundedQuestion =
    Boolean(
      healthContext
        ?.latestReportContext &&
      hasExplicitReportReference
    );

  const shouldClarify =
    !isReportGroundedQuestion &&
    (
      clinicalRuntimeRequestsClarification ||
      legacyRequestsClarification
    );

  const selectedClarificationQuestion = clinicalRuntimeRequestsClarification
    ? (clinicalClarification?.question ?? null)
    : legacyRequestsClarification
      ? reasoningDecision.question
      : null;

  const selectedClarificationReason = clinicalRuntimeRequestsClarification
    ? (clinicalReasoningRuntime?.clarification.reason ??
      clinicalClarification?.reason ??
      null)
    : legacyRequestsClarification
      ? reasoningDecision.reason
      : null;

  if (shouldClarify && selectedClarificationQuestion) {
    return {
      success: true,

      response: selectedClarificationQuestion,

      reasoning: {
        mode: "clarify",

        status: reasoningReadiness.status,

        confidence: reasoningReadiness.confidence,

        availableEvidence: reasoningReadiness.availableEvidence,

        missingInformation: reasoningReadiness.missingInformation,

        questionIntent: questionEvidence.intent,

        questionEvidenceStatus: questionEvidence.status,

        questionEvidenceConfidence: questionEvidence.confidence,

        questionAvailableEvidence: questionEvidence.availableEvidence,

        questionMissingInformation: questionEvidence.missingInformation,

        clinicalHypothesisRanking:
          clinicalReasoningRuntime?.hypothesisRanking ?? null,

        clinicalConflictResolution:
          clinicalReasoningRuntime?.conflictResolution ?? null,

        clinicalConfidenceCalibration:
          clinicalReasoningRuntime?.confidenceCalibration ?? null,

        clinicalDecisionTrace: clinicalReasoningRuntime?.decisionTrace ?? null,

        clinicalNarrative: clinicalResponseComposition?.response ?? null,

        clarifyingQuestion: selectedClarificationQuestion,

        reason: selectedClarificationReason,
      },
    };
  }

  const personalizedResponse = buildPersonalizedResponse(
    conversationAwareMessage,
    language,
    healthContext,
    conversation,
  );

  /*
 * Explicit report-grounded questions are answered by the
 * report-aware personalized response.
 *
 * The clinical composer remains authoritative for clinical
 * reasoning questions, but it must not replace a response
 * that is explicitly grounded in the user's saved report.
 */
const response =
  isReportGroundedQuestion
    ? personalizedResponse
    : clinicalResponseComposition?.available &&
        clinicalResponseComposition.response
      ? clinicalResponseComposition.response
      : personalizedResponse;

  return {
    success: true,

    response,

    reasoning: {
      mode: "answer",

      status: reasoningReadiness.status,

      confidence: reasoningReadiness.confidence,

      availableEvidence: reasoningReadiness.availableEvidence,

      missingInformation: reasoningReadiness.missingInformation,

      questionIntent: questionEvidence.intent,

      questionEvidenceStatus: questionEvidence.status,

      questionEvidenceConfidence: questionEvidence.confidence,

      questionAvailableEvidence: questionEvidence.availableEvidence,

      questionMissingInformation: questionEvidence.missingInformation,

      clinicalHypothesisRanking:
        clinicalReasoningRuntime?.hypothesisRanking ?? null,

      clinicalConflictResolution:
        clinicalReasoningRuntime?.conflictResolution ?? null,

      clinicalConfidenceCalibration:
        clinicalReasoningRuntime?.confidenceCalibration ?? null,

      clinicalDecisionTrace: clinicalReasoningRuntime?.decisionTrace ?? null,

      clinicalNarrative: clinicalResponseComposition?.response ?? null,

      clarifyingQuestion: questionEvidence.clarifyingQuestion,

      reason: null,
    },
  };
}
