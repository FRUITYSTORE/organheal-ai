import { describe, expect, it } from "vitest";

import { buildClinicalDecisionTrace } from "@/lib/health-intelligence/engines/clinical-decision-trace.engine";

import type { ClinicalConfidenceCalibrationResult } from "@/lib/health-intelligence/engines/clinical-confidence-calibration.engine";

import type { ClinicalConflictResolutionResult } from "@/lib/health-intelligence/engines/clinical-conflict-resolution.engine";

import type { ClinicalHypothesisRankingResult } from "@/lib/health-intelligence/engines/clinical-hypothesis-ranking.engine";

import type { ClinicalHypothesis } from "@/lib/health-intelligence/models/clinical-hypothesis";

function createHypothesis(): ClinicalHypothesis {
  return {
    id: "hypothesis:test",

    title: "Evidence-supported clinical interpretation",

    description:
      "The available evidence supports a provisional interpretation.",

    kind: "possible-explanation",

    status: "provisional",

    domains: ["general-systemic"],

    priority: "important",

    confidence: "high",

    supportingEvidence: [
      {
        evidenceId: "evidence:supporting",

        normalizedWeight: 0.9,

        explanation: "Confirmed evidence supports this interpretation.",
      },
    ],

    contradictingEvidence: [
      {
        evidenceId: "evidence:contradicting",

        normalizedWeight: 0.4,

        explanation: "Another finding limits the interpretation.",
      },
    ],

    contextualEvidence: [
      {
        evidenceId: "evidence:context",

        normalizedWeight: 0.5,

        explanation: "Contextual evidence may affect interpretation.",
      },
    ],

    missingEvidence: ["Repeat objective measurement"],

    affectedNodeIds: ["node:1", "node:2"],

    affectedRelationshipIds: ["relationship:1"],

    interpretationBoundary: "This interpretation is not a confirmed diagnosis.",

    generatedAt: "2026-08-06T16:00:00.000Z",
  };
}

function createRanking(
  hypothesis: ClinicalHypothesis,
): ClinicalHypothesisRankingResult {
  return {
    rankedHypotheses: [
      {
        hypothesis,

        position: 1,

        score: 0.72,

        components: {
          supportingEvidence: 0.9,

          contradictingEvidencePenalty: 0.32,

          missingEvidencePenalty: 0.05,

          priorityAdjustment: 0.05,

          confidenceAdjustment: 0.04,
        },

        hasEvidenceConflict: false,

        reason:
          "The hypothesis ranked first because supporting evidence remained stronger after deterministic penalties.",
      },
    ],

    hypothesisCount: 1,

    highestRankedHypothesisId: hypothesis.id,

    lowestRankedHypothesisId: hypothesis.id,

    rankingApplied: true,

    reason: "Test ranking.",

    generatedAt: "2026-08-06T16:00:00.000Z",
  };
}

function createConflictResolution(
  hypothesisId: string,
): ClinicalConflictResolutionResult {
  return {
    conflicts: [
      {
        hypothesisId,

        rankingPosition: 1,

        rankingScore: 0.72,

        conflictLevel: "low",

        resolutionStatus: "needs-additional-evidence",

        supportingAverage: 0.9,

        contradictingAverage: 0.4,

        evidenceDifference: 0.5,

        conflictSources: [
          {
            evidenceId: "evidence:contradicting",

            normalizedWeight: 0.4,

            explanation: "Another finding limits the interpretation.",
          },
        ],

        missingEvidence: ["Repeat objective measurement"],

        requiresClarification: false,

        requiresAdditionalEvidence: true,

        requiresClinicalReview: false,

        resolutionPriority: 8,

        reason:
          "Contradicting evidence is weaker, but additional evidence remains necessary.",
      },
    ],

    hypothesisCount: 1,

    conflictCount: 1,

    highImpactConflictCount: 0,

    highestPriorityConflictHypothesisId: hypothesisId,

    hasUnresolvedConflict: true,

    resolutionApplied: true,

    reason: "Test conflict resolution.",

    generatedAt: "2026-08-06T16:00:00.000Z",
  };
}

function createConfidenceCalibration(
  hypothesisId: string,
): ClinicalConfidenceCalibrationResult {
  return {
    calibrations: [
      {
        hypothesisId,

        rankingPosition: 1,

        originalConfidence: "high",

        calibratedConfidence: "moderate",

        calibrationScore: 0.61,

        status: "limited-by-missing-evidence",

        components: {
          rankingScore: 0.72,

          supportingEvidence: 0.9,

          contradictingEvidence: 0.4,

          missingEvidencePenalty: 0.05,

          conflictPenalty: 0.05,

          clinicalReviewPenalty: 0,
        },

        conflictLevel: "low",

        confidenceWasReduced: true,

        confidenceWasIncreased: false,

        canPresentAsHighConfidence: false,

        requiresClinicalReview: false,

        missingEvidenceCount: 1,

        reason:
          "Confidence is moderate because important evidence remains missing.",
      },
    ],

    hypothesisCount: 1,

    calibratedCount: 1,

    limitedConfidenceCount: 1,

    clinicalReviewCount: 0,

    highestConfidenceHypothesisId: hypothesisId,

    calibrationApplied: true,

    reason: "Test calibration.",

    safetyBoundary: "Confidence is not disease probability.",

    generatedAt: "2026-08-06T16:00:00.000Z",
  };
}

describe("Clinical decision trace engine", () => {
  it("returns an unavailable trace when no hypothesis exists", () => {
    const result = buildClinicalDecisionTrace({
      ranking: {
        rankedHypotheses: [],

        hypothesisCount: 0,

        highestRankedHypothesisId: null,

        lowestRankedHypothesisId: null,

        rankingApplied: false,

        reason: "No ranking.",

        generatedAt: "2026-08-06T16:00:00.000Z",
      },

      conflictResolution: {
        conflicts: [],

        hypothesisCount: 0,

        conflictCount: 0,

        highImpactConflictCount: 0,

        highestPriorityConflictHypothesisId: null,

        hasUnresolvedConflict: false,

        resolutionApplied: false,

        reason: "No conflicts.",

        generatedAt: "2026-08-06T16:00:00.000Z",
      },

      confidenceCalibration: {
        calibrations: [],

        hypothesisCount: 0,

        calibratedCount: 0,

        limitedConfidenceCount: 0,

        clinicalReviewCount: 0,

        highestConfidenceHypothesisId: null,

        calibrationApplied: false,

        reason: "No calibration.",

        safetyBoundary: "No diagnosis.",

        generatedAt: "2026-08-06T16:00:00.000Z",
      },

      referenceTime: "2026-08-06T16:00:00.000Z",
    });

    expect(result.available).toBe(false);

    expect(result.status).toBe("not-available");

    expect(result.hypothesisId).toBeNull();
  });

  it("builds one trace from existing ranking conflict and confidence results", () => {
    const hypothesis = createHypothesis();

    const result = buildClinicalDecisionTrace({
      ranking: createRanking(hypothesis),

      conflictResolution: createConflictResolution(hypothesis.id),

      confidenceCalibration: createConfidenceCalibration(hypothesis.id),

      referenceTime: "2026-08-06T16:00:00.000Z",
    });

    expect(result.available).toBe(true);

    expect(result.hypothesisId).toBe(hypothesis.id);

    expect(result.rankingScore).toBe(0.72);

    expect(result.calibratedConfidence).toBe("moderate");

    expect(result.conflictLevel).toBe("low");
  });

  it("preserves supporting contradicting contextual and missing evidence", () => {
    const hypothesis = createHypothesis();

    const result = buildClinicalDecisionTrace({
      ranking: createRanking(hypothesis),

      conflictResolution: createConflictResolution(hypothesis.id),

      confidenceCalibration: createConfidenceCalibration(hypothesis.id),
    });

    expect(result.supportingEvidence.map((item) => item.evidenceId)).toEqual([
      "evidence:supporting",
    ]);

    expect(result.contradictingEvidence.map((item) => item.evidenceId)).toEqual(
      ["evidence:contradicting"],
    );

    expect(result.contextualEvidence.map((item) => item.evidenceId)).toEqual([
      "evidence:context",
    ]);

    expect(result.missingEvidence).toEqual(["Repeat objective measurement"]);
  });

  it("records what could materially change the interpretation", () => {
    const hypothesis = createHypothesis();

    const result = buildClinicalDecisionTrace({
      ranking: createRanking(hypothesis),

      conflictResolution: createConflictResolution(hypothesis.id),

      confidenceCalibration: createConfidenceCalibration(hypothesis.id),
    });

    expect(result.whatCouldChangeInterpretation).toContain(
      "Repeat objective measurement",
    );

    expect(result.whatCouldChangeInterpretation).toContain(
      "Additional objective clinical evidence.",
    );
  });

  it("preserves the interpretation safety boundary", () => {
    const hypothesis = createHypothesis();

    const result = buildClinicalDecisionTrace({
      ranking: createRanking(hypothesis),

      conflictResolution: createConflictResolution(hypothesis.id),

      confidenceCalibration: createConfidenceCalibration(hypothesis.id),
    });

    expect(result.interpretationBoundary).toContain(
      "not a confirmed diagnosis",
    );

    expect(result.traceReason).toContain("without recalculating");
  });
});
