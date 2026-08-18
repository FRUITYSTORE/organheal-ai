import {
  describe,
  expect,
  it,
} from "vitest";

import {
  selectClinicalClarificationQuestion,
} from "@/lib/health-intelligence/engines/clinical-clarification-selector.engine";

import type {
  WholeBodyClinicalKnowledgeModel,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

describe(
  "Clinical clarification selector symptom intake",
  () => {
    it(
      "uses focused symptom intake when current clinical context is missing",
      () => {
        const knowledge = {
          evidenceSufficiency: {
            requiresClarification:
              true,

            gaps: [
              {
                id:
                  "gap-current-context",

                type:
                  "missing-current-context",

                label:
                  "Current clinical context missing",

                reason:
                  "Current symptoms and progression are not documented.",

                affectedDomains:
                  [],

                impact:
                  "high",
              },
            ],
          },

          unresolvedDomains:
            [],

          coveredDomains:
            [],

          nodes:
            [],

          relationships:
            [],
        } as unknown as WholeBodyClinicalKnowledgeModel;

        const result =
          selectClinicalClarificationQuestion({
            question:
              "I have chest pain and dizziness.",

            knowledge,

            language:
              "en",

            resolvedGapTypes:
              [],

            previouslyAskedQuestionIds:
              [],
          });

        expect(
          result.question?.id
        ).toBe(
          "clarification:missing-current-context"
        );

        expect(
          result.question?.question
        ).toContain(
          "when did they start"
        );

        expect(
          result.question?.question
        ).toContain(
          "how severe"
        );

        expect(
          result.question?.question
        ).toContain(
          "severe shortness of breath"
        );

        expect(
          result.question?.priority
        ).toBe(
          "important"
        );

        expect(
          result.question?.answerMayChange
        ).toEqual(
          expect.arrayContaining([
            "interpretation",
            "risk",
            "priority",
            "next-action",
          ])
        );
      }
    );
  }
);