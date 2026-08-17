import type {
  ClinicalConflictLevel,
  ClinicalConflictResolutionResult,
  ResolvedClinicalHypothesisConflict,
} from "@/lib/health-intelligence/engines/clinical-conflict-resolution.engine";

import type {
  ClinicalHypothesisRankingResult,
  RankedClinicalHypothesis,
} from "@/lib/health-intelligence/engines/clinical-hypothesis-ranking.engine";

import type { ClinicalEvidenceConfidence } from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

export type ClinicalCalibratedConfidence = ClinicalEvidenceConfidence;

export type ClinicalConfidenceCalibrationStatus =
  | "not-calibrated"
  | "calibrated"
  | "limited-by-missing-evidence"
  | "limited-by-conflict"
  | "requires-clinical-review";

export type ClinicalConfidenceCalibrationComponents = {
  rankingScore: number;

  supportingEvidence: number;

  contradictingEvidence: number;

  missingEvidencePenalty: number;

  conflictPenalty: number;

  clinicalReviewPenalty: number;
};

export type CalibratedClinicalHypothesisConfidence = {
  hypothesisId: string;

  rankingPosition: number;

  originalConfidence: ClinicalEvidenceConfidence;

  calibratedConfidence: ClinicalCalibratedConfidence;

  calibrationScore: number;

  status: ClinicalConfidenceCalibrationStatus;

  components: ClinicalConfidenceCalibrationComponents;

  conflictLevel: ClinicalConflictLevel;

  confidenceWasReduced: boolean;

  confidenceWasIncreased: boolean;

  canPresentAsHighConfidence: boolean;

  requiresClinicalReview: boolean;

  missingEvidenceCount: number;

  reason: string;
};

export type ClinicalConfidenceCalibrationResult = {
  calibrations: CalibratedClinicalHypothesisConfidence[];

  hypothesisCount: number;

  calibratedCount: number;

  limitedConfidenceCount: number;

  clinicalReviewCount: number;

  highestConfidenceHypothesisId: string | null;

  calibrationApplied: boolean;

  reason: string;

  safetyBoundary: string;

  generatedAt: string;
};

export type CalibrateClinicalConfidenceInput = {
  ranking: ClinicalHypothesisRankingResult;

  conflictResolution: ClinicalConflictResolutionResult;

  referenceTime?: string | Date;
};

const CONFLICT_PENALTIES: Record<ClinicalConflictLevel, number> = {
  none: 0,

  low: 0.05,

  moderate: 0.15,

  high: 0.3,

  critical: 0.45,
};

const CONFIDENCE_ORDER: ClinicalEvidenceConfidence[] = [
  "very-low",
  "low",
  "moderate",
  "high",
  "very-high",
];

function normalizeReferenceTime(value: string | Date | undefined): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

function averageEvidenceWeight(
  evidence: Array<{
    normalizedWeight: number;
  }>,
): number {
  if (evidence.length === 0) {
    return 0;
  }

  return clampScore(
    evidence.reduce((total, item) => total + item.normalizedWeight, 0) /
      evidence.length,
  );
}

function confidenceFromScore(score: number): ClinicalCalibratedConfidence {
  if (score >= 0.85) {
    return "very-high";
  }

  if (score >= 0.7) {
    return "high";
  }

  if (score >= 0.5) {
    return "moderate";
  }

  if (score >= 0.3) {
    return "low";
  }

  return "very-low";
}

function limitConfidence(
  confidence: ClinicalCalibratedConfidence,
  maximum: ClinicalCalibratedConfidence,
): ClinicalCalibratedConfidence {
  const confidenceIndex = CONFIDENCE_ORDER.indexOf(confidence);

  const maximumIndex = CONFIDENCE_ORDER.indexOf(maximum);

  if (confidenceIndex <= maximumIndex) {
    return confidence;
  }

  return maximum;
}

function findConflict(
  hypothesisId: string,
  conflictResolution: ClinicalConflictResolutionResult,
): ResolvedClinicalHypothesisConflict | null {
  return (
    conflictResolution.conflicts.find(
      (conflict) => conflict.hypothesisId === hypothesisId,
    ) ?? null
  );
}

function resolveStatus(
  conflict: ResolvedClinicalHypothesisConflict | null,
  missingEvidenceCount: number,
): ClinicalConfidenceCalibrationStatus {
  if (conflict?.requiresClinicalReview) {
    return "requires-clinical-review";
  }

  if (
    conflict &&
    (conflict.conflictLevel === "moderate" ||
      conflict.conflictLevel === "high" ||
      conflict.conflictLevel === "critical")
  ) {
    return "limited-by-conflict";
  }

  if (missingEvidenceCount > 0) {
    return "limited-by-missing-evidence";
  }

  return "calibrated";
}

function applySafetyLimits({
  confidence,
  conflict,
  missingEvidenceCount,
}: {
  confidence: ClinicalCalibratedConfidence;

  conflict: ResolvedClinicalHypothesisConflict | null;

  missingEvidenceCount: number;
}): ClinicalCalibratedConfidence {
  if (
    conflict?.requiresClinicalReview ||
    conflict?.conflictLevel === "critical"
  ) {
    return limitConfidence(confidence, "low");
  }

  if (conflict?.conflictLevel === "high") {
    return limitConfidence(confidence, "low");
  }

  if (conflict?.conflictLevel === "moderate") {
    return limitConfidence(confidence, "moderate");
  }

  if (missingEvidenceCount >= 3) {
    return limitConfidence(confidence, "moderate");
  }

  if (missingEvidenceCount > 0) {
    return limitConfidence(confidence, "high");
  }

  return confidence;
}

function compareConfidence(
  first: ClinicalEvidenceConfidence,
  second: ClinicalEvidenceConfidence,
): number {
  return CONFIDENCE_ORDER.indexOf(first) - CONFIDENCE_ORDER.indexOf(second);
}

function buildCalibrationReason({
  rankedHypothesis,
  conflict,
  calibratedConfidence,
  calibrationScore,
  status,
}: {
  rankedHypothesis: RankedClinicalHypothesis;

  conflict: ResolvedClinicalHypothesisConflict | null;

  calibratedConfidence: ClinicalCalibratedConfidence;

  calibrationScore: number;

  status: ClinicalConfidenceCalibrationStatus;
}): string {
  const parts: string[] = [
    `The deterministic ranking score is ${rankedHypothesis.score.toFixed(3)}.`,
    `The calibrated evidence score is ${calibrationScore.toFixed(3)}.`,
    `The calibrated confidence level is ${calibratedConfidence}.`,
  ];

  if (conflict && conflict.conflictLevel !== "none") {
    parts.push(
      `The conflict level is ${conflict.conflictLevel}, which limits confidence.`,
    );
  }

  if (rankedHypothesis.hypothesis.missingEvidence.length > 0) {
    parts.push(
      `${rankedHypothesis.hypothesis.missingEvidence.length} missing evidence item${rankedHypothesis.hypothesis.missingEvidence.length === 1 ? "" : "s"} limit certainty.`,
    );
  }

  if (status === "requires-clinical-review") {
    parts.push(
      "Confidence cannot be increased until the conflicting evidence is reviewed clinically.",
    );
  }

  parts.push(
    "This confidence level represents confidence in the evidence-grounded interpretation, not the probability that a disease is present.",
  );

  return parts.join(" ");
}

function calibrateOneHypothesis(
  rankedHypothesis: RankedClinicalHypothesis,
  conflictResolution: ClinicalConflictResolutionResult,
): CalibratedClinicalHypothesisConfidence {
  const hypothesis = rankedHypothesis.hypothesis;

  const conflict = findConflict(hypothesis.id, conflictResolution);

  const supportingEvidence = averageEvidenceWeight(
    hypothesis.supportingEvidence,
  );

  const contradictingEvidence = averageEvidenceWeight(
    hypothesis.contradictingEvidence,
  );

  const missingEvidencePenalty = Math.min(
    0.3,
    hypothesis.missingEvidence.length * 0.05,
  );

  const conflictPenalty = CONFLICT_PENALTIES[conflict?.conflictLevel ?? "none"];

  const clinicalReviewPenalty = conflict?.requiresClinicalReview ? 0.15 : 0;

  const calibrationScore = clampScore(
    rankedHypothesis.score * 0.5 +
      supportingEvidence * 0.5 -
      contradictingEvidence * 0.25 -
      missingEvidencePenalty -
      conflictPenalty -
      clinicalReviewPenalty,
  );

  const scoreConfidence = confidenceFromScore(calibrationScore);

  const calibratedConfidence = applySafetyLimits({
    confidence: scoreConfidence,

    conflict,

    missingEvidenceCount: hypothesis.missingEvidence.length,
  });

  const status = resolveStatus(conflict, hypothesis.missingEvidence.length);

  const confidenceComparison = compareConfidence(
    calibratedConfidence,
    hypothesis.confidence,
  );

  return {
    hypothesisId: hypothesis.id,

    rankingPosition: rankedHypothesis.position,

    originalConfidence: hypothesis.confidence,

    calibratedConfidence,

    calibrationScore,

    status,

    components: {
      rankingScore: rankedHypothesis.score,

      supportingEvidence,

      contradictingEvidence,

      missingEvidencePenalty,

      conflictPenalty,

      clinicalReviewPenalty,
    },

    conflictLevel: conflict?.conflictLevel ?? "none",

    confidenceWasReduced: confidenceComparison < 0,

    confidenceWasIncreased: confidenceComparison > 0,

    canPresentAsHighConfidence:
      calibratedConfidence === "high" || calibratedConfidence === "very-high",

    requiresClinicalReview: conflict?.requiresClinicalReview ?? false,

    missingEvidenceCount: hypothesis.missingEvidence.length,

    reason: buildCalibrationReason({
      rankedHypothesis,

      conflict,

      calibratedConfidence,

      calibrationScore,

      status,
    }),
  };
}

export function calibrateClinicalConfidence({
  ranking,
  conflictResolution,
  referenceTime,
}: CalibrateClinicalConfidenceInput): ClinicalConfidenceCalibrationResult {
  const generatedAt = normalizeReferenceTime(referenceTime).toISOString();

  if (ranking.rankedHypotheses.length === 0) {
    return {
      calibrations: [],

      hypothesisCount: 0,

      calibratedCount: 0,

      limitedConfidenceCount: 0,

      clinicalReviewCount: 0,

      highestConfidenceHypothesisId: null,

      calibrationApplied: false,

      reason: "No ranked hypotheses are available for confidence calibration.",

      safetyBoundary:
        "Calibrated confidence describes confidence in an interpretation and must not be presented as disease probability or diagnostic certainty.",

      generatedAt,
    };
  }

  const calibrations = ranking.rankedHypotheses.map((rankedHypothesis) =>
    calibrateOneHypothesis(rankedHypothesis, conflictResolution),
  );

  const highestConfidence =
    [...calibrations].sort((first, second) => {
      const confidenceDifference = compareConfidence(
        second.calibratedConfidence,
        first.calibratedConfidence,
      );

      if (confidenceDifference !== 0) {
        return confidenceDifference;
      }

      if (second.calibrationScore !== first.calibrationScore) {
        return second.calibrationScore - first.calibrationScore;
      }

      return first.rankingPosition - second.rankingPosition;
    })[0] ?? null;

  const limitedConfidenceCount = calibrations.filter(
    (calibration) =>
      calibration.status === "limited-by-conflict" ||
      calibration.status === "limited-by-missing-evidence" ||
      calibration.status === "requires-clinical-review",
  ).length;

  const clinicalReviewCount = calibrations.filter(
    (calibration) => calibration.requiresClinicalReview,
  ).length;

  return {
    calibrations,

    hypothesisCount: calibrations.length,

    calibratedCount: calibrations.length,

    limitedConfidenceCount,

    clinicalReviewCount,

    highestConfidenceHypothesisId: highestConfidence?.hypothesisId ?? null,

    calibrationApplied: true,

    reason:
      "Hypothesis confidence was calibrated deterministically using ranking strength, supporting evidence, contradicting evidence, missing evidence, and conflict severity.",

    safetyBoundary:
      "Calibrated confidence describes confidence in an interpretation and must not be presented as disease probability or diagnostic certainty.",

    generatedAt,
  };
}
