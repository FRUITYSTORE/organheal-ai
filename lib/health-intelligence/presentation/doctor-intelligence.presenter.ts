import type {
  HealthIntelligenceSummaryData,
} from "../engines/health-intelligence-summary.engine";

import {
  presentNextDecision,
} from "./next-decision.presenter";

import {
  presentationText,
  type HealthIntelligencePresentationLanguage,
} from "./presentation.types";

export type DoctorIntelligencePresentation = {
  clinicalSummary: string;
  evidenceSummary: string;
  momentumSummary: string;
  decisionSummary: string;

  brief: string;

  decision: {
    title: string;
    description: string;
    actionLabel: string;
    urgencyLabel: string;
  };

  generatedAt: string;
};

export function presentDoctorIntelligence(
  summary:
    HealthIntelligenceSummaryData,
  language:
    HealthIntelligencePresentationLanguage
): DoctorIntelligencePresentation {
  const decision =
    presentNextDecision(
      summary.decision.type,
      summary.decision.urgency,
      language
    );

  const clinicalSummary =
    summary.healthPicture.narrative;

  const evidenceSummary =
    presentationText(
      language,
      `Evidence strength: ${summary.evidence.strengthScore}/100.`,
      `قوة الأدلة: ${summary.evidence.strengthScore}/100.`
    );

  const momentumSummary =
    presentationText(
      language,
      `Current momentum: ${summary.momentum.status}.`,
      `الاتجاه الصحي الحالي: ${summary.momentum.status}.`
    );

  const decisionSummary =
    presentationText(
      language,
      `Recommended next step: ${decision.title}. ${decision.description}`,
      `الخطوة التالية الموصى بها: ${decision.title}. ${decision.description}`
    );

  const brief = [
    clinicalSummary,
    evidenceSummary,
    momentumSummary,
    decisionSummary,
  ].join("\n\n");

  return {
    clinicalSummary,
    evidenceSummary,
    momentumSummary,
    decisionSummary,

    brief,

    decision,

    generatedAt:
      summary.generatedAt,
  };
}