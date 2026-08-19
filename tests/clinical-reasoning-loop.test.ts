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
  runClinicalReasoningLoop,
} from "@/lib/health-intelligence/runtime/clinical-reasoning-loop";

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

    uploadedReports:
      [],

    healthInsights:
      [],

    generatedResults:
      [],

    historyItems:
      [],
  };
}

function createEmptyKnowledge() {
  return buildWholeBodyClinicalKnowledge(
    createEmptyPatientSummary()
  );
}

describe(
  "Clinical reasoning loop",
  () => {
    it(
      "creates a new reasoning state for the initial clinical question",
      () => {
        const knowledge =
          createEmptyKnowledge();

        const result =
          runClinicalReasoningLoop({
            question:
              "What could be causing my abnormal result?",

            intent:
              "cause-reasoning",

            knowledge,

            conversation:
              [],

            timestamp:
              "2026-08-06T04:00:00.000Z",
          });

        expect(
          result.isNewState
        ).toBe(
          true
        );

        expect(
          result.stateWasUpdated
        ).toBe(
          false
        );

        expect(
          result.runtime.mode
        ).toBe(
          "clarification"
        );

        expect(
          result.runtime
            .clarification
            .question
            ?.id
        ).toBe(
          "clarification:no-evidence"
        );

        expect(
          result.state
            .askedClarificationQuestionIds
        ).toEqual([
          "clarification:no-evidence",
        ]);

        expect(
          result.state
            .runtimeHistory
        ).toHaveLength(
          1
        );
      }
    );

    it(
      "interprets a meaningful clarification answer and moves to the next unresolved question",
      () => {
        const knowledge =
          createEmptyKnowledge();

        const firstResult =
          runClinicalReasoningLoop({
            question:
              "What could be causing my abnormal result?",

            intent:
              "cause-reasoning",

            knowledge,

            conversation:
              [],

            timestamp:
              "2026-08-06T04:00:00.000Z",
          });

        const secondResult =
          runClinicalReasoningLoop({
            question:
              "I have had severe fatigue and dizziness for two weeks.",

            intent:
              "cause-reasoning",

            knowledge,

            conversation: [
              {
                role:
                  "user",

                content:
                  "What could be causing my abnormal result?",
              },

              {
                role:
                  "assistant",

                content:
                  firstResult.runtime
                    .clarification
                    .question
                    ?.question ??
                  "",
              },
            ],

            previousState:
              firstResult.state,

            timestamp:
              "2026-08-06T04:05:00.000Z",
          });

        expect(
          secondResult.isNewState
        ).toBe(
          false
        );

        expect(
          secondResult.stateWasUpdated
        ).toBe(
          true
        );

        expect(
          secondResult.answeredQuestionId
        ).toBe(
          "clarification:no-evidence"
        );

        expect(
          secondResult.resolvedGapType
        ).toBe(
          "no-evidence"
        );

        expect(
          secondResult.userEvidence
        ).toBe(
          "I have had severe fatigue and dizziness for two weeks."
        );

        expect(
          secondResult.state
            .resolvedGapTypes
        ).toContain(
          "no-evidence"
        );

        expect(
          secondResult.state
            .collectedEvidence
        ).toHaveLength(
          1
        );

        expect(
          secondResult.runtime
            .clarification
            .question
            ?.id
        ).not.toBe(
          "clarification:no-evidence"
        );

        expect(
          secondResult.state
            .runtimeHistory
        ).toHaveLength(
          2
        );
      }
    );

    it(
      "does not update the reasoning state for a minimal clarification answer",
      () => {
        const knowledge =
          createEmptyKnowledge();

        const firstResult =
          runClinicalReasoningLoop({
            question:
              "What could be causing my abnormal result?",

            intent:
              "cause-reasoning",

            knowledge,

            conversation:
              [],

            timestamp:
              "2026-08-06T04:00:00.000Z",
          });

        const secondResult =
          runClinicalReasoningLoop({
            question:
              "Yes",

            intent:
              "cause-reasoning",

            knowledge,

            conversation: [
              {
                role:
                  "assistant",

                content:
                  firstResult.runtime
                    .clarification
                    .question
                    ?.question ??
                  "",
              },
            ],

            previousState:
              firstResult.state,

            timestamp:
              "2026-08-06T04:05:00.000Z",
          });

        expect(
          secondResult
            .interpretation
            .isClarificationAnswer
        ).toBe(
          true
        );

        expect(
          secondResult.stateWasUpdated
        ).toBe(
          false
        );

        expect(
          secondResult.userEvidence
        ).toBeNull();

        expect(
          secondResult.state
            .collectedEvidence
        ).toEqual(
          []
        );

        expect(
          secondResult.state
            .resolvedGapTypes
        ).toEqual(
          []
        );
      }
    );

    it(
      "does not repeat a clarification question that was already answered",
      () => {
        const knowledge =
          createEmptyKnowledge();

        const firstResult =
          runClinicalReasoningLoop({
            question:
              "What health risks should I be concerned about?",

            intent:
              "risk",

            knowledge,

            conversation:
              [],

            timestamp:
              "2026-08-06T04:00:00.000Z",
          });

        const secondResult =
          runClinicalReasoningLoop({
            question:
              "My main concern is recurring chest discomfort during exercise.",

            intent:
              "risk",

            knowledge,

            conversation: [
              {
                role:
                  "assistant",

                content:
                  firstResult.runtime
                    .clarification
                    .question
                    ?.question ??
                  "",
              },
            ],

            previousState:
              firstResult.state,

            timestamp:
              "2026-08-06T04:05:00.000Z",
          });

        expect(
          secondResult.state
            .askedClarificationQuestionIds
        ).toContain(
          "clarification:no-evidence"
        );

        expect(
          secondResult.runtime
            .clarification
            .question
            ?.id
        ).not.toBe(
          "clarification:no-evidence"
        );

        expect(
          new Set(
            secondResult.state
              .askedClarificationQuestionIds
          ).size
        ).toBe(
          secondResult.state
            .askedClarificationQuestionIds
            .length
        );
      }
    );

    it(
      "preserves Arabic clarification handling through the reasoning loop",
      () => {
        const knowledge =
          createEmptyKnowledge();

        const firstResult =
          runClinicalReasoningLoop({
            question:
              "ما سبب النتيجة غير الطبيعية؟",

            intent:
              "cause-reasoning",

            language:
              "ar",

            knowledge,

            conversation:
              [],

            timestamp:
              "2026-08-06T04:00:00.000Z",
          });

        const secondResult =
          runClinicalReasoningLoop({
            question:
              "أشعر بتعب شديد ودوخة منذ ثلاثة أيام.",

            intent:
              "cause-reasoning",

            language:
              "ar",

            knowledge,

            conversation: [
              {
                role:
                  "assistant",

                content:
                  firstResult.runtime
                    .clarification
                    .question
                    ?.question ??
                  "",
              },
            ],

            previousState:
              firstResult.state,

            timestamp:
              "2026-08-06T04:05:00.000Z",
          });

        expect(
          secondResult
            .interpretation
            .shouldUpdateState
        ).toBe(
          true
        );

        expect(
          secondResult.state
            .collectedEvidence[0]
            ?.value
        ).toBe(
          "أشعر بتعب شديد ودوخة منذ ثلاثة أيام."
        );

        expect(
          secondResult.runtime
            .language
        ).toBe(
          "ar"
        );
      }
    );

    it(
  "uses previous clinical memory to avoid repeating a resolved clarification gap",
  () => {
    const knowledge =
      createEmptyKnowledge();

    const result =
      runClinicalReasoningLoop({
        question:
          "What could be causing my abnormal result?",

        intent:
          "cause-reasoning",

        knowledge,

        conversation:
          [],

        memoryEvidence: [
          {
            id:
              "evidence:memory:1",

            sourceType:
              "user-answer",

            sourceId:
              "clarification:no-evidence",

            label:
              "Previous patient clarification",

            value:
              "I previously reported fatigue and dizziness.",

            unit:
              null,

            observedAt:
              "2026-08-18T12:00:00.000Z",

            certainty:
              "reported",

            confidence:
              "moderate",

            relevance:
              "contextual",

            patientEvidenceCategory:
              "symptom-context",

            resolvedGapType:
              "no-evidence",
          },
        ],
      });

    expect(
      result.runtime
        .clarification
        .question
        ?.id
    ).not.toBe(
      "clarification:no-evidence"
    );

    expect(
      result.state
        .askedClarificationQuestionIds
    ).not.toContain(
      "clarification:no-evidence"
    );
  }
);

    it(
      "preserves the original state creation time while advancing the update time",
      () => {
        const knowledge =
          createEmptyKnowledge();

        const firstResult =
          runClinicalReasoningLoop({
            question:
              "What could be causing my abnormal result?",

            intent:
              "cause-reasoning",

            knowledge,

            conversation:
              [],

            timestamp:
              "2026-08-06T04:00:00.000Z",
          });

        const secondResult =
          runClinicalReasoningLoop({
            question:
              "I have had fatigue for two weeks.",

            intent:
              "cause-reasoning",

            knowledge,

            conversation: [
              {
                role:
                  "assistant",

                content:
                  firstResult.runtime
                    .clarification
                    .question
                    ?.question ??
                  "",
              },
            ],

            previousState:
              firstResult.state,

            timestamp:
              "2026-08-06T04:05:00.000Z",
          });

        expect(
          secondResult.state
            .createdAt
        ).toBe(
          "2026-08-06T04:00:00.000Z"
        );

        expect(
          secondResult.state
            .updatedAt
        ).toBe(
          "2026-08-06T04:05:00.000Z"
        );
      }
    );
  }
);