import {
  HEALTH_INTELLIGENCE_RULES,
} from "../rules/health-intelligence-rules";

import type {
  HealthEngineContext,
} from "./shared/health-engine-context";

import {
  buildHealthMomentumSignals,
  type HealthMomentumSignal,
  type HealthMomentumSignals,
} from "./shared/health-momentum-signals";

export type EvidenceStrength =
  | "insufficient"
  | "weak"
  | "moderate"
  | "strong"
  | "very-strong";

export type EvidenceReasonCode =
  | "multiple-source-categories"
  | "sufficient-data-volume"
  | "recent-assessment-available"
  | "recent-checkin-available"
  | "medical-report-available"
  | "processed-report-available"
  | "generated-analysis-available"
  | "comparable-history-available"
  | "assessment-checkin-aligned";
  

export type EvidenceGapCode =
  | "no-health-data"
  | "single-source-category"
  | "limited-data-volume"
  | "no-assessment"
  | "no-checkin"
  | "no-medical-report"
  | "report-not-processed"
  | "no-generated-analysis"
  | "no-comparable-history";

export type EvidenceContradictionCode =
  | "assessment-checkin-divergence"
  | "assessment-improving-checkin-declining"
  | "assessment-declining-checkin-improving";

export type EvidenceRecommendationCode =
  | "complete-assessment"
  | "complete-checkin"
  | "upload-medical-report"
  | "process-pending-report"
  | "generate-report-analysis"
  | "add-followup-data";

export type EvidenceSource =
  | "assessment"
  | "check-in"
  | "report"
  | "analysis"
  | "history"
  | "combined";

export type EvidenceReason = {
  code: EvidenceReasonCode;
  source: EvidenceSource;

  weight:
  | "supporting"
  | "important"
  | "critical";

  values: {
    sourceCount?: number;
    dataPointCount?: number;
    difference?: number;
    score?: number;
  };
};

export type EvidenceGap = {
  code: EvidenceGapCode;
  source: EvidenceSource;

  impact:
  | "low"
  | "moderate"
  | "high";

  values: {
    sourceCount?: number;
    dataPointCount?: number;
  };
};

export type EvidenceContradiction = {
  code: EvidenceContradictionCode;
  source: "combined";

  severity:
    | "low"
    | "moderate"
    | "high";

  values: {
    assessmentDelta?: number;
    checkInDelta?: number;
    scoreDifference?: number;
  };
};

export type EvidenceRecommendation = {
  code: EvidenceRecommendationCode;

  priority:
    | "primary"
    | "secondary";

expectedEvidenceGain:
  | "low"
  | "moderate"
  | "high";

  href:
    | "/assessment"
    | "/checkin"
    | "/lab-upload"
    | "/reports";

  relatedGap:
    EvidenceGapCode | null;
};

export type EvidenceIntelligenceData = {
  strength: EvidenceStrength;
  strengthScore: number;

  reasons: EvidenceReason[];
  gaps: EvidenceGap[];

  contradictions:
    EvidenceContradiction[];

  recommendations:
    EvidenceRecommendation[];

   summary: {
    overallState:
      | "excellent"
      | "good"
      | "developing"
      | "limited";

    primaryStrength:
      EvidenceReasonCode | null;

    primaryGap:
      EvidenceGapCode | null;

    primaryRecommendation:
      EvidenceRecommendationCode | null;

    reasonCount: number;
    gapCount: number;
    contradictionCount: number;
    recommendationCount: number;
  };

  generatedAt: string;
};

function getEvidenceStrength(
  score: number
): EvidenceStrength {

  const thresholds =
    HEALTH_INTELLIGENCE_RULES
      .evidenceIntelligence
      .strength;

  if (
    score >=
    thresholds.veryStrongMinimum
  ) {
    return "very-strong";
  }

  if (
    score >=
    thresholds.strongMinimum
  ) {
    return "strong";
  }

  if (
    score >=
    thresholds.moderateMinimum
  ) {
    return "moderate";
  }

  if (
    score >=
    thresholds.weakMinimum
  ) {
    return "weak";
  }

  return "insufficient";
}

function buildReasons(
  engineContext: HealthEngineContext,
  momentumSignals: HealthMomentumSignals
): EvidenceReason[] {
  const {
    context,
    facts,
    reasoning,
  } = engineContext;

  const reasons:
    EvidenceReason[] = [];

  if (
    facts.evidence
      .availableSourceCount >= 2
  ) {
    reasons.push({
      code:
        "multiple-source-categories",

      source:
        "combined",

      weight:
        facts.evidence
          .availableSourceCount >= 3
          ? "critical"
          : "important",

      values: {
        sourceCount:
          facts.evidence
            .availableSourceCount,
      },
    });
  }

  if (
    facts.evidence.totalDataPoints >=
    HEALTH_INTELLIGENCE_RULES
      .evidenceIntelligence
      .sufficientDataPointCount
  ) {
    reasons.push({
      code:
        "sufficient-data-volume",

      source:
        "combined",

      weight:
        "important",

      values: {
        dataPointCount:
          facts.evidence
            .totalDataPoints,
      },
    });
  }

  if (
    context.readiness.hasAssessment
  ) {
    reasons.push({
      code:
        "recent-assessment-available",

      source:
        "assessment",

      weight:
        "supporting",

      values: {
        score:
          context.latestAssessment
            ?.score,
      },
    });
  }

  if (
    context.readiness.hasCheckIn
  ) {
    reasons.push({
      code:
        "recent-checkin-available",

      source:
        "check-in",

      weight:
        "supporting",

      values: {
        score:
          context.latestCheckIn
            ?.wellnessScore,
      },
    });
  }

  if (
    context.readiness.hasReport
  ) {
    reasons.push({
      code:
        "medical-report-available",

      source:
        "report",

      weight:
        "important",

      values: {},
    });
  }

  if (
    context.reportSummary
      .processedReports > 0
  ) {
    reasons.push({
      code:
        "processed-report-available",

      source:
        "report",

      weight:
        "critical",

      values: {},
    });
  }

  if (
    context.analysisSummary
      .generatedAnalyses > 0
  ) {
    reasons.push({
      code:
        "generated-analysis-available",

      source:
        "analysis",

      weight:
        "critical",

      values: {},
    });
  }

  if (
    momentumSignals
      .comparable.length > 0
  ) {
    reasons.push({
      code:
        "comparable-history-available",

      source:
        "history",

      weight:
        "important",

      values: {
        sourceCount:
          momentumSignals
            .comparable.length,
      },
    });
  }

  if (
    reasoning.scoreRelationship
      .relationship === "aligned"
  ) {
    reasons.push({
      code:
        "assessment-checkin-aligned",

      source:
        "combined",

      weight:
        "important",

      values: {
        difference:
          reasoning
            .scoreRelationship
            .difference ??
          undefined,
      },
    });
  }

  return reasons;
}

function buildGaps(
  engineContext: HealthEngineContext,
  momentumSignals: HealthMomentumSignals
): EvidenceGap[] {
  const {
    context,
    facts,
  } = engineContext;

  if (!facts.hasHealthData) {
    return [
      {
        code:
          "no-health-data",

        source:
          "combined",

        impact:
          "high",

        values: {},
      },
    ];
  }

  const gaps:
    EvidenceGap[] = [];

  if (
    facts.evidence
      .availableSourceCount < 2
  ) {
    gaps.push({
      code:
        "single-source-category",

      source:
        "combined",

      impact:
        "high",

      values: {
        sourceCount:
          facts.evidence
            .availableSourceCount,
      },
    });
  }

  if (
    facts.evidence.totalDataPoints <
    HEALTH_INTELLIGENCE_RULES
      .evidenceIntelligence
      .sufficientDataPointCount
  ) {
    gaps.push({
      code:
        "limited-data-volume",

      source:
        "combined",

      impact:
        "moderate",

      values: {
        dataPointCount:
          facts.evidence
            .totalDataPoints,
      },
    });
  }

  if (
    !context.readiness.hasAssessment
  ) {
    gaps.push({
      code:
        "no-assessment",

      source:
        "assessment",

      impact:
        "high",

      values: {},
    });
  }

  if (
    !context.readiness.hasCheckIn
  ) {
    gaps.push({
      code:
        "no-checkin",

      source:
        "check-in",

      impact:
        "moderate",

      values: {},
    });
  }

  if (
    !context.readiness.hasReport
  ) {
    gaps.push({
      code:
        "no-medical-report",

      source:
        "report",

      impact:
        "high",

      values: {},
    });
  }

  if (
    context.readiness.hasReport &&
    context.reportSummary
      .processedReports === 0
  ) {
    gaps.push({
      code:
        "report-not-processed",

      source:
        "report",

      impact:
        "high",

      values: {},
    });
  }

  if (
    context.analysisSummary
      .generatedAnalyses === 0
  ) {
    gaps.push({
      code:
        "no-generated-analysis",

      source:
        "analysis",

      impact:
        "high",

      values: {},
    });
  }

  if (
    momentumSignals
      .comparable.length === 0
  ) {
    gaps.push({
      code:
        "no-comparable-history",

      source:
        "history",

      impact:
        "moderate",

      values: {},
    });
  }

  return gaps;
}

function getContradictionSeverity(
  difference: number
): EvidenceContradiction["severity"] {
  const rules =
    HEALTH_INTELLIGENCE_RULES
      .evidenceIntelligence
      .contradiction;

  if (
    difference >=
    rules.highDifferenceMinimum
  ) {
    return "high";
  }

  if (
    difference >=
    rules.moderateDifferenceMinimum
  ) {
    return "moderate";
  }

  return "low";
}

function getSignal(
  signals: HealthMomentumSignals,
  source:
    HealthMomentumSignal["source"]
): HealthMomentumSignal | null {
  return (
    signals.comparable.find(
      (signal) =>
        signal.source === source
    ) ?? null
  );
}

function buildContradictions(
  engineContext: HealthEngineContext,
  momentumSignals: HealthMomentumSignals
): EvidenceContradiction[] {
  const {
    reasoning,
  } = engineContext;

  const contradictions:
    EvidenceContradiction[] = [];

  const assessmentSignal =
    getSignal(
      momentumSignals,
      "assessment"
    );

  const checkInSignal =
    getSignal(
      momentumSignals,
      "check-in"
    );

  if (
    assessmentSignal &&
    checkInSignal &&
    assessmentSignal.direction ===
      "improving" &&
    checkInSignal.direction ===
      "declining"
  ) {
    contradictions.push({
      code:
        "assessment-improving-checkin-declining",

      source:
        "combined",

      severity:
        getContradictionSeverity(
          Math.abs(
            assessmentSignal.delta -
              checkInSignal.delta
          )
        ),

      values: {
        assessmentDelta:
          assessmentSignal.delta,

        checkInDelta:
          checkInSignal.delta,
      },
    });
  }

  if (
    assessmentSignal &&
    checkInSignal &&
    assessmentSignal.direction ===
      "declining" &&
    checkInSignal.direction ===
      "improving"
  ) {
    contradictions.push({
      code:
        "assessment-declining-checkin-improving",

      source:
        "combined",

      severity:
        getContradictionSeverity(
          Math.abs(
            assessmentSignal.delta -
              checkInSignal.delta
          )
        ),

      values: {
        assessmentDelta:
          assessmentSignal.delta,

        checkInDelta:
          checkInSignal.delta,
      },
    });
  }

  const scoreDifference =
    reasoning
      .scoreRelationship
      .difference;

  if (
    reasoning
      .scoreRelationship
      .relationship !== "aligned" &&
    reasoning
      .scoreRelationship
      .relationship !==
      "unavailable" &&
    scoreDifference !== null
  ) {
    contradictions.push({
      code:
        "assessment-checkin-divergence",

      source:
        "combined",

      severity:
        getContradictionSeverity(
          scoreDifference
        ),

      values: {
        scoreDifference,
      },
    });
  }

  return contradictions;
}

function getGapRank(
  gap: EvidenceGap
): number {
  if (gap.impact === "high") {
    return 3;
  }

  if (gap.impact === "moderate") {
    return 2;
  }

  return 1;
}

function mapGapToRecommendation(
  gap: EvidenceGap
): Omit<
  EvidenceRecommendation,
  "priority"
> | null {
  switch (gap.code) {
    case "no-health-data":
    case "no-assessment":
      return {
        code:
          "complete-assessment",

        href:
          "/assessment",

        relatedGap:
          gap.code,

        expectedEvidenceGain:
          "high",
      };

    case "no-checkin":
      return {
        code:
          "complete-checkin",

        href:
          "/checkin",

        relatedGap:
          gap.code,

        expectedEvidenceGain:
          "moderate",
      };

    case "no-medical-report":
      return {
        code:
          "upload-medical-report",

        href:
          "/lab-upload",

        relatedGap:
          gap.code,

        expectedEvidenceGain:
          "high",
      };

    case "report-not-processed":
      return {
        code:
          "process-pending-report",

        href:
          "/reports",

        relatedGap:
          gap.code,

        expectedEvidenceGain:
          "high",
      };

    case "no-generated-analysis":
      return {
        code:
          "generate-report-analysis",

        href:
          "/reports",

        relatedGap:
          gap.code,

        expectedEvidenceGain:
          "high",
      };

    case "limited-data-volume":
    case "no-comparable-history":
    case "single-source-category":
      return {
        code:
          "add-followup-data",

        href:
          "/checkin",

        relatedGap:
          gap.code,

        expectedEvidenceGain:
          gap.impact === "high"
            ? "high"
            : "moderate",
      };
  }
}

function buildRecommendations(
  gaps: EvidenceGap[]
): EvidenceRecommendation[] {
  const sortedGaps =
    [...gaps].sort(
      (first, second) =>
        getGapRank(second) -
        getGapRank(first)
    );

  const recommendations:
    EvidenceRecommendation[] = [];

  const usedCodes =
    new Set<
      EvidenceRecommendationCode
    >();

  for (const gap of sortedGaps) {
    const mapped =
      mapGapToRecommendation(gap);

    if (
      !mapped ||
      usedCodes.has(mapped.code)
    ) {
      continue;
    }

    usedCodes.add(mapped.code);

    recommendations.push({
      ...mapped,

      priority:
        recommendations.length === 0
          ? "primary"
          : "secondary",
    });
  }

  return recommendations;
}

function calculateStrengthScore(
  engineContext: HealthEngineContext,
  contradictions:
    EvidenceContradiction[]
): number {
  const {
    facts,
  } = engineContext;

  const contradictionPenalty =
    contradictions.reduce(
      (total, contradiction) => {
        if (
          contradiction.severity ===
          "high"
        ) {
          return total + 15;
        }

        if (
          contradiction.severity ===
          "moderate"
        ) {
          return total + 8;
        }

        return total + 3;
      },
      0
    );

  return Math.max(
    0,
    Math.min(
      100,
      facts.evidence
        .dataCompleteness -
        contradictionPenalty
    )
  );
}

export function buildEvidenceIntelligence(
  engineContext: HealthEngineContext
): EvidenceIntelligenceData {
  const {
    context,
  } = engineContext;

  const momentumSignals =
    buildHealthMomentumSignals(
      engineContext
    );

  const reasons =
    buildReasons(
      engineContext,
      momentumSignals
    );

  const gaps =
    buildGaps(
      engineContext,
      momentumSignals
    );

  const contradictions =
    buildContradictions(
      engineContext,
      momentumSignals
    );

  const recommendations =
    buildRecommendations(gaps);

  const strengthScore =
    calculateStrengthScore(
      engineContext,
      contradictions
    );

  return {
    strength:
      getEvidenceStrength(
        strengthScore
      ),

    strengthScore,

    reasons,
    gaps,
    contradictions,
    recommendations,

       summary: {
      overallState:
        strengthScore >= 85
          ? "excellent"
          : strengthScore >= 70
            ? "good"
            : strengthScore >= 50
              ? "developing"
              : "limited",

      primaryStrength:
        reasons[0]?.code ?? null,

      primaryGap:
        gaps[0]?.code ?? null,

      primaryRecommendation:
        recommendations[0]?.code ??
        null,

      reasonCount:
        reasons.length,

      gapCount:
        gaps.length,

      contradictionCount:
        contradictions.length,

      recommendationCount:
        recommendations.length,
    },
    generatedAt:
      context.generatedAt,
  };
}