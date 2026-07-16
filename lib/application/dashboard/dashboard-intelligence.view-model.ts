import type {
  HealthIntelligenceSummaryData,
} from "@/lib/health-intelligence/engines/health-intelligence-summary.engine";

import {
  healthIntelligencePresenter,
} from "@/lib/health-intelligence/presentation/health-intelligence.presenter";

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
  title: string;
  description: string;
  actionLabel: string;

  urgencyLabel: string;

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
    const presentedDecision =
    healthIntelligencePresenter
      .presentNextDecision(
        summary.decision.type,
        summary.decision.urgency,
        "en"
      );
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
  title:
    presentedDecision.title,

  description:
    presentedDecision.description,

  actionLabel:
    presentedDecision.actionLabel,

  urgencyLabel:
    presentedDecision.urgencyLabel,

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