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

  const brief = [
    summary.healthPicture.narrative,

    presentationText(
      language,
      `Evidence strength: ${summary.evidence.strengthScore}/100.`,
      `قوة الأدلة: ${summary.evidence.strengthScore}/100.`
    ),

    presentationText(
      language,
      `Current momentum: ${summary.momentum.status}.`,
      `الاتجاه الصحي الحالي: ${summary.momentum.status}.`
    ),

    presentationText(
      language,
      `Recommended next step: ${decision.title}. ${decision.description}`,
      `الخطوة التالية الموصى بها: ${decision.title}. ${decision.description}`
    ),
  ].join("\n\n");

  return {
    brief,

    decision,

    generatedAt:
      summary.generatedAt,
  };
}