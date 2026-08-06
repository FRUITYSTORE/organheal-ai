import type {
  AssistantLatestReportContext,
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

import type {
  buildHealthIntelligence,
} from "@/lib/health-intelligence/health-intelligence.service";

import type {
  buildHealthRuntime,
} from "@/lib/health-intelligence/runtime/health-intelligence-runtime.builder";

import type {
  getPatientSummary,
} from "@/lib/services/shared/patient-summary.service";

import {
  buildPatientJourneySnapshot,
} from "@/lib/application/journey/patient-journey-snapshot.service";

import {
  buildPatientJourneyEvents,
} from "@/lib/application/journey/patient-journey-events.service";

import {
  buildPatientClinicalContext,
} from "@/lib/application/clinical/patient-clinical-context.service";

import {
  buildUnifiedIntelligenceExperience,
} from "@/lib/application/unified-intelligence/unified-intelligence-experience.service";

type HealthIntelligenceResult =
  ReturnType<typeof buildHealthIntelligence>;

type HealthRuntimeResult =
  Awaited<ReturnType<typeof buildHealthRuntime>>;

type PatientSummary =
  Awaited<ReturnType<typeof getPatientSummary>>;

export type BuildAssistantHealthContextInput = {
  patientSummary:
    PatientSummary;

  intelligence:
    HealthIntelligenceResult;

  runtime:
    HealthRuntimeResult;

  doctorBrief:
    | string
    | null;

  latestReportContext:
    | AssistantLatestReportContext
    | null;
};

export function buildAssistantHealthContext({
  patientSummary,
  intelligence,
  runtime,
  doctorBrief,
  latestReportContext,
}: BuildAssistantHealthContextInput): AssistantResponseHealthContext {

  const overview =
    intelligence.intelligenceOverview.data;

  const healthScore =
    intelligence.healthScore.data;

  const latestCheckIn =
    patientSummary.latestCheckIn ??
    null;

  const patientJourney =
    buildPatientJourneySnapshot({
      patientSummary,
      healthIntelligence:
        intelligence,
    });

  const patientJourneyEvents =
    buildPatientJourneyEvents({
      patientSummary,
    });

  const clinicalContext =
    buildPatientClinicalContext({
      patientSummary,
    });

      const story =
    runtime.modules.story.data;

  const unifiedExperience =
    story
      ? buildUnifiedIntelligenceExperience({
          intelligence,
          story,
          patientJourney,
          clinicalContext,
        })
      : null;

  const primaryAction =
    intelligence.recommendations.data.primaryAction;

  return {
    overallScore:
      healthScore.score,

    strongestOrgan:
      overview.strongestOrgan,

    priorityOrgan:
      intelligence.priority.data.priorityOrgan,

    labScore:
      null,

    dailyCheckInScore:
      latestCheckIn?.wellness_score ??
      null,

    dailyMood:
      latestCheckIn?.mood ??
      null,

    riskPattern:
      intelligence.doctorBrief.data.riskPattern,

    healthAge:
      null,

    healthAgeStatus:
      overview.healthAgeStatus,

    doctorBrief,

    healthScore: {
      score:
        healthScore.score,

      level:
        healthScore.level,

      confidence:
        intelligence.healthScore.confidence,

      dataCompleteness:
        healthScore.dataCompleteness,
    },

    recommendation:
      primaryAction.description ||
      primaryAction.title ||
      null,

    healthEngine:
      intelligence,

        latestReportContext,

    patientJourney,

    patientJourneyEvents,

    clinicalContext,

    unifiedExperience,

    wholeBodyKnowledge:
      intelligence
        .wholeBodyKnowledge,
  };
}