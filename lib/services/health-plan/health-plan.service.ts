import {
  buildHealthIntelligence,
} from "@/lib/health-intelligence/health-intelligence.service";

import {
  buildHealthRuntime,
} from "@/lib/health-intelligence/runtime/health-intelligence-runtime.builder";

import {
  buildHealthPlanViewModel,
  type HealthPlanPresenterLanguage,
} from "@/lib/services/health-plan/health-plan-view.service";

import {
  getPatientSummary,
} from "@/lib/services/shared/patient-summary.service";

import {
  buildPatientJourneySnapshot,
} from "@/lib/application/journey/patient-journey-snapshot.service";

import {
  buildUnifiedIntelligenceExperienceContext,
} from "@/lib/application/unified-intelligence/unified-intelligence-experience.builder";

export type HealthPlanSummaryLanguage =
  HealthPlanPresenterLanguage;

export async function getHealthPlanSummary(
  userId: string,
  language:
    HealthPlanSummaryLanguage = "en"
) {
  const patientSummary =
    await getPatientSummary(
      userId
    );

  const priorityAssessment =
    patientSummary.assessments.length > 0
      ? [...patientSummary.assessments]
          .sort(
            (a, b) =>
              a.score -
              b.score
          )[0]
      : null;

  const intelligence =
    buildHealthIntelligence(
      patientSummary
    );

  const runtime =
    await buildHealthRuntime({
      userId,

      patient:
        patientSummary,

      language,
    });

  const patientJourney =
    buildPatientJourneySnapshot({
      patientSummary,

      healthIntelligence:
        intelligence,
    });

  const unifiedExperienceResult =
    buildUnifiedIntelligenceExperienceContext({
      patientSummary,

      intelligence,

      runtime,
    });

  const unifiedExperience =
    unifiedExperienceResult.status ===
    "ready"
      ? unifiedExperienceResult.experience
      : null;

  const healthPlanView =
    unifiedExperience
      ? buildHealthPlanViewModel({
          unifiedExperience,

          recommendations:
            intelligence.recommendations,

          healthScore:
            intelligence.healthScore,

          language,
        })
      : null;

  return {
    priorityAssessment,

    latestCheckIn:
      patientSummary.latestCheckIn,

    patientJourney,

    uploadedReports:
      patientSummary.uploadedReports.slice(
        0,
        10
      ),

    healthInsights:
      patientSummary.healthInsights.slice(
        0,
        10
      ),

    generatedResults:
      patientSummary.generatedResults.slice(
        0,
        10
      ),

    historyItems:
      patientSummary.historyItems
        .slice(
          0,
          10
        )
        .map((item) => ({
          ...item,

          id:
            Number(
              item.id
            ),
        })),

    healthPlanView,

    unifiedExperience,

    unifiedExperienceStatus:
      unifiedExperienceResult.status,

    unifiedExperienceUnavailableReason:
      unifiedExperienceResult
        .unavailableReason,
  };
}