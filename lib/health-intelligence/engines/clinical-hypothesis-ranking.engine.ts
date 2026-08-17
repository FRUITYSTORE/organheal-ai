import type {
  ClinicalEvidenceConfidence,
  ClinicalPriority,
} from "@/lib/health-intelligence/models/whole-body-clinical-knowledge";

import type {
  ClinicalHypothesis,
  ClinicalHypothesisCollection,
} from "@/lib/health-intelligence/models/clinical-hypothesis";

export type ClinicalHypothesisRankingComponents = {
  supportingEvidence: number;

  contradictingEvidencePenalty: number;

  missingEvidencePenalty: number;

  priorityAdjustment: number;

  confidenceAdjustment: number;
};

export type RankedClinicalHypothesis = {
  hypothesis: ClinicalHypothesis;

  position: number;

  score: number;

  components: ClinicalHypothesisRankingComponents;

  hasEvidenceConflict: boolean;

  reason: string;
};

export type ClinicalHypothesisRankingResult = {
  rankedHypotheses: RankedClinicalHypothesis[];

  hypothesisCount: number;

  highestRankedHypothesisId: string | null;

  lowestRankedHypothesisId: string | null;

  rankingApplied: boolean;

  reason: string;

  generatedAt: string;
};

export type RankClinicalHypothesesInput = {
  collection: ClinicalHypothesisCollection;

  referenceTime?: string | Date;
};

const CONTRADICTING_EVIDENCE_MULTIPLIER = 0.8;

const MISSING_EVIDENCE_PENALTY_PER_ITEM = 0.05;

const MAXIMUM_MISSING_EVIDENCE_PENALTY = 0.25;

const PRIORITY_ADJUSTMENTS: Record<ClinicalPriority, number> = {
  routine: 0,

  monitor: 0.02,

  important: 0.05,

  urgent: 0.08,

  emergency: 0.1,
};

const CONFIDENCE_ADJUSTMENTS: Record<ClinicalEvidenceConfidence, number> = {
  "very-low": -0.08,

  low: -0.04,

  moderate: 0,

  high: 0.04,

  "very-high": 0.07,
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

function clampScore(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

function calculateAverageWeight(
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

function calculateMissingEvidencePenalty(
  hypothesis: ClinicalHypothesis,
): number {
  return Math.min(
    MAXIMUM_MISSING_EVIDENCE_PENALTY,
    hypothesis.missingEvidence.length * MISSING_EVIDENCE_PENALTY_PER_ITEM,
  );
}

function buildRankingComponents(
  hypothesis: ClinicalHypothesis,
): ClinicalHypothesisRankingComponents {
  const supportingEvidence = calculateAverageWeight(
    hypothesis.supportingEvidence,
  );

  const contradictingEvidenceAverage = calculateAverageWeight(
    hypothesis.contradictingEvidence,
  );

  return {
    supportingEvidence,

    contradictingEvidencePenalty: clampScore(
      contradictingEvidenceAverage * CONTRADICTING_EVIDENCE_MULTIPLIER,
    ),

    missingEvidencePenalty: calculateMissingEvidencePenalty(hypothesis),

    priorityAdjustment: PRIORITY_ADJUSTMENTS[hypothesis.priority],

    confidenceAdjustment: CONFIDENCE_ADJUSTMENTS[hypothesis.confidence],
  };
}

function calculateRankingScore(
  components: ClinicalHypothesisRankingComponents,
): number {
  return clampScore(
    components.supportingEvidence -
      components.contradictingEvidencePenalty -
      components.missingEvidencePenalty +
      components.priorityAdjustment +
      components.confidenceAdjustment,
  );
}

function buildRankingReason(
  hypothesis: ClinicalHypothesis,
  components: ClinicalHypothesisRankingComponents,
  hasEvidenceConflict: boolean,
): string {
  const reasons: string[] = [
    `The average supporting-evidence weight is ${components.supportingEvidence.toFixed(3)}.`,
  ];

  if (hypothesis.contradictingEvidence.length > 0) {
    reasons.push(
      `Contradicting evidence produced a penalty of ${components.contradictingEvidencePenalty.toFixed(3)}.`,
    );
  } else {
    reasons.push(
      "No explicitly contradicting evidence was attached to this hypothesis.",
    );
  }

  if (hypothesis.missingEvidence.length > 0) {
    reasons.push(
      `Missing evidence produced a penalty of ${components.missingEvidencePenalty.toFixed(3)}.`,
    );
  }

  if (components.priorityAdjustment !== 0) {
    reasons.push(
      `Clinical priority contributed an adjustment of ${components.priorityAdjustment.toFixed(3)}.`,
    );
  }

  if (components.confidenceAdjustment !== 0) {
    reasons.push(
      `Relationship confidence contributed an adjustment of ${components.confidenceAdjustment.toFixed(3)}.`,
    );
  }

  if (hasEvidenceConflict) {
    reasons.push(
      "The supporting and contradicting evidence are close enough in weight to require explicit conflict review.",
    );
  }

  reasons.push(
    "The ranking score prioritizes evidence-grounded review and is not a disease probability or diagnostic certainty.",
  );

  return reasons.join(" ");
}

function rankOneHypothesis(
  hypothesis: ClinicalHypothesis,
): Omit<RankedClinicalHypothesis, "position"> {
  const components = buildRankingComponents(hypothesis);

  const score = calculateRankingScore(components);

  const contradictingEvidenceAverage =
    hypothesis.contradictingEvidence.length === 0
      ? 0
      : components.contradictingEvidencePenalty /
        CONTRADICTING_EVIDENCE_MULTIPLIER;

  const evidenceDifference = Math.abs(
    components.supportingEvidence - contradictingEvidenceAverage,
  );

  const hasEvidenceConflict =
    hypothesis.contradictingEvidence.length > 0 && evidenceDifference <= 0.15;

  return {
    hypothesis,

    score,

    components,

    hasEvidenceConflict,

    reason: buildRankingReason(hypothesis, components, hasEvidenceConflict),
  };
}

export function rankClinicalHypotheses({
  collection,
  referenceTime,
}: RankClinicalHypothesesInput): ClinicalHypothesisRankingResult {
  const generatedAt = normalizeReferenceTime(referenceTime).toISOString();

  if (collection.hypotheses.length === 0) {
    return {
      rankedHypotheses: [],

      hypothesisCount: 0,

      highestRankedHypothesisId: null,

      lowestRankedHypothesisId: null,

      rankingApplied: false,

      reason: "No hypotheses are available for ranking.",

      generatedAt,
    };
  }

  const rankedHypotheses = collection.hypotheses
    .map((hypothesis) => rankOneHypothesis(hypothesis))
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return first.hypothesis.id.localeCompare(second.hypothesis.id);
    })
    .map((rankedHypothesis, index) => ({
      ...rankedHypothesis,

      position: index + 1,
    }));

  return {
    rankedHypotheses,

    hypothesisCount: rankedHypotheses.length,

    highestRankedHypothesisId: rankedHypotheses[0]?.hypothesis.id ?? null,

    lowestRankedHypothesisId:
      rankedHypotheses[rankedHypotheses.length - 1]?.hypothesis.id ?? null,

    rankingApplied: true,

    reason:
      "Hypotheses were ranked deterministically using weighted supporting evidence, contradicting evidence, missing-information penalties, clinical priority, and relationship confidence.",

    generatedAt,
  };
}
