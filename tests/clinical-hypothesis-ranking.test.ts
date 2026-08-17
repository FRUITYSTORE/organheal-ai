import { describe, expect, it } from "vitest";

import { rankClinicalHypotheses } from "@/lib/health-intelligence/engines/clinical-hypothesis-ranking.engine";

import type {
  ClinicalHypothesis,
  ClinicalHypothesisCollection,
  ClinicalHypothesisEvidence,
} from "@/lib/health-intelligence/models/clinical-hypothesis";

function createHypothesisEvidence(
  evidenceId: string,
  normalizedWeight: number,
): ClinicalHypothesisEvidence {
  return {
    evidenceId,

    normalizedWeight,

    explanation: "Test evidence.",
  };
}

function createHypothesis(
  overrides: Partial<ClinicalHypothesis> = {},
): ClinicalHypothesis {
  return {
    id: "hypothesis:default",

    title: "Default interpretive hypothesis",

    description: "A test interpretive hypothesis.",

    kind: "possible-explanation",

    status: "candidate",

    domains: ["general-systemic"],

    priority: "monitor",

    confidence: "moderate",

    supportingEvidence: [createHypothesisEvidence("evidence:supporting", 0.8)],

    contradictingEvidence: [],

    contextualEvidence: [],

    missingEvidence: [],

    affectedNodeIds: ["node:1", "node:2"],

    affectedRelationshipIds: ["relationship:1"],

    interpretationBoundary: "This is not a confirmed diagnosis.",

    generatedAt: "2026-08-06T08:00:00.000Z",

    ...overrides,
  };
}

function createCollection(
  hypotheses: ClinicalHypothesis[],
): ClinicalHypothesisCollection {
  return {
    status: hypotheses.length > 0 ? "hypotheses-generated" : "no-evidence",

    hypotheses,

    eligibleEvidenceIds: [],

    excludedEvidenceIds: [],

    evidenceCount: 0,

    eligibleEvidenceCount: 0,

    relationshipCount: hypotheses.length,

    generatedHypothesisCount: hypotheses.length,

    generationAllowed: hypotheses.length > 0,

    reason: "Test collection.",

    safetyBoundary:
      "The collection does not diagnose disease or assign disease probabilities.",

    generatedAt: "2026-08-06T08:00:00.000Z",
  };
}

describe("Clinical hypothesis ranking engine", () => {
  it("returns an empty safe result when no hypotheses exist", () => {
    const result = rankClinicalHypotheses({
      collection: createCollection([]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.rankingApplied).toBe(false);

    expect(result.rankedHypotheses).toEqual([]);

    expect(result.highestRankedHypothesisId).toBeNull();

    expect(result.lowestRankedHypothesisId).toBeNull();
  });

  it("ranks stronger supporting evidence above weaker supporting evidence", () => {
    const stronger = createHypothesis({
      id: "hypothesis:stronger",

      supportingEvidence: [
        createHypothesisEvidence("evidence:strong-1", 0.95),

        createHypothesisEvidence("evidence:strong-2", 0.9),
      ],
    });

    const weaker = createHypothesis({
      id: "hypothesis:weaker",

      supportingEvidence: [
        createHypothesisEvidence("evidence:weak-1", 0.6),

        createHypothesisEvidence("evidence:weak-2", 0.55),
      ],
    });

    const result = rankClinicalHypotheses({
      collection: createCollection([weaker, stronger]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.rankedHypotheses[0].hypothesis.id).toBe(
      "hypothesis:stronger",
    );

    expect(result.rankedHypotheses[0].position).toBe(1);

    expect(result.rankedHypotheses[0].score).toBeGreaterThan(
      result.rankedHypotheses[1].score,
    );
  });

  it("penalizes strong contradicting evidence", () => {
    const withoutContradiction = createHypothesis({
      id: "hypothesis:without-contradiction",

      supportingEvidence: [
        createHypothesisEvidence("evidence:support-1", 0.85),
      ],
    });

    const withContradiction = createHypothesis({
      id: "hypothesis:with-contradiction",

      supportingEvidence: [
        createHypothesisEvidence("evidence:support-2", 0.85),
      ],

      contradictingEvidence: [
        createHypothesisEvidence("evidence:contradicting", 0.8),
      ],
    });

    const result = rankClinicalHypotheses({
      collection: createCollection([withContradiction, withoutContradiction]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    const rankedWithoutContradiction = result.rankedHypotheses.find(
      (item) => item.hypothesis.id === "hypothesis:without-contradiction",
    );

    const rankedWithContradiction = result.rankedHypotheses.find(
      (item) => item.hypothesis.id === "hypothesis:with-contradiction",
    );

    expect(rankedWithContradiction?.score).toBeLessThan(
      rankedWithoutContradiction?.score ?? 0,
    );

    expect(
      rankedWithContradiction?.components.contradictingEvidencePenalty,
    ).toBeGreaterThan(0);
  });

  it("applies a capped penalty for missing evidence", () => {
    const result = rankClinicalHypotheses({
      collection: createCollection([
        createHypothesis({
          id: "hypothesis:missing-evidence",

          missingEvidence: [
            "Missing item 1",
            "Missing item 2",
            "Missing item 3",
            "Missing item 4",
            "Missing item 5",
            "Missing item 6",
          ],
        }),
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.rankedHypotheses[0].components.missingEvidencePenalty).toBe(
      0.25,
    );
  });

  it("uses clinical priority and relationship confidence as limited adjustments", () => {
    const routineLowConfidence = createHypothesis({
      id: "hypothesis:routine-low",

      priority: "routine",

      confidence: "low",
    });

    const importantHighConfidence = createHypothesis({
      id: "hypothesis:important-high",

      priority: "important",

      confidence: "high",
    });

    const result = rankClinicalHypotheses({
      collection: createCollection([
        routineLowConfidence,
        importantHighConfidence,
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.rankedHypotheses[0].hypothesis.id).toBe(
      "hypothesis:important-high",
    );

    expect(result.rankedHypotheses[0].components.priorityAdjustment).toBe(0.05);

    expect(result.rankedHypotheses[0].components.confidenceAdjustment).toBe(
      0.04,
    );
  });

  it("marks close supporting and contradicting evidence as a conflict", () => {
    const result = rankClinicalHypotheses({
      collection: createCollection([
        createHypothesis({
          id: "hypothesis:conflict",

          supportingEvidence: [
            createHypothesisEvidence("evidence:supporting", 0.85),
          ],

          contradictingEvidence: [
            createHypothesisEvidence("evidence:contradicting", 0.8),
          ],
        }),
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.rankedHypotheses[0].hasEvidenceConflict).toBe(true);

    expect(result.rankedHypotheses[0].reason).toContain(
      "require explicit conflict review",
    );
  });

  it("uses hypothesis id as a stable tie breaker", () => {
    const result = rankClinicalHypotheses({
      collection: createCollection([
        createHypothesis({
          id: "hypothesis:b",
        }),

        createHypothesis({
          id: "hypothesis:a",
        }),
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.rankedHypotheses.map((item) => item.hypothesis.id)).toEqual([
      "hypothesis:a",
      "hypothesis:b",
    ]);
  });

  it("does not present the ranking score as a disease probability", () => {
    const result = rankClinicalHypotheses({
      collection: createCollection([createHypothesis()]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.rankedHypotheses[0].reason).toContain(
      "not a disease probability",
    );
  });
});
