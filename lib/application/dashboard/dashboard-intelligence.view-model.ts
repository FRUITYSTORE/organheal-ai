import type {
  HealthIntelligenceSummaryData,
} from "@/lib/health-intelligence/engines/health-intelligence-summary.engine";

export type DashboardHeroCard = {
  headline: string;
  narrative: string;

  tone:
    HealthIntelligenceSummaryData["healthPicture"]["tone"];
};

export type DashboardEvidenceCard = {
  overallState:
    HealthIntelligenceSummaryData["evidence"]["overallState"];

  strength:
    HealthIntelligenceSummaryData["evidence"]["strength"];

  score:
    HealthIntelligenceSummaryData["evidence"]["strengthScore"];
};

export type DashboardDecisionCard = {
  type:
    HealthIntelligenceSummaryData["decision"]["type"];

  urgency:
    HealthIntelligenceSummaryData["decision"]["urgency"];

  href:
    HealthIntelligenceSummaryData["decision"]["href"];
};

export type DashboardImpactCard = {
  primaryImpact:
    HealthIntelligenceSummaryData["expectedImpact"]["primaryImpact"];

  highImpactCount:
    HealthIntelligenceSummaryData["expectedImpact"]["highMagnitudeImpactCount"];
};

export type DashboardIntelligenceViewModel = {
  hero: DashboardHeroCard;

  evidence:
    DashboardEvidenceCard;

  decision:
    DashboardDecisionCard;

  impact:
    DashboardImpactCard;

  generatedAt: string;
};

export function buildDashboardIntelligenceViewModel(
  summary: HealthIntelligenceSummaryData
): DashboardIntelligenceViewModel {
  return {
    hero: {
      headline:
        summary.healthPicture.headline,

      narrative:
        summary.healthPicture.narrative,

      tone:
        summary.healthPicture.tone,
    },

    evidence: {
      overallState:
        summary.evidence.overallState,

      strength:
        summary.evidence.strength,

      score:
        summary.evidence.strengthScore,
    },

    decision: {
      type:
        summary.decision.type,

      urgency:
        summary.decision.urgency,

      href:
        summary.decision.href,
    },

    impact: {
      primaryImpact:
        summary.expectedImpact.primaryImpact,

      highImpactCount:
        summary.expectedImpact.highMagnitudeImpactCount,
    },

    generatedAt:
      summary.generatedAt,
  };
}