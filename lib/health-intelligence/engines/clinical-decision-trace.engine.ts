import type {
  CalibratedClinicalHypothesisConfidence,
  ClinicalConfidenceCalibrationResult,
} from "@/lib/health-intelligence/engines/clinical-confidence-calibration.engine";

import type {
  ClinicalConflictResolutionResult,
  ResolvedClinicalHypothesisConflict,
} from "@/lib/health-intelligence/engines/clinical-conflict-resolution.engine";

import type {
  ClinicalHypothesisRankingResult,
  RankedClinicalHypothesis,
} from "@/lib/health-intelligence/engines/clinical-hypothesis-ranking.engine";

import type { ClinicalHypothesisEvidence } from "@/lib/health-intelligence/models/clinical-hypothesis";

export type ClinicalDecisionTraceStatus =
  | "not-available"
  | "available"
  | "limited-by-missing-evidence"
  | "limited-by-conflict"
  | "requires-clinical-review";

export type ClinicalDecisionTraceEvidence = {
  evidenceId: string;

  normalizedWeight: number;

  explanation: string;
};

export type ClinicalDecisionTrace = {
  available: boolean;

  status: ClinicalDecisionTraceStatus;

  hypothesisId: string | null;

  hypothesisTitle: string | null;

  hypothesisDescription: string | null;

  hypothesisKind: string | null;

  hypothesisStatus: string | null;

  rankingPosition: number | null;

  rankingScore: number | null;

  rankingReason: string | null;

  supportingEvidence: ClinicalDecisionTraceEvidence[];

  contradictingEvidence: ClinicalDecisionTraceEvidence[];

  contextualEvidence: ClinicalDecisionTraceEvidence[];

  missingEvidence: string[];

  conflictLevel: string | null;

  conflictReason: string | null;

  calibratedConfidence: string | null;

  confidenceReason: string | null;

  requiresClarification: boolean;

  requiresAdditionalEvidence: boolean;

  requiresClinicalReview: boolean;

  whatCouldChangeInterpretation: string[];

  interpretationBoundary: string | null;

  traceReason: string;

  generatedAt: string;
};

export type BuildClinicalDecisionTraceInput = {
  ranking: ClinicalHypothesisRankingResult;

  conflictResolution: ClinicalConflictResolutionResult;

  confidenceCalibration: ClinicalConfidenceCalibrationResult;

  referenceTime?: string | Date;
};

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

function mapEvidence(
  evidence: ClinicalHypothesisEvidence[],
): ClinicalDecisionTraceEvidence[] {
  return evidence.map((item) => ({
    evidenceId: item.evidenceId,

    normalizedWeight: item.normalizedWeight,

    explanation: item.explanation,
  }));
}

function findRankedHypothesis(
  hypothesisId: string,
  ranking: ClinicalHypothesisRankingResult,
): RankedClinicalHypothesis | null {
  return (
    ranking.rankedHypotheses.find(
      (item) => item.hypothesis.id === hypothesisId,
    ) ?? null
  );
}

function findConflict(
  hypothesisId: string,
  conflictResolution: ClinicalConflictResolutionResult,
): ResolvedClinicalHypothesisConflict | null {
  return (
    conflictResolution.conflicts.find(
      (item) => item.hypothesisId === hypothesisId,
    ) ?? null
  );
}

function findCalibration(
  hypothesisId: string,
  confidenceCalibration: ClinicalConfidenceCalibrationResult,
): CalibratedClinicalHypothesisConfidence | null {
  return (
    confidenceCalibration.calibrations.find(
      (item) => item.hypothesisId === hypothesisId,
    ) ?? null
  );
}

function resolveTraceStatus({
  conflict,
  calibration,
  missingEvidenceCount,
}: {
  conflict: ResolvedClinicalHypothesisConflict | null;

  calibration: CalibratedClinicalHypothesisConfidence;

  missingEvidenceCount: number;
}): ClinicalDecisionTraceStatus {
  if (conflict?.requiresClinicalReview || calibration.requiresClinicalReview) {
    return "requires-clinical-review";
  }

  if (conflict && conflict.conflictLevel !== "none") {
    return "limited-by-conflict";
  }

  if (missingEvidenceCount > 0) {
    return "limited-by-missing-evidence";
  }

  return "available";
}

function buildWhatCouldChangeInterpretation({
  conflict,
  missingEvidence,
}: {
  conflict: ResolvedClinicalHypothesisConflict | null;

  missingEvidence: string[];
}): string[] {
  const items = new Set<string>();

  for (const missingItem of missingEvidence) {
    items.add(missingItem);
  }

  if (conflict?.requiresClarification) {
    items.add("Clarification of the unresolved evidence conflict.");
  }

  if (conflict?.requiresAdditionalEvidence) {
    items.add("Additional objective clinical evidence.");
  }

  if (conflict?.requiresClinicalReview) {
    items.add("Clinical review of the supporting and contradicting evidence.");
  }

  return [...items];
}

function createUnavailableTrace(
  generatedAt: string,
  reason: string,
  hypothesisId: string | null = null,
): ClinicalDecisionTrace {
  return {
    available: false,

    status: "not-available",

    hypothesisId,

    hypothesisTitle: null,

    hypothesisDescription: null,

    hypothesisKind: null,

    hypothesisStatus: null,

    rankingPosition: null,

    rankingScore: null,

    rankingReason: null,

    supportingEvidence: [],

    contradictingEvidence: [],

    contextualEvidence: [],

    missingEvidence: [],

    conflictLevel: null,

    conflictReason: null,

    calibratedConfidence: null,

    confidenceReason: null,

    requiresClarification: false,

    requiresAdditionalEvidence: false,

    requiresClinicalReview: false,

    whatCouldChangeInterpretation: [],

    interpretationBoundary: null,

    traceReason: reason,

    generatedAt,
  };
}

export function buildClinicalDecisionTrace({
  ranking,
  conflictResolution,
  confidenceCalibration,
  referenceTime,
}: BuildClinicalDecisionTraceInput): ClinicalDecisionTrace {
  const generatedAt = normalizeReferenceTime(referenceTime).toISOString();

  const hypothesisId =
    confidenceCalibration.highestConfidenceHypothesisId ??
    ranking.highestRankedHypothesisId;

  if (!hypothesisId) {
    return createUnavailableTrace(
      generatedAt,
      "No ranked and calibrated hypothesis is available for decision tracing.",
    );
  }

  const rankedHypothesis = findRankedHypothesis(hypothesisId, ranking);

  const calibration = findCalibration(hypothesisId, confidenceCalibration);

  if (!rankedHypothesis || !calibration) {
    return createUnavailableTrace(
      generatedAt,
      "The selected hypothesis could not be matched across ranking and confidence-calibration results.",
      hypothesisId,
    );
  }

  const conflict = findConflict(hypothesisId, conflictResolution);

  const hypothesis = rankedHypothesis.hypothesis;

  const status = resolveTraceStatus({
    conflict,

    calibration,

    missingEvidenceCount: hypothesis.missingEvidence.length,
  });

  return {
    available: true,

    status,

    hypothesisId,

    hypothesisTitle: hypothesis.title,

    hypothesisDescription: hypothesis.description,

    hypothesisKind: hypothesis.kind,

    hypothesisStatus: hypothesis.status,

    rankingPosition: rankedHypothesis.position,

    rankingScore: rankedHypothesis.score,

    rankingReason: rankedHypothesis.reason,

    supportingEvidence: mapEvidence(hypothesis.supportingEvidence),

    contradictingEvidence: mapEvidence(hypothesis.contradictingEvidence),

    contextualEvidence: mapEvidence(hypothesis.contextualEvidence),

    missingEvidence: [...hypothesis.missingEvidence],

    conflictLevel: conflict?.conflictLevel ?? "none",

    conflictReason: conflict?.reason ?? null,

    calibratedConfidence: calibration.calibratedConfidence,

    confidenceReason: calibration.reason,

    requiresClarification: conflict?.requiresClarification ?? false,

    requiresAdditionalEvidence: conflict?.requiresAdditionalEvidence ?? false,

    requiresClinicalReview:
      conflict?.requiresClinicalReview ?? calibration.requiresClinicalReview,

    whatCouldChangeInterpretation: buildWhatCouldChangeInterpretation({
      conflict,

      missingEvidence: hypothesis.missingEvidence,
    }),

    interpretationBoundary: hypothesis.interpretationBoundary,

    traceReason:
      "The decision trace consolidates existing ranking, evidence-conflict, confidence-calibration, uncertainty, and safety-boundary results without recalculating them.",

    generatedAt,
  };
}
