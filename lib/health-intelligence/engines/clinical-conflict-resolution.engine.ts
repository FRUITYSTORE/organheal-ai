import type {
  RankedClinicalHypothesis,
  ClinicalHypothesisRankingResult,
} from "@/lib/health-intelligence/engines/clinical-hypothesis-ranking.engine";

export type ClinicalConflictLevel =
  "none" | "low" | "moderate" | "high" | "critical";

export type ClinicalConflictResolutionStatus =
  | "no-conflict"
  | "monitor"
  | "needs-clarification"
  | "needs-additional-evidence"
  | "requires-clinical-review";

export type ClinicalConflictSource = {
  evidenceId: string;

  normalizedWeight: number;

  explanation: string;
};

export type ResolvedClinicalHypothesisConflict = {
  hypothesisId: string;

  rankingPosition: number;

  rankingScore: number;

  conflictLevel: ClinicalConflictLevel;

  resolutionStatus: ClinicalConflictResolutionStatus;

  supportingAverage: number;

  contradictingAverage: number;

  evidenceDifference: number;

  conflictSources: ClinicalConflictSource[];

  missingEvidence: string[];

  requiresClarification: boolean;

  requiresAdditionalEvidence: boolean;

  requiresClinicalReview: boolean;

  resolutionPriority: number;

  reason: string;
};

export type ClinicalConflictResolutionResult = {
  conflicts: ResolvedClinicalHypothesisConflict[];

  hypothesisCount: number;

  conflictCount: number;

  highImpactConflictCount: number;

  highestPriorityConflictHypothesisId: string | null;

  hasUnresolvedConflict: boolean;

  resolutionApplied: boolean;

  reason: string;

  generatedAt: string;
};

export type ResolveClinicalConflictsInput = {
  ranking: ClinicalHypothesisRankingResult;

  referenceTime?: string | Date;
};

const CLOSE_EVIDENCE_DIFFERENCE = 0.15;

const MODERATE_EVIDENCE_DIFFERENCE = 0.3;

const STRONG_CONTRADICTING_THRESHOLD = 0.7;

const CRITICAL_CONTRADICTING_THRESHOLD = 0.85;

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

function clampValue(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

function calculateAverage(
  evidence: Array<{
    normalizedWeight: number;
  }>,
): number {
  if (evidence.length === 0) {
    return 0;
  }

  return clampValue(
    evidence.reduce((total, item) => total + item.normalizedWeight, 0) /
      evidence.length,
  );
}

function resolveConflictLevel({
  supportingAverage,
  contradictingAverage,
  evidenceDifference,
  contradictingEvidenceCount,
}: {
  supportingAverage: number;

  contradictingAverage: number;

  evidenceDifference: number;

  contradictingEvidenceCount: number;
}): ClinicalConflictLevel {
  if (contradictingEvidenceCount === 0) {
    return "none";
  }

  if (
    contradictingAverage >= CRITICAL_CONTRADICTING_THRESHOLD &&
    evidenceDifference <= CLOSE_EVIDENCE_DIFFERENCE
  ) {
    return "critical";
  }

  if (
    contradictingAverage >= STRONG_CONTRADICTING_THRESHOLD &&
    evidenceDifference <= MODERATE_EVIDENCE_DIFFERENCE
  ) {
    return "high";
  }

  if (evidenceDifference <= MODERATE_EVIDENCE_DIFFERENCE) {
    return "moderate";
  }

  if (contradictingAverage < supportingAverage) {
    return "low";
  }

  return "moderate";
}

function resolveStatus(
  conflictLevel: ClinicalConflictLevel,
  missingEvidenceCount: number,
): ClinicalConflictResolutionStatus {
  if (conflictLevel === "none") {
    return missingEvidenceCount > 0
      ? "needs-additional-evidence"
      : "no-conflict";
  }

  if (conflictLevel === "low") {
    return missingEvidenceCount > 0 ? "needs-additional-evidence" : "monitor";
  }

  if (conflictLevel === "moderate") {
    return "needs-clarification";
  }

  if (conflictLevel === "high" || conflictLevel === "critical") {
    return "requires-clinical-review";
  }

  return "monitor";
}

function calculateResolutionPriority(
  conflictLevel: ClinicalConflictLevel,
  missingEvidenceCount: number,
  rankingPosition: number,
): number {
  const conflictScore: Record<ClinicalConflictLevel, number> = {
    none: 0,

    low: 1,

    moderate: 2,

    high: 3,

    critical: 4,
  };

  const missingEvidenceScore = Math.min(missingEvidenceCount, 5);

  const rankingImportance = Math.max(0, 6 - rankingPosition);

  return (
    conflictScore[conflictLevel] * 10 +
    missingEvidenceScore * 2 +
    rankingImportance
  );
}

function buildConflictReason({
  conflictLevel,
  supportingAverage,
  contradictingAverage,
  evidenceDifference,
  missingEvidenceCount,
}: {
  conflictLevel: ClinicalConflictLevel;

  supportingAverage: number;

  contradictingAverage: number;

  evidenceDifference: number;

  missingEvidenceCount: number;
}): string {
  const parts: string[] = [
    `Supporting evidence average is ${supportingAverage.toFixed(3)}.`,
    `Contradicting evidence average is ${contradictingAverage.toFixed(3)}.`,
    `The absolute evidence difference is ${evidenceDifference.toFixed(3)}.`,
    `The resolved conflict level is ${conflictLevel}.`,
  ];

  if (missingEvidenceCount > 0) {
    parts.push(
      `${missingEvidenceCount} missing evidence item${missingEvidenceCount === 1 ? "" : "s"} may materially change the interpretation.`,
    );
  }

  if (conflictLevel === "critical") {
    parts.push(
      "Strong supporting and contradicting evidence are closely balanced, so the hypothesis requires explicit clinical review before confidence can be increased.",
    );
  } else if (conflictLevel === "high") {
    parts.push(
      "Substantial contradicting evidence limits the hypothesis and requires clinical review.",
    );
  } else if (conflictLevel === "moderate") {
    parts.push(
      "The available evidence remains materially mixed and should be clarified before a stronger interpretation is provided.",
    );
  } else if (conflictLevel === "low") {
    parts.push(
      "Contradicting evidence is present but currently weaker than the supporting evidence.",
    );
  } else {
    parts.push(
      "No explicit contradicting evidence is attached to this hypothesis.",
    );
  }

  parts.push(
    "Conflict resolution supports evidence review and does not confirm or exclude a diagnosis.",
  );

  return parts.join(" ");
}

function resolveOneConflict(
  rankedHypothesis: RankedClinicalHypothesis,
): ResolvedClinicalHypothesisConflict {
  const hypothesis = rankedHypothesis.hypothesis;

  const supportingAverage = calculateAverage(hypothesis.supportingEvidence);

  const contradictingAverage = calculateAverage(
    hypothesis.contradictingEvidence,
  );

  const evidenceDifference = clampValue(
    Math.abs(supportingAverage - contradictingAverage),
  );

  const conflictLevel = resolveConflictLevel({
    supportingAverage,

    contradictingAverage,

    evidenceDifference,

    contradictingEvidenceCount: hypothesis.contradictingEvidence.length,
  });

  const resolutionStatus = resolveStatus(
    conflictLevel,
    hypothesis.missingEvidence.length,
  );

  const requiresClarification = resolutionStatus === "needs-clarification";

  const requiresAdditionalEvidence =
    resolutionStatus === "needs-additional-evidence";

  const requiresClinicalReview =
    resolutionStatus === "requires-clinical-review";

  return {
    hypothesisId: hypothesis.id,

    rankingPosition: rankedHypothesis.position,

    rankingScore: rankedHypothesis.score,

    conflictLevel,

    resolutionStatus,

    supportingAverage,

    contradictingAverage,

    evidenceDifference,

    conflictSources: hypothesis.contradictingEvidence.map((evidence) => ({
      evidenceId: evidence.evidenceId,

      normalizedWeight: evidence.normalizedWeight,

      explanation: evidence.explanation,
    })),

    missingEvidence: [...hypothesis.missingEvidence],

    requiresClarification,

    requiresAdditionalEvidence,

    requiresClinicalReview,

    resolutionPriority: calculateResolutionPriority(
      conflictLevel,
      hypothesis.missingEvidence.length,
      rankedHypothesis.position,
    ),

    reason: buildConflictReason({
      conflictLevel,

      supportingAverage,

      contradictingAverage,

      evidenceDifference,

      missingEvidenceCount: hypothesis.missingEvidence.length,
    }),
  };
}

export function resolveClinicalConflicts({
  ranking,
  referenceTime,
}: ResolveClinicalConflictsInput): ClinicalConflictResolutionResult {
  const generatedAt = normalizeReferenceTime(referenceTime).toISOString();

  if (ranking.rankedHypotheses.length === 0) {
    return {
      conflicts: [],

      hypothesisCount: 0,

      conflictCount: 0,

      highImpactConflictCount: 0,

      highestPriorityConflictHypothesisId: null,

      hasUnresolvedConflict: false,

      resolutionApplied: false,

      reason: "No ranked hypotheses are available for conflict resolution.",

      generatedAt,
    };
  }

  const conflicts = ranking.rankedHypotheses
    .map((rankedHypothesis) => resolveOneConflict(rankedHypothesis))
    .sort((first, second) => {
      if (second.resolutionPriority !== first.resolutionPriority) {
        return second.resolutionPriority - first.resolutionPriority;
      }

      return first.rankingPosition - second.rankingPosition;
    });

  const unresolvedConflicts = conflicts.filter(
    (conflict) =>
      conflict.conflictLevel !== "none" || conflict.requiresAdditionalEvidence,
  );

  const highImpactConflictCount = conflicts.filter(
    (conflict) =>
      conflict.conflictLevel === "high" ||
      conflict.conflictLevel === "critical",
  ).length;

  return {
    conflicts,

    hypothesisCount: conflicts.length,

    conflictCount: unresolvedConflicts.length,

    highImpactConflictCount,

    highestPriorityConflictHypothesisId:
      unresolvedConflicts[0]?.hypothesisId ?? null,

    hasUnresolvedConflict: unresolvedConflicts.length > 0,

    resolutionApplied: true,

    reason:
      "Ranked hypotheses were reviewed for supporting-versus-contradicting evidence balance, missing evidence, and the need for clarification or clinical review.",

    generatedAt,
  };
}
