import { describe, expect, it } from "vitest";

import { resolveClinicalConflicts } from "@/lib/health-intelligence/engines/clinical-conflict-resolution.engine";

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

    reason: "Test ranking result.",

    generatedAt: "2026-08-06T08:00:00.000Z",
  };
}

describe("Clinical conflict resolution engine", () => {
  it("returns an empty result when no ranked hypotheses exist", () => {
    const result = resolveClinicalConflicts({
      ranking: createRanking([]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.resolutionApplied).toBe(false);

    expect(result.conflicts).toEqual([]);

    expect(result.hasUnresolvedConflict).toBe(false);
  });

  it("returns no conflict when no contradicting evidence or missing evidence exists", () => {
    const hypothesis = createHypothesis({
      id: "hypothesis:no-conflict",

      contradictingEvidence: [],

      missingEvidence: [],
    });

    const result = resolveClinicalConflicts({
      ranking: createRanking([
        createRankedHypothesis({
          hypothesis,
        }),
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.conflicts[0].conflictLevel).toBe("none");

    expect(result.conflicts[0].resolutionStatus).toBe("no-conflict");

    expect(result.hasUnresolvedConflict).toBe(false);
  });

  it("marks closely balanced strong evidence as a critical conflict", () => {
    const hypothesis = createHypothesis({
      id: "hypothesis:critical",

      supportingEvidence: [createEvidence("evidence:supporting", 0.9)],

      contradictingEvidence: [createEvidence("evidence:contradicting", 0.88)],
    });

    const result = resolveClinicalConflicts({
      ranking: createRanking([
        createRankedHypothesis({
          hypothesis,
        }),
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    const conflict = result.conflicts[0];

    expect(conflict.conflictLevel).toBe("critical");

    expect(conflict.resolutionStatus).toBe("requires-clinical-review");

    expect(conflict.requiresClinicalReview).toBe(true);

    expect(result.highImpactConflictCount).toBe(1);
  });

  it("marks mixed evidence as requiring clarification", () => {
    const hypothesis = createHypothesis({
      id: "hypothesis:moderate",

      supportingEvidence: [createEvidence("evidence:supporting", 0.7)],

      contradictingEvidence: [createEvidence("evidence:contradicting", 0.5)],
    });

    const result = resolveClinicalConflicts({
      ranking: createRanking([
        createRankedHypothesis({
          hypothesis,
        }),
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    const conflict = result.conflicts[0];

    expect(conflict.conflictLevel).toBe("moderate");

    expect(conflict.resolutionStatus).toBe("needs-clarification");

    expect(conflict.requiresClarification).toBe(true);
  });

  it("requests additional evidence when no explicit conflict exists but information is missing", () => {
    const hypothesis = createHypothesis({
      id: "hypothesis:missing",

      contradictingEvidence: [],

      missingEvidence: ["Repeat laboratory result", "Current symptom history"],
    });

    const result = resolveClinicalConflicts({
      ranking: createRanking([
        createRankedHypothesis({
          hypothesis,
        }),
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    const conflict = result.conflicts[0];

    expect(conflict.conflictLevel).toBe("none");

    expect(conflict.resolutionStatus).toBe("needs-additional-evidence");

    expect(conflict.requiresAdditionalEvidence).toBe(true);

    expect(result.hasUnresolvedConflict).toBe(true);
  });

  it("preserves contradicting evidence as explicit conflict sources", () => {
    const hypothesis = createHypothesis({
      id: "hypothesis:sources",

      contradictingEvidence: [
        createEvidence("evidence:contradicting-1", 0.75),

        createEvidence("evidence:contradicting-2", 0.65),
      ],
    });

    const result = resolveClinicalConflicts({
      ranking: createRanking([
        createRankedHypothesis({
          hypothesis,
        }),
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(
      result.conflicts[0].conflictSources.map((source) => source.evidenceId),
    ).toEqual(["evidence:contradicting-1", "evidence:contradicting-2"]);
  });

  it("prioritizes critical conflicts above lower-impact conflicts", () => {
    const critical = createHypothesis({
      id: "hypothesis:critical",

      supportingEvidence: [createEvidence("evidence:critical-support", 0.9)],

      contradictingEvidence: [
        createEvidence("evidence:critical-contradict", 0.88),
      ],
    });

    const low = createHypothesis({
      id: "hypothesis:low",

      supportingEvidence: [createEvidence("evidence:low-support", 0.9)],

      contradictingEvidence: [createEvidence("evidence:low-contradict", 0.2)],
    });

    const result = resolveClinicalConflicts({
      ranking: createRanking([
        createRankedHypothesis({
          hypothesis: low,

          position: 1,
        }),

        createRankedHypothesis({
          hypothesis: critical,

          position: 2,
        }),
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.conflicts[0].hypothesisId).toBe("hypothesis:critical");

    expect(result.highestPriorityConflictHypothesisId).toBe(
      "hypothesis:critical",
    );
  });

  it("does not treat conflict resolution as diagnostic confirmation", () => {
    const hypothesis = createHypothesis({
      contradictingEvidence: [createEvidence("evidence:contradicting", 0.8)],
    });

    const result = resolveClinicalConflicts({
      ranking: createRanking([
        createRankedHypothesis({
          hypothesis,
        }),
      ]),

      referenceTime: "2026-08-06T08:00:00.000Z",
    });

    expect(result.conflicts[0].reason).toContain(
      "does not confirm or exclude a diagnosis",
    );
  });
});
