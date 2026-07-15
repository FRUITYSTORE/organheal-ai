import {
  HEALTH_INTELLIGENCE_RULES,
} from "../rules/health-intelligence-rules";

import type {
  HealthEngineContext,
} from "./shared/health-engine-context";

import {
  buildHealthMomentumSignals,
  type HealthMomentumSignals,
} from "./shared/health-momentum-signals";

export type ClinicalConfidenceLevel =
  | "low"
  | "moderate"
  | "high";

export type ClinicalConfidenceLimitationCode =
  | "no-health-data"
  | "single-source-category"
  | "limited-data-volume"
  | "no-comparable-history"
  | "no-medical-report"
  | "no-generated-analysis";

export type ClinicalConfidenceStrengthCode =
  | "multiple-source-categories"
  | "sufficient-data-volume"
  | "comparable-history-available"
  | "medical-report-available"
  | "generated-analysis-available";

export type ClinicalConfidenceFactor = {
    category:
    | "source-coverage"
    | "data-volume"
    | "history";

  scoreContribution: number;
  maximumContribution: number;
};

export type ClinicalConfidenceData = {
  level: ClinicalConfidenceLevel;
  score: number;

  factors: ClinicalConfidenceFactor[];

  strengths:
    ClinicalConfidenceStrengthCode[];

  limitations:
    ClinicalConfidenceLimitationCode[];

  evidenceMaturity:
    HealthEngineContext["reasoning"]["evidence"]["maturity"];

  comparableSourceCount: number;

  generatedAt: string;
};

function clampScore(
  score: number
): number {
  return Math.max(
    0,
    Math.min(100, score)
  );
}

function getConfidenceLevel(
  score: number
): ClinicalConfidenceLevel {
  if (
    score >=
    HEALTH_INTELLIGENCE_RULES
      .confidence
      .highMinimumScore
  ) {
    return "high";
  }

  if (
    score >=
    HEALTH_INTELLIGENCE_RULES
      .confidence
      .moderateMinimumScore
  ) {
    return "moderate";
  }

  return "low";
}

function buildFactors(
  engineContext: HealthEngineContext,
    momentumSignals: HealthMomentumSignals
): ClinicalConfidenceFactor[] {
  const {
    facts,
  } = engineContext;

  const weights =
    HEALTH_INTELLIGENCE_RULES
      .confidence
      .weights;

  const sourceCoverage =
    facts.evidence
      .availableSourceCount *
    weights.sourceCategory;

  const dataVolume =
    Math.min(
      weights.dataPointMaximum,

      facts.evidence
        .totalDataPoints *
        weights.dataPoint
    );

   const comparableHistory =
    Math.min(
      weights.comparableHistoryMaximum,

      momentumSignals.comparable.length *
        weights.comparableHistorySource
    );

  return [
    {
      category:
        "source-coverage",

      scoreContribution:
        sourceCoverage,

      maximumContribution:
        weights.sourceCategory * 4,
    },
    {
      category:
        "data-volume",

      scoreContribution:
        dataVolume,

      maximumContribution:
        weights.dataPointMaximum,
    },
    {
      category:
        "history",

      scoreContribution:
        comparableHistory,

      maximumContribution:
        weights.comparableHistoryMaximum,
    },
  ];
}

function buildStrengths(
  engineContext: HealthEngineContext,
    momentumSignals: HealthMomentumSignals
): ClinicalConfidenceStrengthCode[] {
  const {
    facts,
    context,
  } = engineContext;

  const strengths:
    ClinicalConfidenceStrengthCode[] = [];

  if (
    facts.evidence
      .availableSourceCount >= 2
  ) {
    strengths.push(
      "multiple-source-categories"
    );
  }

  if (
    facts.evidence
      .totalDataPoints >= 5
  ) {
    strengths.push(
      "sufficient-data-volume"
    );
  }

  if (
    momentumSignals.comparable.length > 0
  ) {
    strengths.push(
      "comparable-history-available"
    );
  }

  if (
    context.readiness.hasReport
  ) {
    strengths.push(
      "medical-report-available"
    );
  }

  if (
    context.readiness.hasAnalysis
  ) {
    strengths.push(
      "generated-analysis-available"
    );
  }

  return strengths;
}

function buildLimitations(
  engineContext: HealthEngineContext,
   momentumSignals: HealthMomentumSignals
): ClinicalConfidenceLimitationCode[] {
  const {
    facts,
    context,
  } = engineContext;

  if (!facts.hasHealthData) {
    return [
      "no-health-data",
    ];
  }

  const limitations:
    ClinicalConfidenceLimitationCode[] = [];

  if (
    facts.evidence
      .availableSourceCount < 2
  ) {
    limitations.push(
      "single-source-category"
    );
  }

  if (
    facts.evidence
      .totalDataPoints < 5
  ) {
    limitations.push(
      "limited-data-volume"
    );
  }

  if (
    momentumSignals.comparable.length === 0
  ) {
    limitations.push(
      "no-comparable-history"
    );
  }

  if (
    !context.readiness.hasReport
  ) {
    limitations.push(
      "no-medical-report"
    );
  }

  if (
    !context.readiness.hasAnalysis
  ) {
    limitations.push(
      "no-generated-analysis"
    );
  }

  return limitations;
}

export function buildClinicalConfidence(
  engineContext: HealthEngineContext
): ClinicalConfidenceData {
  const {
    context,
    facts,
    reasoning,
  } = engineContext;

   const momentumSignals =
    buildHealthMomentumSignals(
      engineContext
    );

  const factors =
    buildFactors(
      engineContext,
      momentumSignals
    );

  const score =
    facts.hasHealthData
      ? clampScore(
          factors.reduce(
            (
              total,
              factor
            ) =>
              total +
              factor.scoreContribution,
            0
          )
        )
      : 0;

  return {
    level:
      getConfidenceLevel(score),

    score,

    factors,

    strengths:
      buildStrengths(
        engineContext,
        momentumSignals
      ),

    limitations:
      buildLimitations(
        engineContext,
        momentumSignals
      ),

    evidenceMaturity:
      reasoning.evidence.maturity,

        comparableSourceCount:
      momentumSignals.comparable.length,

    generatedAt:
      context.generatedAt,
  };
}