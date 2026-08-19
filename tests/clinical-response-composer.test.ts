import { describe, expect, it } from "vitest";

import { composeClinicalResponse } from "@/lib/health-intelligence/application/clinical-response-composer.service";

import type { ClinicalConfidenceCalibrationResult } from "@/lib/health-intelligence/engines/clinical-confidence-calibration.engine";

import type { ClinicalConflictResolutionResult } from "@/lib/health-intelligence/engines/clinical-conflict-resolution.engine";

import type { ClinicalHypothesisRankingResult } from "@/lib/health-intelligence/engines/clinical-hypothesis-ranking.engine";

import type { ClinicalHypothesis } from "@/lib/health-intelligence/models/clinical-hypothesis";

function createHypothesis(): ClinicalHypothesis {
  return {
    id: "hypothesis:test",

    title: "Elevated LDL may be related to a cardiovascular risk pattern",

    description:
      "The available evidence supports evaluating a possible cardiovascular relationship.",

    kind: "risk-pattern",

    status: "candidate",

    domains: ["cardiovascular", "endocrine-metabolic"],

    priority: "important",

    confidence: "high",

    supportingEvidence: [
      {
        evidenceId: "evidence:supporting",

        normalizedWeight: 0.9,

        explanation:
          "A confirmed laboratory result supports this interpretation.",
      },
    ],

    contradictingEvidence: [
      {
        evidenceId: "evidence:contradicting",

        normalizedWeight: 0.4,

        explanation:
          "A clinical finding may reduce the strength of the interpretation.",
      },
    ],

    contextualEvidence: [],

    missingEvidence: ["Complete cardiovascular risk profile"],

    affectedNodeIds: ["node:1", "node:2"],

    affectedRelationshipIds: ["relationship:1"],

    interpretationBoundary:
      "This is an evidence-grounded interpretive hypothesis, not a confirmed diagnosis.",

    generatedAt: "2026-08-06T08:00:00.000Z",
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

        score: 0.75,

        components: {
          supportingEvidence: 0.9,

          contradictingEvidencePenalty: 0.32,

          missingEvidencePenalty: 0.05,

          priorityAdjustment: 0.05,

          confidenceAdjustment: 0.04,
        },

        hasEvidenceConflict: false,

        reason: "Deterministic ranking result.",
      },
    ],

    hypothesisCount: 1,

    highestRankedHypothesisId: hypothesis.id,

    lowestRankedHypothesisId: hypothesis.id,

    rankingApplied: true,

    reason: "Test ranking.",

    generatedAt: "2026-08-06T08:00:00.000Z",
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

        rankingScore: 0.75,

        conflictLevel: "low",

        resolutionStatus: "needs-additional-evidence",

        supportingAverage: 0.9,

        contradictingAverage: 0.4,

        evidenceDifference: 0.5,

        conflictSources: [
          {
            evidenceId: "evidence:contradicting",

            normalizedWeight: 0.4,

            explanation:
              "A clinical finding may reduce the strength of the interpretation.",
          },
        ],

        missingEvidence: ["Complete cardiovascular risk profile"],

        requiresClarification: false,

        requiresAdditionalEvidence: true,

        requiresClinicalReview: false,

        resolutionPriority: 8,

        reason: "Additional evidence is required.",
      },
    ],

    hypothesisCount: 1,

    conflictCount: 1,

    highImpactConflictCount: 0,

    highestPriorityConflictHypothesisId: hypothesisId,

    hasUnresolvedConflict: true,

    resolutionApplied: true,

    reason: "Test conflict resolution.",

    generatedAt: "2026-08-06T08:00:00.000Z",
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

        calibrationScore: 0.62,

        status: "limited-by-missing-evidence",

        components: {
          rankingScore: 0.75,

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
          "The interpretation is limited by missing evidence and is not a disease probability.",
      },
    ],

    hypothesisCount: 1,

    calibratedCount: 1,

    limitedConfidenceCount: 1,

    clinicalReviewCount: 0,

    highestConfidenceHypothesisId: hypothesisId,

    calibrationApplied: true,

    reason: "Test confidence calibration.",

    safetyBoundary: "Confidence is not diagnostic certainty.",

    generatedAt: "2026-08-06T08:00:00.000Z",
  };
}

describe("Clinical response composer", () => {
  it("returns an unavailable result when no hypothesis exists", () => {
    const result = composeClinicalResponse({
      language: "en",

      ranking: {
        rankedHypotheses: [],

        hypothesisCount: 0,

        highestRankedHypothesisId: null,

        lowestRankedHypothesisId: null,

        rankingApplied: false,

        reason: "No hypotheses.",

        generatedAt: "2026-08-06T08:00:00.000Z",
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

        generatedAt: "2026-08-06T08:00:00.000Z",
      },

      confidenceCalibration: {
        calibrations: [],

        hypothesisCount: 0,

        calibratedCount: 0,

        limitedConfidenceCount: 0,

        clinicalReviewCount: 0,

        highestConfidenceHypothesisId: null,

        calibrationApplied: false,

        reason: "No calibrations.",

        safetyBoundary: "No diagnosis.",

        generatedAt: "2026-08-06T08:00:00.000Z",
      },
    });

    expect(result.available).toBe(false);

    expect(result.response).toBeNull();
  });

  it("composes an English evidence-grounded response", () => {
    const hypothesis = createHypothesis();

    const result = composeClinicalResponse({
      language: "en",

      ranking: createRanking(hypothesis),

      conflictResolution: createConflictResolution(hypothesis.id),

      confidenceCalibration: createConfidenceCalibration(hypothesis.id),
    });

    expect(result.available).toBe(true);

    expect(result.hypothesisId).toBe(hypothesis.id);

    expect(result.confidence).toBe("moderate");

    expect(result.requiresAdditionalEvidence).toBe(true);

    expect(result.response).toContain(
      "The available evidence supports evaluating a possible cardiovascular relationship.",
    );

    expect(result.response).toContain("The calibrated confidence is moderate");

    expect(result.response).toContain("Important missing information");

    expect(result.response).toContain("Important missing information");

expect(result.response).toContain(
  "not a confirmed diagnosis"
);
    expect(result.response).toContain(
    "Complete cardiovascular risk profile"
   );
  });

  it("composes an Arabic evidence-grounded response", () => {
    const hypothesis = createHypothesis();

    const result = composeClinicalResponse({
      language: "ar",

      ranking: createRanking(hypothesis),

      conflictResolution: createConflictResolution(hypothesis.id),

      confidenceCalibration: createConfidenceCalibration(hypothesis.id),
    });

    expect(result.available).toBe(true);

    expect(result.response).toContain(
      "The available evidence supports evaluating a possible cardiovascular relationship.",
    );

    expect(result.response).toContain("مستوى الثقة المعاير هو moderate");

    expect(result.response).toContain("معلومات مهمة ما زلنا نحتاج إليها");

    expect(result.response).toContain(
  "هذه فرضية تفسيرية مبنية على الأدلة وليست تشخيصًا مؤكدًا."
);

expect(result.response).toContain(
  "Complete cardiovascular risk profile"
);
  });

  it("preserves supporting, contradicting, and missing evidence", () => {
    const hypothesis = createHypothesis();

    const result = composeClinicalResponse({
      language: "en",

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

    expect(result.missingEvidence).toEqual([
      "Complete cardiovascular risk profile",
    ]);
  });

  it("does not convert calibrated confidence into disease probability", () => {
    const hypothesis = createHypothesis();

    const result = composeClinicalResponse({
      language: "en",

      ranking: createRanking(hypothesis),

      conflictResolution: createConflictResolution(hypothesis.id),

      confidenceCalibration: createConfidenceCalibration(hypothesis.id),
    });

    expect(result.confidenceExplanation).toContain("not a disease probability");

    expect(result.interpretationBoundary).toContain(
      "not a confirmed diagnosis",
    );
  });
});
