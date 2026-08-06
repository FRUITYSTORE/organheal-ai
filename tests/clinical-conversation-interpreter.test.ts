import {
  describe,
  expect,
  it,
} from "vitest";

import {
  interpretClinicalConversation,
} from "@/lib/health-intelligence/runtime/clinical-conversation-interpreter";

describe(
  "Clinical conversation interpreter",
  () => {
    it(
      "recognizes a meaningful answer to the initial no-evidence clarification",
      () => {
        const result =
          interpretClinicalConversation({
            message:
              "I have had severe fatigue for two weeks.",

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
                  "What health concern, symptom, test result, or medical report would you like OrganHeal to evaluate first?",
              },
            ],
          });

        expect(
          result
        ).toMatchObject({
          isClarificationAnswer:
            true,

          shouldUpdateState:
            true,

          answeredQuestionId:
            "clarification:no-evidence",

          answeredGapType:
            "no-evidence",

          userEvidence:
            "I have had severe fatigue for two weeks.",

          confidence:
            "high",
        });
      }
    );

    it(
      "recognizes an Arabic clarification answer",
      () => {
        const result =
          interpretClinicalConversation({
            message:
              "أشعر بتعب شديد ودوخة منذ ثلاثة أيام.",

            conversation: [
              {
                role:
                  "assistant",

                content:
                  "هل لديك أي أعراض حاليًا؟ صف ما تشعر به، ومتى بدأت الأعراض، وهل تتحسن أم مستقرة أم تزداد سوءًا.",
              },
            ],
          });

        expect(
          result
        ).toMatchObject({
          isClarificationAnswer:
            true,

          shouldUpdateState:
            true,

          answeredQuestionId:
            "clarification:missing-current-context",

          answeredGapType:
            "missing-current-context",

          userEvidence:
            "أشعر بتعب شديد ودوخة منذ ثلاثة أيام.",

          confidence:
            "high",
        });
      }
    );

    it(
      "does not treat an ordinary response as a clarification answer",
      () => {
        const result =
          interpretClinicalConversation({
            message:
              "Thank you for the explanation.",

            conversation: [
              {
                role:
                  "assistant",

                content:
                  "Your report summary is ready.",
              },
            ],
          });

        expect(
          result
        ).toMatchObject({
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
        });
      }
    );

    it(
      "does not update reasoning state for an empty answer",
      () => {
        const result =
          interpretClinicalConversation({
            message:
              "   ",

            conversation: [
              {
                role:
                  "assistant",

                content:
                  "Are you having any symptoms now? Please describe what you feel, when it started, and whether it is improving, stable, or worsening.",
              },
            ],
          });

        expect(
          result.isClarificationAnswer
        ).toBe(
          true
        );

        expect(
          result.shouldUpdateState
        ).toBe(
          false
        );

        expect(
          result.userEvidence
        ).toBeNull();
      }
    );

    it(
      "does not treat a minimal yes response as sufficient clinical evidence",
      () => {
        const result =
          interpretClinicalConversation({
            message:
              "Yes",

            conversation: [
              {
                role:
                  "assistant",

                content:
                  "Do you have relevant medical conditions, previous similar results, regular medications, allergies, or a family history related to this concern?",
              },
            ],
          });

        expect(
          result.isClarificationAnswer
        ).toBe(
          true
        );

        expect(
          result.shouldUpdateState
        ).toBe(
          false
        );

        expect(
          result.answeredQuestionId
        ).toBe(
          "clarification:missing-health-history"
        );

        expect(
          result.userEvidence
        ).toBeNull();
      }
    );

    it(
      "returns no clarification interpretation when conversation is empty",
      () => {
        const result =
          interpretClinicalConversation({
            message:
              "I have chest discomfort during exercise.",

            conversation:
              [],
          });

        expect(
          result
        ).toMatchObject({
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
        });
      }
    );

    it(
      "recognizes a health-history clarification from identifying phrases",
      () => {
        const result =
          interpretClinicalConversation({
            message:
              "I take atorvastatin daily and my father had heart disease.",

            conversation: [
              {
                role:
                  "assistant",

                content:
                  "Please tell me about relevant medical conditions, previous similar results, regular medications, allergies, or family history.",
              },
            ],
          });

        expect(
          result
        ).toMatchObject({
          isClarificationAnswer:
            true,

          shouldUpdateState:
            true,

          answeredQuestionId:
            "clarification:missing-health-history",

          answeredGapType:
            "missing-health-history",

          confidence:
            "high",
        });
      }
    );
  }
);