import { describe, expect, it } from "vitest";

import { calibrateClinicalConfidence } from "@/lib/health-intelligence/engines/clinical-confidence-calibration.engine";

import type {
  ClinicalConflictResolutionResult,
  ResolvedClinicalHypothesisConflict,
} from "@/lib/health-intelligence/engines/clinical-conflict-resolution.engine";

import type {
  ClinicalHypothesisRankingResult,
  RankedClinicalHypothesis,
} from "@/lib/health-intelligence/engines/clinical-hypothesis-ranking.engine";

import type {
  ClinicalHypothesis,
  ClinicalHypothesisEvidence,
} from "@/lib/health-intelligence/models/clinical-hypothesis";

function createEvidence(
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

    title: "Default hypothesis",

    description: "A test interpretive hypothesis.",

    kind: "possible-explanation",

    status: "candidate",

    domains: ["general-systemic"],

    priority: "monitor",

    confidence: "moderate",

    supportingEvidence: [createEvidence("evidence:supporting", 0.8)],

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

function createRankedHypothesis({
  hypothesis,
  position = 1,
  score = 0.8,
}: {
  hypothesis: ClinicalHypothesis;

  position?: number;

  score?: number;
}): RankedClinicalHypothesis {
  return {
    hypothesis,

    position,

    score,

    components: {
      supportingEvidence: 0.8,

      contradictingEvidencePenalty: 0,

      missingEvidencePenalty: 0,

      priorityAdjustment: 0.02,

      confidenceAdjustment: 0,
    },

    hasEvidenceConflict: false,

    reason: "Test ranking.",
  };
}

function createRanking(
  rankedHypotheses: RankedClinicalHypothesis[],
): ClinicalHypothesisRankingResult {
  return {
    rankedHypotheses,

    hypothesisCount: rankedHypotheses.length,

    highestRankedHypothesisId: rankedHypotheses[0]?.hypothesis.id ?? null,

    lowestRankedHypothesisId:
      rankedHypotheses[rankedHypotheses.length - 1]?.hypothesis.id ?? null,

    rankingApplied: rankedHypotheses.length > 0,

    reason: "Test ranking.",

    generatedAt: "2026-08-06T08:00:00.000Z",
  };
}

function createConflict(
  overrides: Partial<ResolvedClinicalHypothesisConflict> = {},
): ResolvedClinicalHypothesisConflict {
  return {
    hypothesisId: "hypothesis:default",

    rankingPosition: 1,

    rankingScore: 0.8,

    conflictLevel: "none",

    resolutionStatus: "no-conflict",

    supportingAverage: 0.8,

    contradictingAverage: 0,

    evidenceDifference: 0.8,

    conflictSources: [],

    missingEvidence: [],

    requiresClarification: false,

    requiresAdditionalEvidence: false,

    requiresClinicalReview: false,

    resolutionPriority: 5,

    reason: "Test conflict result.",

    ...overrides,
  };
}

function createConflictResolution(
  conflicts: ResolvedClinicalHypothesisConflict[],
): ClinicalConflictResolutionResult {
  return {
    conflicts,

    hypothesisCount: conflicts.length,

    conflictCount: conflicts.filter(
      (conflict) => conflict.conflictLevel !== "none",
    ).length,

    highImpactConflictCount: conflicts.filter(
      (conflict) =>
        conflict.conflictLevel === "high" ||
        conflict.conflictLevel === "critical",
    ).length,

    highestPriorityConflictHypothesisId: conflicts[0]?.hypothesisId ?? null,

    hasUnresolvedConflict: conflicts.some(
      (conflict) =>
        conflict.conflictLevel !== "none" ||
        conflict.requiresAdditionalEvidence,
    ),

    resolutionApplied: conflicts.length > 0,

    reason: "Test conflict resolution.",

    generatedAt: "2026-08-06T08:00:00.000Z",
  };
}

describe("Clinical confidence calibration engine", () => {
  it("returns an empty safe result when no hypotheses exist", () => {
    const result = calibrateClinicalConfidence({
      ranking: createRanking([]),

      conflictResolution: createConflictResolution([]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.calibrationApplied).toBe(false);

    expect(result.calibrations).toEqual([]);

    expect(result.highestConfidenceHypothesisId).toBeNull();
  });

  it("allows high confidence when strong evidence has no conflict or missing information", () => {
    const hypothesis = createHypothesis({
      id: "hypothesis:strong",

      confidence: "high",

      supportingEvidence: [
        createEvidence("evidence:strong-1", 0.95),

        createEvidence("evidence:strong-2", 0.9),
      ],
    });

    const result = calibrateClinicalConfidence({
      ranking: createRanking([
        createRankedHypothesis({
          hypothesis,

          score: 0.9,
        }),
      ]),

      conflictResolution: createConflictResolution([
        createConflict({
          hypothesisId: "hypothesis:strong",
        }),
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.calibrations[0].calibratedConfidence).toBe("very-high");

    expect(result.calibrations[0].canPresentAsHighConfidence).toBe(true);
  });

  it("limits confidence when important evidence is missing", () => {
    const hypothesis = createHypothesis({
      id: "hypothesis:missing",

      confidence: "very-high",

      supportingEvidence: [createEvidence("evidence:strong", 0.95)],

      missingEvidence: ["Missing item 1", "Missing item 2", "Missing item 3"],
    });

    const result = calibrateClinicalConfidence({
      ranking: createRanking([
        createRankedHypothesis({
          hypothesis,

          score: 0.95,
        }),
      ]),

      conflictResolution: createConflictResolution([
        createConflict({
          hypothesisId: "hypothesis:missing",

          missingEvidence: hypothesis.missingEvidence,

          requiresAdditionalEvidence: true,

          resolutionStatus: "needs-additional-evidence",
        }),
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.calibrations[0].calibratedConfidence).toBe("moderate");

    expect(result.calibrations[0].status).toBe("limited-by-missing-evidence");

    expect(result.calibrations[0].confidenceWasReduced).toBe(true);
  });

  it("limits confidence when evidence conflict is moderate", () => {
    const hypothesis = createHypothesis({
      id: "hypothesis:moderate-conflict",

      confidence: "high",

      supportingEvidence: [createEvidence("evidence:supporting", 0.85)],

      contradictingEvidence: [createEvidence("evidence:contradicting", 0.65)],
    });

    const result = calibrateClinicalConfidence({
      ranking: createRanking([
        createRankedHypothesis({
          hypothesis,

          score: 0.8,
        }),
      ]),

      conflictResolution: createConflictResolution([
        createConflict({
          hypothesisId: "hypothesis:moderate-conflict",

          conflictLevel: "moderate",

          resolutionStatus: "needs-clarification",

          requiresClarification: true,
        }),
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.calibrations[0].calibratedConfidence).not.toBe("high");

    expect(result.calibrations[0].status).toBe("limited-by-conflict");
  });

  it("caps critical conflicts at low confidence and requires clinical review", () => {
    const hypothesis = createHypothesis({
      id: "hypothesis:critical",

      confidence: "very-high",

      supportingEvidence: [createEvidence("evidence:supporting", 0.95)],

      contradictingEvidence: [createEvidence("evidence:contradicting", 0.9)],
    });

    const result = calibrateClinicalConfidence({
      ranking: createRanking([
        createRankedHypothesis({
          hypothesis,

          score: 0.9,
        }),
      ]),

      conflictResolution: createConflictResolution([
        createConflict({
          hypothesisId: "hypothesis:critical",

          conflictLevel: "critical",

          resolutionStatus: "requires-clinical-review",

          requiresClinicalReview: true,
        }),
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.calibrations[0].calibratedConfidence).toBe("very-low");

    expect(result.calibrations[0].status).toBe("requires-clinical-review");

    expect(result.calibrations[0].requiresClinicalReview).toBe(true);

    expect(result.clinicalReviewCount).toBe(1);
  });

  it("selects the hypothesis with the highest calibrated confidence", () => {
    const stronger = createHypothesis({
      id: "hypothesis:stronger",

      supportingEvidence: [createEvidence("evidence:strong", 0.95)],
    });

    const weaker = createHypothesis({
      id: "hypothesis:weaker",

      supportingEvidence: [createEvidence("evidence:weak", 0.55)],
    });

    const result = calibrateClinicalConfidence({
      ranking: createRanking([
        createRankedHypothesis({
          hypothesis: weaker,

          position: 2,

          score: 0.55,
        }),

        createRankedHypothesis({
          hypothesis: stronger,

          position: 1,

          score: 0.9,
        }),
      ]),

      conflictResolution: createConflictResolution([
        createConflict({
          hypothesisId: "hypothesis:weaker",
        }),

        createConflict({
          hypothesisId: "hypothesis:stronger",
        }),
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.highestConfidenceHypothesisId).toBe("hypothesis:stronger");
  });

  it("states that calibrated confidence is not disease probability", () => {
    const hypothesis = createHypothesis();

    const result = calibrateClinicalConfidence({
      ranking: createRanking([
        createRankedHypothesis({
          hypothesis,
        }),
      ]),

      conflictResolution: createConflictResolution([createConflict()]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.calibrations[0].reason).toContain(
      "not the probability that a disease is present",
    );

    expect(result.safetyBoundary).toContain(
      "must not be presented as disease probability",
    );
  });
});
