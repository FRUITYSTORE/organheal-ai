import type {
  AssistantIntent,
} from "@/lib/health-intelligence/application/assistant-intent/assistant-intent";

import type {
  ClinicalEvidenceGapType,
} from "@/lib/health-intelligence/models/clinical-evidence-sufficiency";

import type {
  ClinicalEvidenceReference,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

import type {
  ClinicalReasoningMode,
  ClinicalReasoningRuntime,
} from "@/lib/health-intelligence/runtime/clinical-reasoning-runtime";

export type PatientEvidenceCategory =
  | "general"
  | "symptom-context"
  | "health-history"
  | "patient-context"
  | "additional-evidence"
  | "relationship-context"
  | "unresolved-clinical-focus";

export type StructuredClinicalEvidenceReference =
  ClinicalEvidenceReference & {
    patientEvidenceCategory:
      PatientEvidenceCategory;

    resolvedGapType:
      ClinicalEvidenceGapType | null;
  };

export type ClinicalReasoningStateStatus =
  | "awaiting-clarification"
  | "provisional"
  | "ready"
  | "closed";

export type ClinicalReasoningHistoryEntry = {
  id:
    string;

  question:
    string;

  intent:
    AssistantIntent;

  mode:
    ClinicalReasoningMode;

  reasoningPermission:
    ClinicalReasoningRuntime["reasoningPermission"];

  clarificationQuestionId:
    string | null;

  completenessScore:
    number | null;

  evidenceConfidence:
    ClinicalReasoningRuntime["confidence"] extends null
      ? null
      : ClinicalReasoningRuntime["confidence"];

  createdAt:
    string;
};

export type ClinicalReasoningState = {
  id:
    string;

  originalQuestion:
    string;

  currentQuestion:
    string;

  intent:
    AssistantIntent;

  language:
    ClinicalReasoningRuntime["language"];

  status:
    ClinicalReasoningStateStatus;

  askedClarificationQuestionIds:
    string[];

  resolvedGapTypes:
    ClinicalEvidenceGapType[];

  collectedEvidence:
  StructuredClinicalEvidenceReference[];

  runtimeHistory:
    ClinicalReasoningHistoryEntry[];

  currentRuntime:
    ClinicalReasoningRuntime;

  createdAt:
    string;

  updatedAt:
    string;
};

export type CreateClinicalReasoningStateInput = {
  runtime:
    ClinicalReasoningRuntime;

  stateId?:
    string;

  timestamp?:
    string;
};

export type UpdateClinicalReasoningStateInput = {
  state:
    ClinicalReasoningState;

  runtime:
    ClinicalReasoningRuntime;

  userEvidence?:
    string | null;

  resolvedGapType?:
    ClinicalEvidenceGapType | null;

  answeredQuestionId?:
    string | null;

  timestamp?:
    string;
};

function createStateId():
  string {
  const availableCrypto =
    globalThis.crypto;

  if (
    availableCrypto &&
    typeof availableCrypto.randomUUID ===
      "function"
  ) {
    return `reasoning_state_${availableCrypto.randomUUID()}`;
  }

  return `reasoning_state_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}`;
}

function uniqueValues<T>(
  values:
    T[]
): T[] {
  return [
    ...new Set(
      values
    ),
  ];
}

function resolvePatientEvidenceCategory(
  gapType:
    ClinicalEvidenceGapType | null
): PatientEvidenceCategory {
  if (
    gapType ===
    "missing-current-context"
  ) {
    return "symptom-context";
  }

  if (
    gapType ===
    "missing-health-history"
  ) {
    return "health-history";
  }

  if (
    gapType ===
    "missing-user-reported-context"
  ) {
    return "patient-context";
  }

  if (
    gapType ===
    "limited-source-diversity"
  ) {
    return "additional-evidence";
  }

  if (
    gapType ===
    "no-explicit-relationships"
  ) {
    return "relationship-context";
  }

  if (
    gapType ===
    "unresolved-domain"
  ) {
    return "unresolved-clinical-focus";
  }

  return "general";
}

function resolveStateStatus(
  runtime:
    ClinicalReasoningRuntime
): ClinicalReasoningStateStatus {
  if (
    runtime.requiresClarification
  ) {
    return "awaiting-clarification";
  }

  if (
    runtime.mode ===
    "provisional"
  ) {
    return "provisional";
  }

  if (
    runtime.mode ===
    "evidence-based"
  ) {
    return "ready";
  }

  return "awaiting-clarification";
}

function createHistoryEntry(
  runtime:
    ClinicalReasoningRuntime,
  timestamp:
    string
): ClinicalReasoningHistoryEntry {
  const clarificationQuestionId =
    runtime
      .clarification
      .question
      ?.id ??
    null;

  return {
    id:
      `reasoning_history_${runtimeHistoryKey(
        runtime,
        timestamp
      )}`,

    question:
      runtime.question,

    intent:
      runtime.intent,

    mode:
      runtime.mode,

    reasoningPermission:
      runtime.reasoningPermission,

    clarificationQuestionId,

    completenessScore:
      runtime
        .evidenceSufficiency
        ?.completenessScore ??
      null,

    evidenceConfidence:
      runtime.confidence,

    createdAt:
      timestamp,
  };
}

function runtimeHistoryKey(
  runtime:
    ClinicalReasoningRuntime,
  timestamp:
    string
): string {
  return [
    timestamp,
    runtime.mode,
    runtime
      .clarification
      .question
      ?.id ??
      "no-question",
  ].join(
    ":"
  );
}

function createUserEvidence(
  input: {
    stateId:
      string;

    resolvedGapType:
      ClinicalEvidenceGapType | null;

    value:
      string;

    questionId:
      string | null;

    timestamp:
      string;
  }
): StructuredClinicalEvidenceReference {
  return {
    id:
      `evidence:user-answer:${input.stateId}:${input.timestamp}`,

    sourceType:
      "user-answer",

    sourceId:
      input.questionId,

    label:
      "User clarification answer",

    value:
      input.value,

    unit:
      null,

    observedAt:
      input.timestamp,

    certainty:
      "reported",

    confidence:
      "moderate",

    relevance:
      "contextual",

      patientEvidenceCategory:
  resolvePatientEvidenceCategory(
    input.resolvedGapType
  ),

resolvedGapType:
  input.resolvedGapType,
  };
}

export function createClinicalReasoningState({
  runtime,
  stateId = createStateId(),
  timestamp = new Date().toISOString(),
}: CreateClinicalReasoningStateInput):
  ClinicalReasoningState {
  const currentQuestionId =
    runtime
      .clarification
      .question
      ?.id ??
    null;

  return {
    id:
      stateId,

    originalQuestion:
      runtime.question,

    currentQuestion:
      runtime.question,

    intent:
      runtime.intent,

    language:
      runtime.language,

    status:
      resolveStateStatus(
        runtime
      ),

    askedClarificationQuestionIds:
      currentQuestionId
        ? [
            currentQuestionId,
          ]
        : [],

    resolvedGapTypes:
      [],

    collectedEvidence:
      [],

    runtimeHistory: [
      createHistoryEntry(
        runtime,
        timestamp
      ),
    ],

    currentRuntime:
      runtime,

    createdAt:
      timestamp,

    updatedAt:
      timestamp,
  };
}

export function updateClinicalReasoningState({
  state,
  runtime,
  userEvidence = null,
  resolvedGapType = null,
  answeredQuestionId = null,
  timestamp = new Date().toISOString(),
}: UpdateClinicalReasoningStateInput):
  ClinicalReasoningState {
  const normalizedEvidence =
    userEvidence
      ?.trim() ??
    "";

  const nextQuestionId =
    runtime
      .clarification
      .question
      ?.id ??
    null;

  const nextCollectedEvidence =
    normalizedEvidence
      ? [
          ...state.collectedEvidence,

          createUserEvidence({
  stateId:
    state.id,

  value:
    normalizedEvidence,

  questionId:
    answeredQuestionId,

  resolvedGapType,

  timestamp,
}),
        ]
      : state.collectedEvidence;

  const nextResolvedGapTypes =
    resolvedGapType
      ? uniqueValues([
          ...state.resolvedGapTypes,
          resolvedGapType,
        ])
      : state.resolvedGapTypes;

  const nextAskedQuestionIds =
    nextQuestionId
      ? uniqueValues([
          ...state.askedClarificationQuestionIds,
          nextQuestionId,
        ])
      : state.askedClarificationQuestionIds;

  return {
    ...state,

    currentQuestion:
      runtime.question,

    intent:
      runtime.intent,

    language:
      runtime.language,

    status:
      resolveStateStatus(
        runtime
      ),

    askedClarificationQuestionIds:
      nextAskedQuestionIds,

    resolvedGapTypes:
      nextResolvedGapTypes,

    collectedEvidence:
      nextCollectedEvidence,

    runtimeHistory: [
      ...state.runtimeHistory,

      createHistoryEntry(
        runtime,
        timestamp
      ),
    ],

    currentRuntime:
      runtime,

    updatedAt:
      timestamp,
  };
}

export function closeClinicalReasoningState(
  state:
    ClinicalReasoningState,
  timestamp =
    new Date().toISOString()
): ClinicalReasoningState {
  return {
    ...state,

    status:
      "closed",

    updatedAt:
      timestamp,
  };
}