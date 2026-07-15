import type {
  HealthIntelligenceContext,
} from "../context/health-intelligence-context";
import {
  HEALTH_INTELLIGENCE_RULES,
} from "../rules/health-intelligence-rules";

export type HealthFactsScoreComparison =
  | "assessment-higher"
  | "check-in-higher"
  | "aligned"
  | "unavailable";

export type HealthFactsArea = {
  name: string;
  score: number;
};

export type HealthFactsSourceAvailability = {
  assessments: boolean;
  checkIns: boolean;
  reports: boolean;
  analyses: boolean;
};

export type HealthFacts = {
  hasHealthData: boolean;

  scores: {
    overall: number;
    assessmentAverage: number | null;
    checkInAverage: number | null;
  };

  priorityArea: HealthFactsArea | null;
  strongestArea: HealthFactsArea | null;

  scoreComparison: {
    relationship: HealthFactsScoreComparison;
    difference: number | null;
  };

  evidence: {
    totalDataPoints: number;
    availableSourceCount: number;
    dataCompleteness: number;
    sources: HealthFactsSourceAvailability;
  };

  generatedAt: string;
};

function buildScoreComparison(
  assessmentAverage: number | null,
  checkInAverage: number | null
): HealthFacts["scoreComparison"] {
  if (
    assessmentAverage === null ||
    checkInAverage === null
  ) {
    return {
      relationship: "unavailable",
      difference: null,
    };
  }

  const difference =
    assessmentAverage -
    checkInAverage;

    if (
    Math.abs(difference) <=
    HEALTH_INTELLIGENCE_RULES
      .score
      .comparison
      .alignedMaximumDifference
  ) {
    return {
      relationship: "aligned",
      difference: Math.abs(difference),
    };
  }

  return {
    relationship:
      difference > 0
        ? "assessment-higher"
        : "check-in-higher",

    difference:
      Math.abs(difference),
  };
}

export function buildHealthFacts(
  context: HealthIntelligenceContext
): HealthFacts {
  const {
    scoreSummary,
    sourceSummary,
    readiness,
  } = context;

  const priorityArea =
    scoreSummary.priorityArea !== null &&
    scoreSummary.priorityScore !== null
      ? {
          name:
            scoreSummary.priorityArea,
          score:
            scoreSummary.priorityScore,
        }
      : null;

  const strongestArea =
    scoreSummary.strongestArea !== null &&
    scoreSummary.strongestScore !== null
      ? {
          name:
            scoreSummary.strongestArea,
          score:
            scoreSummary.strongestScore,
        }
      : null;

  return {
    hasHealthData:
      sourceSummary.totalDataPoints > 0,

    scores: {
      overall:
        scoreSummary.overallScore,

      assessmentAverage:
        scoreSummary.assessmentAverage,

      checkInAverage:
        scoreSummary.checkInAverage,
    },

    priorityArea,
    strongestArea,

    scoreComparison:
      buildScoreComparison(
        scoreSummary.assessmentAverage,
        scoreSummary.checkInAverage
      ),

    evidence: {
      totalDataPoints:
        sourceSummary.totalDataPoints,

      availableSourceCount:
        sourceSummary.availableSourceCount,

      dataCompleteness:
        readiness.dataCompleteness,

      sources: {
        assessments:
          readiness.hasAssessment,

        checkIns:
          readiness.hasCheckIn,

        reports:
          readiness.hasReport,

        analyses:
          readiness.hasAnalysis,
      },
    },

    generatedAt:
      context.generatedAt,
  };
}