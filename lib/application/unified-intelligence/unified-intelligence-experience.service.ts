import type {
  PatientClinicalContext,
} from "@/lib/application/clinical/patient-clinical-context.service";

import type {
  PatientJourneySnapshot,
} from "@/lib/application/journey/patient-journey-snapshot.service";

import type {
  HealthStoryData,
} from "@/lib/health-intelligence/engines/health-story.engine";

import type {
  HealthIntelligenceResult,
} from "@/lib/health-intelligence/models/health-intelligence-result";

import type {
  UnifiedIntelligenceExperienceModel,
} from "@/lib/application/unified-intelligence/unified-intelligence-experience.model";

export type BuildUnifiedIntelligenceExperienceInput = {
  intelligence:
    HealthIntelligenceResult;

  story:
    HealthStoryData;

  patientJourney:
    PatientJourneySnapshot;

  clinicalContext:
    PatientClinicalContext;
};

export function buildUnifiedIntelligenceExperience({
  intelligence,
  story,
  patientJourney,
  clinicalContext,
}: BuildUnifiedIntelligenceExperienceInput): UnifiedIntelligenceExperienceModel {
  const recommendations =
    intelligence.recommendations;

  const primaryAction =
    recommendations.data.primaryAction;

  const healthScore =
    intelligence.healthScore;

  const clinicalDirection =
    clinicalContext.direction;

  return {
    generatedAt:
      recommendations.generatedAt,

    status:
      recommendations.status,

    story: {
      headline:
        story.headline,

      narrative:
        story.narrative,

      tone:
        story.tone,

      confidence:
        story.confidence,

      confidenceScore:
        story.confidenceScore,

      priorityMessage:
        story.priorityMessage,

      strongestMessage:
        story.strongestMessage,

      progressMessage:
        story.progressMessage,

      evidenceMessage:
        story.evidenceMessage,

      nextDecision:
        story.nextDecision,

      supportingSignals:
        [...story.supportingSignals],
    },

    decision: {
      layer:
        recommendations.data.decisionLayer,

      reason:
        recommendations.data.decisionReason,
    },

    primaryAction: {
      id:
        primaryAction.id,

      title:
        primaryAction.title,

      description:
        primaryAction.description,

      href:
        primaryAction.href,

      category:
        primaryAction.category,

      priority:
        primaryAction.priority,

      score:
        primaryAction.score,

      reasons:
        [...primaryAction.reasons],
    },

    healthScore: {
      score:
        healthScore.data.score,

      level:
        healthScore.data.level,

      confidence:
        healthScore.confidence,

      dataCompleteness:
        healthScore.data.dataCompleteness,

      summary:
        healthScore.data.summary,
    },

    journey: {
      followUpStatus:
        patientJourney.followUpStatus,

      lastMeaningfulUpdate:
        patientJourney.lastMeaningfulUpdate,
    },

    clinical: {
      direction:
        clinicalDirection.direction,

      confidence:
        clinicalDirection.confidence,

      canConfirmClinicalDirection:
        clinicalDirection.canConfirmClinicalDirection,

      supportingSignals:
        [...clinicalDirection.supportingSignals],

      contradictingSignals:
        [...clinicalDirection.contradictingSignals],

      limitations:
        [...clinicalDirection.limitations],
    },

    review: {
      nextReviewDays:
        recommendations.data.nextReviewDays,
    },
  };
}