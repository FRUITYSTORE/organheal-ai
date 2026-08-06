import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildClinicalHypothesisFoundation,
} from "@/lib/health-intelligence/engines/clinical-hypothesis.engine";

import type {
  ClinicalEvidenceWeightCollection,
} from "@/lib/health-intelligence/models/clinical-evidence-weight";

import {
  createEmptyWholeBodyClinicalKnowledgeModel,
  type WholeBodyClinicalKnowledgeModel,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

function createEvidenceWeights(
  weights:
    number[]
): ClinicalEvidenceWeightCollection {
  const evidence =
    weights.map(
      (
        normalizedWeight,
        index
      ) => ({
        evidenceId:
          `evidence:${index + 1}`,

        sourceType:
          "laboratory-result" as const,

        confidence:
          "high" as const,

        relevance:
          "supporting" as const,

        recency:
          "current" as const,

        completeness:
          "complete" as const,

        strength:
          normalizedWeight >=
            0.85
            ? "very-high" as const
            : normalizedWeight >=
                0.7
              ? "high" as const
              : normalizedWeight >=
                  0.5
                ? "moderate" as const
                : "low" as const,

        normalizedWeight,

        components: {
          sourceReliability:
            normalizedWeight,

          certainty:
            normalizedWeight,

          confidence:
            normalizedWeight,

          relevance:
            normalizedWeight,

          recency:
            normalizedWeight,

          completeness:
            normalizedWeight,
        },

        rationale:
          [],

        evaluatedAt:
          "2026-08-06T08:00:00.000Z",
      })
    );

  return {
    evidence,

    averageWeight:
      evidence.length ===
        0
        ? 0
        : evidence.reduce(
            (
              total,
              item
            ) =>
              total +
              item.normalizedWeight,
            0
          ) /
          evidence.length,

    strongestEvidenceId:
      evidence[0]
        ?.evidenceId ??
      null,

    weakestEvidenceId:
      evidence[
        evidence.length -
          1
      ]?.evidenceId ??
      null,

    evaluatedAt:
      "2026-08-06T08:00:00.000Z",
  };
}

function createConnectedKnowledge():
  WholeBodyClinicalKnowledgeModel {
  const knowledge =
    createEmptyWholeBodyClinicalKnowledgeModel();

  knowledge.relationships = [
    {
      id:
        "relationship:test",

      sourceNodeId:
        "node:1",

      targetNodeId:
        "node:2",

      type:
        "direct",

      explanation:
        "The evidence sources are explicitly connected.",

      supportingEvidenceIds: [
        "evidence:1",
        "evidence:2",
      ],

      contradictingEvidenceIds:
        [],

      confidence:
        "high",

      clinicalSignificance:
        "important",

      missingEvidence:
        [],
    },
  ];

  return knowledge;
}

describe(
  "Clinical hypothesis foundation",
  () => {
    it(
      "returns a safe empty result when no evidence exists",
      () => {
        const result =
          buildClinicalHypothesisFoundation({
            knowledge:
              createEmptyWholeBodyClinicalKnowledgeModel(),

            evidenceWeights:
              createEvidenceWeights(
                []
              ),

            referenceTime:
              "2026-08-06T08:00:00.000Z",
          });

        expect(
          result.status
        ).toBe(
          "no-evidence"
        );

        expect(
          result.hypotheses
        ).toEqual(
          []
        );

        expect(
          result.generationAllowed
        ).toBe(
          false
        );

        expect(
          result.generatedHypothesisCount
        ).toBe(
          0
        );
      }
    );

    it(
      "does not allow generation from one eligible evidence item alone",
      () => {
        const result =
          buildClinicalHypothesisFoundation({
            knowledge:
              createConnectedKnowledge(),

            evidenceWeights:
              createEvidenceWeights([
                0.9,
              ]),

            referenceTime:
              "2026-08-06T08:00:00.000Z",
          });

        expect(
          result.status
        ).toBe(
          "insufficient-foundation"
        );

        expect(
          result.generationAllowed
        ).toBe(
          false
        );

        expect(
          result.hypotheses
        ).toEqual(
          []
        );
      }
    );

    it(
      "requires an explicit relationship before allowing future hypothesis generation",
      () => {
        const result =
          buildClinicalHypothesisFoundation({
            knowledge:
              createEmptyWholeBodyClinicalKnowledgeModel(),

            evidenceWeights:
              createEvidenceWeights([
                0.9,
                0.8,
              ]),

            referenceTime:
              "2026-08-06T08:00:00.000Z",
          });

        expect(
          result.status
        ).toBe(
          "insufficient-foundation"
        );

        expect(
          result.generationAllowed
        ).toBe(
          false
        );

        expect(
          result.relationshipCount
        ).toBe(
          0
        );
      }
    );

    it(
      "marks the foundation ready when weighted evidence and an explicit relationship exist",
      () => {
        const result =
          buildClinicalHypothesisFoundation({
            knowledge:
              createConnectedKnowledge(),

            evidenceWeights:
              createEvidenceWeights([
                0.9,
                0.8,
                0.3,
              ]),

            referenceTime:
              "2026-08-06T08:00:00.000Z",
          });

        expect(
          result.status
        ).toBe(
          "foundation-ready"
        );

        expect(
          result.generationAllowed
        ).toBe(
          true
        );

        expect(
          result.eligibleEvidenceIds
        ).toEqual([
          "evidence:1",
          "evidence:2",
        ]);

        expect(
          result.excludedEvidenceIds
        ).toEqual([
          "evidence:3",
        ]);

        expect(
          result.hypotheses
        ).toEqual(
          []
        );

        expect(
          result.generatedHypothesisCount
        ).toBe(
          0
        );
      }
    );

    it(
      "never assigns a diagnosis or probability during the foundation phase",
      () => {
        const result =
          buildClinicalHypothesisFoundation({
            knowledge:
              createConnectedKnowledge(),

            evidenceWeights:
              createEvidenceWeights([
                0.95,
                0.9,
              ]),

            referenceTime:
              "2026-08-06T08:00:00.000Z",
          });

        expect(
          result.hypotheses
        ).toEqual(
          []
        );

        expect(
          result.safetyBoundary
        ).toContain(
          "does not diagnose disease"
        );

        expect(
          result.safetyBoundary
        ).toContain(
          "probabilities"
        );
      }
    );
  }
);