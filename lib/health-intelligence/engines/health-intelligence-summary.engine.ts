import type {
  ClinicalConfidenceData,
} from "./clinical-confidence.engine";

import type {
  DecisionImpactData,
  DecisionImpactCode,
} from "./decision-impact.engine";

import type {
  EvidenceGapCode,
  EvidenceIntelligenceData,
  EvidenceReasonCode,
  EvidenceRecommendationCode,
} from "./evidence-intelligence.engine";

import type {
  HealthMomentumData,
  HealthMomentumStatus,
} from "./health-momentum.engine";

import type {
  HealthStoryData,
  HealthStoryTone,
} from "./health-story.engine";

import type {
  NextDecisionData,
  NextDecisionType,
  NextDecisionUrgency,
} from "./next-decision.engine";

export type HealthIntelligenceSummaryStatus =
  | "ready"
  | "limited";

export type HealthIntelligenceSummaryData = {
  status:
    HealthIntelligenceSummaryStatus;

  healthPicture: {
    headline: string;
    narrative: string;

    tone:
      HealthStoryTone;
  };

  momentum: {
    status:
      HealthMomentumStatus;

    averageDelta:
      number | null;

    comparableSourceCount:
      number;
  };

  confidence: {
    level:
      ClinicalConfidenceData["level"];

    score: number;

    primaryLimitation:
      ClinicalConfidenceData["limitations"][number] | null;
  };

  evidence: {
    strength:
      EvidenceIntelligenceData["strength"];

    strengthScore: number;

    overallState:
      EvidenceIntelligenceData["summary"]["overallState"];

    primaryStrength:
      EvidenceReasonCode | null;

    primaryGap:
      EvidenceGapCode | null;

    primaryRecommendation:
      EvidenceRecommendationCode | null;

    contradictionCount:
      number;
  };

  decision: {
    type:
      NextDecisionType;

    urgency:
      NextDecisionUrgency;

    href:
      NextDecisionData["primary"]["href"];

    reasonCodes:
      NextDecisionData["primary"]["reasonCodes"];
  };

  expectedImpact: {
    primaryImpact:
      DecisionImpactCode | null;

    highMagnitudeImpactCount:
      number;

    totalImpactCount:
      number;
  };

  generatedAt: string;
};

export type BuildHealthIntelligenceSummaryInput = {
  story:
    HealthStoryData;

  momentum:
    HealthMomentumData;

  clinicalConfidence:
    ClinicalConfidenceData;

  evidence:
    EvidenceIntelligenceData;

  nextDecision:
    NextDecisionData;

  decisionImpact:
    DecisionImpactData;
};

function getSummaryStatus(
  input:
    BuildHealthIntelligenceSummaryInput
): HealthIntelligenceSummaryStatus {
  const {
    story,
    evidence,
    clinicalConfidence,
  } = input;

  if (
    story.tone ===
      "insufficient-data" ||
    evidence.strength ===
      "insufficient" ||
    clinicalConfidence.level ===
      "low"
  ) {
    return "limited";
  }

  return "ready";
}

export function buildHealthIntelligenceSummary(
  input:
    BuildHealthIntelligenceSummaryInput
): HealthIntelligenceSummaryData {
  const {
    story,
    momentum,
    clinicalConfidence,
    evidence,
    nextDecision,
    decisionImpact,
  } = input;

  return {
    status:
      getSummaryStatus(input),

    healthPicture: {
      headline:
        story.headline,

      narrative:
        story.narrative,

      tone:
        story.tone,
    },

    momentum: {
      status:
        momentum.status,

      averageDelta:
        momentum.averageDelta,

      comparableSourceCount:
        momentum.comparableSourceCount,
    },

    confidence: {
      level:
        clinicalConfidence.level,

      score:
        clinicalConfidence.score,

      primaryLimitation:
        clinicalConfidence
          .limitations[0] ??
        null,
    },

    evidence: {
      strength:
        evidence.strength,

      strengthScore:
        evidence.strengthScore,

      overallState:
        evidence.summary
          .overallState,

      primaryStrength:
        evidence.summary
          .primaryStrength,

      primaryGap:
        evidence.summary
          .primaryGap,

      primaryRecommendation:
        evidence.summary
          .primaryRecommendation,

      contradictionCount:
        evidence.summary
          .contradictionCount,
    },

    decision: {
      type:
        nextDecision.primary.type,

      urgency:
        nextDecision.primary.urgency,

      href:
        nextDecision.primary.href,

      reasonCodes:
        nextDecision.primary
          .reasonCodes,
    },

    expectedImpact: {
      primaryImpact:
        decisionImpact.primary
          .summary.primaryImpact,

      highMagnitudeImpactCount:
        decisionImpact.primary
          .summary
          .highMagnitudeImpactCount,

      totalImpactCount:
        decisionImpact.primary
          .summary.totalImpactCount,
    },

    generatedAt:
      nextDecision.generatedAt,
  };
}