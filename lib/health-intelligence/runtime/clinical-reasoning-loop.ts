import type {
  AssistantIntent,
} from "@/lib/health-intelligence/application/assistant-intent/assistant-intent";

import type {
  AssistantResponseConversationMessage,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

import {
  interpretClinicalConversation,
  type ClinicalConversationInterpretation,
} from "@/lib/health-intelligence/runtime/clinical-conversation-interpreter";

import {
  buildClinicalReasoningRuntime,
  type ClinicalReasoningRuntime,
} from "@/lib/health-intelligence/runtime/clinical-reasoning-runtime";

import {
  createClinicalReasoningState,
  updateClinicalReasoningState,
  type ClinicalReasoningState,
  type StructuredClinicalEvidenceReference,
} from "@/lib/health-intelligence/runtime/clinical-reasoning-state";

import type {
  ClinicalClarificationLanguage,
} from "@/lib/health-intelligence/engines/clinical-clarification-selector.engine";

import type {
  ClinicalEvidenceGapType,
} from "@/lib/health-intelligence/models/clinical-evidence-sufficiency";

import type {
  WholeBodyClinicalKnowledgeModel,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

export type RunClinicalReasoningLoopInput = {
  question:
    string;

  intent:
    AssistantIntent;

  language?:
    ClinicalClarificationLanguage;

  knowledge:
    WholeBodyClinicalKnowledgeModel;

  conversation:
    AssistantResponseConversationMessage[];

  previousState?:
    ClinicalReasoningState | null;

  memoryEvidence?:
    StructuredClinicalEvidenceReference[];

  timestamp?:
    string;
};

export type ClinicalReasoningLoopResult = {
  interpretation:
    ClinicalConversationInterpretation;

  runtime:
    ClinicalReasoningRuntime;

  state:
    ClinicalReasoningState;

  isNewState:
    boolean;

  stateWasUpdated:
    boolean;

  answeredQuestionId:
    string | null;

  resolvedGapType:
    ClinicalEvidenceGapType | null;

  userEvidence:
    string | null;

  generatedAt:
    string;
};

function collectPreviouslyAskedQuestionIds(
  previousState:
    ClinicalReasoningState | null,
  interpretation:
    ClinicalConversationInterpretation,
  memoryEvidence:
    StructuredClinicalEvidenceReference[]
): string[] {
  const values = [
    ...(
      previousState
        ?.askedClarificationQuestionIds ??
      []
    ),

    ...memoryEvidence
      .map(
        (evidence) =>
          evidence.sourceId
      )
      .filter(
        (
          value
        ): value is string =>
          typeof value ===
            "string" &&
          value.length >
            0
      ),
  ];

  if (
    interpretation
      .answeredQuestionId
  ) {
    values.push(
      interpretation
        .answeredQuestionId
    );
  }

  return [
    ...new Set(
      values
    ),
  ];
}

function collectResolvedGapTypes(
  previousState:
    ClinicalReasoningState | null,
  interpretation:
    ClinicalConversationInterpretation,
  memoryEvidence:
    StructuredClinicalEvidenceReference[]
): ClinicalEvidenceGapType[] {
  const values = [
    ...(
      previousState
        ?.resolvedGapTypes ??
      []
    ),

    ...memoryEvidence
      .map(
        (evidence) =>
          evidence.resolvedGapType
      )
      .filter(
        (
          value
        ): value is ClinicalEvidenceGapType =>
          value !==
          null
      ),
  ];

  if (
    interpretation
      .shouldUpdateState &&
    interpretation
      .answeredGapType
  ) {
    values.push(
      interpretation
        .answeredGapType
    );
  }

  return [
    ...new Set(
      values
    ),
  ];
}

function createEmptyInterpretation():
  ClinicalConversationInterpretation {
  return {
    isClarificationAnswer:
      false,

    shouldUpdateState:
      false,

    answeredQuestionId:
      null,

    answeredGapType:
      null,

    userEvidence:
      null,

    confidence:
      "low",

    reason:
      "No previous clinical reasoning state exists, so the current message begins a new reasoning loop.",
  };
}

function mergeClinicalMemoryEvidence(
  knowledge:
    WholeBodyClinicalKnowledgeModel,
  memoryEvidence:
    StructuredClinicalEvidenceReference[]
): WholeBodyClinicalKnowledgeModel {
  if (
    memoryEvidence.length ===
    0
  ) {
    return knowledge;
  }

  const memoryBySourceId =
    new Map(
      memoryEvidence
        .filter(
          (evidence) =>
            evidence.sourceId !==
            null
        )
        .map(
          (evidence) => [
            evidence.sourceId as string,
            evidence,
          ]
        )
    );

  if (
    memoryBySourceId.size ===
    0
  ) {
    return knowledge;
  }

  return {
    ...knowledge,

    nodes:
      knowledge.nodes.map(
        (node) => {
          const matchingMemory =
            node.evidence
              .map(
                (evidence) =>
                  evidence.sourceId
                    ? memoryBySourceId.get(
                        evidence.sourceId
                      )
                    : undefined
              )
              .filter(
                (
                  evidence
                ): evidence is StructuredClinicalEvidenceReference =>
                  evidence !==
                  undefined
              );

          if (
            matchingMemory.length ===
            0
          ) {
            return node;
          }

          const existingIds =
            new Set(
              node.evidence.map(
                (evidence) =>
                  evidence.id
              )
            );

          return {
            ...node,

            evidence: [
              ...node.evidence,

              ...matchingMemory.filter(
                (evidence) =>
                  !existingIds.has(
                    evidence.id
                  )
              ),
            ],
          };
        }
      ),
  };
}

export function runClinicalReasoningLoop({
  question,
  intent,
  language = "en",
  knowledge,
  conversation,
  previousState = null,
  memoryEvidence = [],
  timestamp =
    new Date().toISOString(),
}: RunClinicalReasoningLoopInput):
  ClinicalReasoningLoopResult {
  const normalizedQuestion =
    question.trim();

    const reasoningKnowledge =
  mergeClinicalMemoryEvidence(
    knowledge,
    memoryEvidence
  );

  const interpretation =
    previousState
      ? interpretClinicalConversation({
          message:
            normalizedQuestion,

          conversation,
        })
      : createEmptyInterpretation();

  const previouslyAskedQuestionIds =
  collectPreviouslyAskedQuestionIds(
    previousState,
    interpretation,
    memoryEvidence
  );

const resolvedGapTypes =
  collectResolvedGapTypes(
    previousState,
    interpretation,
    memoryEvidence
  );

  const runtime =
    buildClinicalReasoningRuntime({
      question:
        normalizedQuestion,

      intent,

      language,

      knowledge:
        reasoningKnowledge,

      resolvedGapTypes,

      previouslyAskedQuestionIds,
    });

  if (
    !previousState
  ) {
    const state =
      createClinicalReasoningState({
        runtime,

        timestamp,
      });

    return {
      interpretation,

      runtime,

      state,

      isNewState:
        true,

      stateWasUpdated:
        false,

      answeredQuestionId:
        null,

      resolvedGapType:
        null,

      userEvidence:
        null,

      generatedAt:
        timestamp,
    };
  }

  const state =
    updateClinicalReasoningState({
      state:
        previousState,

      runtime,

      userEvidence:
        interpretation
          .shouldUpdateState
          ? interpretation
              .userEvidence
          : null,

      answeredQuestionId:
        interpretation
          .shouldUpdateState
          ? interpretation
              .answeredQuestionId
          : null,

      resolvedGapType:
        interpretation
          .shouldUpdateState
          ? interpretation
              .answeredGapType
          : null,

      timestamp,
    });

  return {
    interpretation,

    runtime,

    state,

    isNewState:
      false,

    stateWasUpdated:
      interpretation
        .shouldUpdateState,

    answeredQuestionId:
      interpretation
        .answeredQuestionId,

    resolvedGapType:
      interpretation
        .shouldUpdateState
        ? interpretation
            .answeredGapType
        : null,

    userEvidence:
      interpretation
        .shouldUpdateState
        ? interpretation
            .userEvidence
        : null,

    generatedAt:
      timestamp,
  };
}