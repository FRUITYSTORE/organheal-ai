import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  PatientSummary,
} from "@/lib/models/patient";

import {
  buildWholeBodyClinicalKnowledge,
} from "@/lib/health-intelligence/builders/whole-body-clinical-knowledge.builder";

import {
  buildClinicalReasoningRuntime,
} from "@/lib/health-intelligence/runtime/clinical-reasoning-runtime";

import {
  closeClinicalReasoningState,
  createClinicalReasoningState,
  updateClinicalReasoningState,
} from "@/lib/health-intelligence/runtime/clinical-reasoning-state";

function createEmptyPatientSummary():
  PatientSummary {
  return {
    profile:
      null,

    assessments:
      [],

    latestCheckIn:
      null,

    recentCheckIns:
      [],

    uploadedReports: [],

    reportMarkers: [],

    healthInsights:
      [],

    generatedResults:
      [],

    historyItems:
      [],
  };
}

function createInitialRuntime() {
  const knowledge =
    buildWholeBodyClinicalKnowledge(
      createEmptyPatientSummary()
    );

  return buildClinicalReasoningRuntime({
    question:
      "Why is my test result abnormal?",

    intent:
      "general",

    knowledge,
  });
}

describe(
  "Clinical reasoning state",
  () => {
    it(
      "creates a state from the initial runtime snapshot",
      () => {
        const runtime =
          createInitialRuntime();

        const state =
          createClinicalReasoningState({
            runtime,

            stateId:
              "reasoning_state_test",

            timestamp:
              "2026-08-06T03:00:00.000Z",
          });

        expect(
          state.id
        ).toBe(
          "reasoning_state_test"
        );

        expect(
          state.originalQuestion
        ).toBe(
          runtime.question
        );

        expect(
          state.status
        ).toBe(
          "awaiting-clarification"
        );

        expect(
          state.currentRuntime
        ).toBe(
          runtime
        );

        expect(
          state.runtimeHistory
        ).toHaveLength(
          1
        );

        expect(
          state.askedClarificationQuestionIds
        ).toEqual([
          "clarification:no-evidence",
        ]);
      }
    );

    it(
      "preserves existing evidence and appends a user clarification answer",
      () => {
        const initialRuntime =
          createInitialRuntime();

        const initialState =
          createClinicalReasoningState({
            runtime:
              initialRuntime,

            stateId:
              "reasoning_state_evidence",

            timestamp:
              "2026-08-06T03:00:00.000Z",
          });

        const updatedRuntime =
          buildClinicalReasoningRuntime({
            question:
              "I have had fatigue for two weeks.",

            intent:
              "general",

            knowledge:
              initialRuntime
                .knowledge,

            previouslyAskedQuestionIds:
              initialState
                .askedClarificationQuestionIds,
          });

        const updatedState =
          updateClinicalReasoningState({
            state:
              initialState,

            runtime:
              updatedRuntime,

            userEvidence:
              "I have had fatigue for two weeks.",

            answeredQuestionId:
              "clarification:no-evidence",

            resolvedGapType:
              "no-evidence",

            timestamp:
              "2026-08-06T03:05:00.000Z",
          });

        expect(
          updatedState
            .collectedEvidence
        ).toHaveLength(
          1
        );

        expect(
          updatedState
            .collectedEvidence[0]
        ).toMatchObject({
          sourceType:
            "user-answer",

          sourceId:
            "clarification:no-evidence",

          value:
            "I have had fatigue for two weeks.",

          certainty:
            "reported",
        });

        expect(
          updatedState
            .resolvedGapTypes
        ).toContain(
          "no-evidence"
        );

        expect(
          updatedState
            .runtimeHistory
        ).toHaveLength(
          2
        );
      }
    );

    it(
      "does not duplicate previously asked questions or resolved gaps",
      () => {
        const runtime =
          createInitialRuntime();

        const initialState =
          createClinicalReasoningState({
            runtime,

            stateId:
              "reasoning_state_deduplication",

            timestamp:
              "2026-08-06T03:00:00.000Z",
          });

        const firstUpdate =
          updateClinicalReasoningState({
            state:
              initialState,

            runtime,

            resolvedGapType:
              "no-evidence",

            timestamp:
              "2026-08-06T03:05:00.000Z",
          });

        const secondUpdate =
          updateClinicalReasoningState({
            state:
              firstUpdate,

            runtime,

            resolvedGapType:
              "no-evidence",

            timestamp:
              "2026-08-06T03:10:00.000Z",
          });

        expect(
          secondUpdate
            .resolvedGapTypes
        ).toEqual([
          "no-evidence",
        ]);

        expect(
          secondUpdate
            .askedClarificationQuestionIds
        ).toEqual([
          "clarification:no-evidence",
        ]);
      }
    );

    it(
      "does not treat an empty user answer as clinical evidence",
      () => {
        const runtime =
          createInitialRuntime();

        const initialState =
          createClinicalReasoningState({
            runtime,

            stateId:
              "reasoning_state_empty_answer",

            timestamp:
              "2026-08-06T03:00:00.000Z",
          });

        const updatedState =
          updateClinicalReasoningState({
            state:
              initialState,

            runtime,

            userEvidence:
              "   ",

            timestamp:
              "2026-08-06T03:05:00.000Z",
          });

        expect(
          updatedState
            .collectedEvidence
        ).toEqual(
          []
        );
      }
    );

    it(
      "preserves all previous runtime snapshots when reasoning evolves",
      () => {
        const firstRuntime =
          createInitialRuntime();

        const initialState =
          createClinicalReasoningState({
            runtime:
              firstRuntime,

            stateId:
              "reasoning_state_history",

            timestamp:
              "2026-08-06T03:00:00.000Z",
          });

        const secondRuntime =
          buildClinicalReasoningRuntime({
            question:
              "I am answering the clarification.",

            intent:
              "general",

            knowledge:
              firstRuntime
                .knowledge,

            previouslyAskedQuestionIds:
              initialState
                .askedClarificationQuestionIds,
          });

        const updatedState =
          updateClinicalReasoningState({
            state:
              initialState,

            runtime:
              secondRuntime,

            timestamp:
              "2026-08-06T03:05:00.000Z",
          });

        expect(
          updatedState
            .runtimeHistory
        ).toHaveLength(
          2
        );

        expect(
          updatedState
            .runtimeHistory[0]
            .question
        ).toBe(
          firstRuntime.question
        );

        expect(
          updatedState
            .runtimeHistory[1]
            .question
        ).toBe(
          secondRuntime.question
        );

        expect(
          updatedState
            .currentRuntime
        ).toBe(
          secondRuntime
        );
      }
    );

    it(
  "stores patient clarification evidence with structured clinical metadata",
  () => {
    const initialState =
      createClinicalReasoningState({
        runtime:
          createInitialRuntime(),
      });

    const updatedState =
      updateClinicalReasoningState({
        state:
          initialState,

        runtime:
          createInitialRuntime(),

        userEvidence:
          "The dizziness started two weeks ago and is getting worse.",

        answeredQuestionId:
          "clarification:missing-current-context",

        resolvedGapType:
          "missing-current-context",

        timestamp:
          "2026-08-19T00:00:00.000Z",
      });

    expect(
      updatedState.collectedEvidence
    ).toHaveLength(
      1
    );

    expect(
      updatedState.collectedEvidence[0]
    ).toMatchObject({
      sourceType:
        "user-answer",

      value:
        "The dizziness started two weeks ago and is getting worse.",

      patientEvidenceCategory:
        "symptom-context",

      resolvedGapType:
        "missing-current-context",
    });
  }
);

    it(
      "can close a reasoning state without deleting its history",
      () => {
        const runtime =
          createInitialRuntime();

        const state =
          createClinicalReasoningState({
            runtime,

            stateId:
              "reasoning_state_close",

            timestamp:
              "2026-08-06T03:00:00.000Z",
          });

        const closedState =
          closeClinicalReasoningState(
            state,
            "2026-08-06T03:15:00.000Z"
          );

        expect(
          closedState.status
        ).toBe(
          "closed"
        );

        expect(
          closedState.runtimeHistory
        ).toEqual(
          state.runtimeHistory
        );

        expect(
          closedState.updatedAt
        ).toBe(
          "2026-08-06T03:15:00.000Z"
        );
      }
    );
  }
);