import {
  describe,
  expect,
  it,
} from "vitest";

import {
  evaluateClinicalEvidenceWeight,
  evaluateKnowledgeEvidenceWeights,
} from "@/lib/health-intelligence/engines/clinical-evidence-weight.engine";

import {
  createEmptyWholeBodyClinicalKnowledgeModel,
  type ClinicalEvidenceReference,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

function createEvidence(
  overrides:
    Partial<
      ClinicalEvidenceReference
    > = {}
): ClinicalEvidenceReference {
  return {
    id:
      "evidence:test",

    sourceType:
      "laboratory-result",

    sourceId:
      "lab-1",

    label:
      "Laboratory result",

    value:
      42,

    unit:
      "mg/dL",

    observedAt:
      "2026-08-05T08:00:00.000Z",

    certainty:
      "confirmed",

    confidence:
      "high",

    relevance:
      "supporting",

    ...overrides,
  };
}

describe(
  "Clinical evidence weight engine",
  () => {
    it(
      "assigns high weight to recent complete confirmed laboratory evidence",
      () => {
        const result =
          evaluateClinicalEvidenceWeight({
            evidence:
              createEvidence(),

            referenceTime:
              "2026-08-06T08:00:00.000Z",
          });

        expect(
          result.recency
        ).toBe(
          "current"
        );

        expect(
          result.completeness
        ).toBe(
          "complete"
        );

        expect(
          result.strength
        ).toBe(
          "very-high"
        );

        expect(
          result.normalizedWeight
        ).toBeGreaterThanOrEqual(
          0.85
        );
      }
    );

    it(
      "weights reported user evidence lower than confirmed laboratory evidence",
      () => {
        const laboratoryResult =
          evaluateClinicalEvidenceWeight({
            evidence:
              createEvidence(),

            referenceTime:
              "2026-08-06T08:00:00.000Z",
          });

        const userAnswer =
          evaluateClinicalEvidenceWeight({
            evidence:
              createEvidence({
                id:
                  "evidence:user-answer",

                sourceType:
                  "user-answer",

                sourceId:
                  "clarification:missing-current-context",

                label:
                  "User clarification answer",

                value:
                  "I have had fatigue for two weeks.",

                observedAt:
                  "2026-08-06T07:00:00.000Z",

                certainty:
                  "reported",

                confidence:
                  "moderate",

                relevance:
                  "contextual",
              }),

            referenceTime:
              "2026-08-06T08:00:00.000Z",
          });

        expect(
          userAnswer.normalizedWeight
        ).toBeLessThan(
          laboratoryResult.normalizedWeight
        );

       expect(
  userAnswer.strength
).toBe(
  "high"
);
expect(
  userAnswer.normalizedWeight
).toBeLessThan(
  0.85
);
      }
    );

    it(
      "does not automatically weaken contradicting evidence",
      () => {
        const supporting =
          evaluateClinicalEvidenceWeight({
            evidence:
              createEvidence({
                id:
                  "evidence:supporting",

                relevance:
                  "supporting",
              }),

            referenceTime:
              "2026-08-06T08:00:00.000Z",
          });

        const contradicting =
          evaluateClinicalEvidenceWeight({
            evidence:
              createEvidence({
                id:
                  "evidence:contradicting",

                relevance:
                  "contradicting",
              }),

            referenceTime:
              "2026-08-06T08:00:00.000Z",
          });

        expect(
          contradicting.normalizedWeight
        ).toBe(
          supporting.normalizedWeight
        );

        expect(
          contradicting.rationale.some(
            (item) =>
              item.includes(
                "highly influential"
              )
          )
        ).toBe(
          true
        );
      }
    );

    it(
      "reduces weight when the evidence value and observation time are missing",
      () => {
        const complete =
          evaluateClinicalEvidenceWeight({
            evidence:
              createEvidence(),

            referenceTime:
              "2026-08-06T08:00:00.000Z",
          });

        const incomplete =
          evaluateClinicalEvidenceWeight({
            evidence:
              createEvidence({
                id:
                  "evidence:incomplete",

                value:
                  null,

                observedAt:
                  null,

                confidence:
                  "low",
              }),

            referenceTime:
              "2026-08-06T08:00:00.000Z",
          });

        expect(
          incomplete.completeness
        ).toBe(
          "limited"
        );

        expect(
          incomplete.normalizedWeight
        ).toBeLessThan(
          complete.normalizedWeight
        );
      }
    );

    it(
      "reduces the recency contribution for historical evidence",
      () => {
        const recent =
          evaluateClinicalEvidenceWeight({
            evidence:
              createEvidence(),

            referenceTime:
              "2026-08-06T08:00:00.000Z",
          });

        const historical =
          evaluateClinicalEvidenceWeight({
            evidence:
              createEvidence({
                id:
                  "evidence:historical",

                observedAt:
                  "2023-01-01T08:00:00.000Z",
              }),

            referenceTime:
              "2026-08-06T08:00:00.000Z",
          });

        expect(
          historical.recency
        ).toBe(
          "historical"
        );

        expect(
          historical.normalizedWeight
        ).toBeLessThan(
          recent.normalizedWeight
        );
      }
    );

    it(
      "evaluates all evidence in a knowledge model and identifies strongest and weakest items",
      () => {
        const knowledge =
          createEmptyWholeBodyClinicalKnowledgeModel();

        knowledge.nodes = [
          {
            id:
              "node:test",

            type:
              "finding",

            label:
              "Test node",

            description:
              null,

            domains: [
              "general-systemic",
            ],

            evidence: [
              createEvidence({
                id:
                  "evidence:strong",
              }),

              createEvidence({
                id:
                  "evidence:weak",

                sourceType:
                  "unknown",

                value:
                  null,

                observedAt:
                  null,

                certainty:
                  "unknown",

                confidence:
                  "very-low",

                relevance:
                  "uncertain",
              }),
            ],

            priority:
              "monitor",

            confidence:
              "moderate",
          },
        ];

        const result =
          evaluateKnowledgeEvidenceWeights(
            knowledge,
            "2026-08-06T08:00:00.000Z"
          );

        expect(
          result.evidence
        ).toHaveLength(
          2
        );

        expect(
          result.strongestEvidenceId
        ).toBe(
          "evidence:strong"
        );

        expect(
          result.weakestEvidenceId
        ).toBe(
          "evidence:weak"
        );

        expect(
          result.averageWeight
        ).toBeGreaterThan(
          0
        );
      }
    );

    it(
      "returns an empty collection safely when no evidence exists",
      () => {
        const knowledge =
          createEmptyWholeBodyClinicalKnowledgeModel();

        const result =
          evaluateKnowledgeEvidenceWeights(
            knowledge,
            "2026-08-06T08:00:00.000Z"
          );

        expect(
          result.evidence
        ).toEqual(
          []
        );

        expect(
          result.averageWeight
        ).toBe(
          0
        );

        expect(
          result.strongestEvidenceId
        ).toBeNull();

        expect(
          result.weakestEvidenceId
        ).toBeNull();
      }
    );
  }
);