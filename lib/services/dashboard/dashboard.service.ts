import {
  getUserProfileSummary,
} from "@/lib/repositories/profile.repository";

import {
  countUploadedReports,
} from "@/lib/repositories/reports.repository";

import {
  getRecentGeneratedIntelligenceResults,
} from "@/lib/repositories/insight.repository";

import {
  getPatientSummary,
} from "@/lib/services/shared/patient-summary.service";

import {
  buildHealthIntelligence,
} from "@/lib/health-intelligence/health-intelligence.service";

import {
  buildHealthRuntime,
} from "@/lib/health-intelligence/runtime/health-intelligence-runtime.builder";

import {
  buildPatientJourneySnapshot,
} from "@/lib/application/journey/patient-journey-snapshot.service";

import {
  buildPatientJourneyEvents,
} from "@/lib/application/journey/patient-journey-events.service";

import {
  buildUnifiedIntelligenceExperienceContext,
} from "@/lib/application/unified-intelligence/unified-intelligence-experience.builder";

export type DashboardSummaryLanguage =
  | "en"
  | "ar";

export async function getDashboardSummary(
  userId: string,
  language:
    DashboardSummaryLanguage = "en"
) {
  const [
    profile,
    uploadedReports,
    generatedResults,
    patientSummary,
  ] =
    await Promise.all([
      getUserProfileSummary(
        userId
      ),

      countUploadedReports(
        userId
      ),

      getRecentGeneratedIntelligenceResults(
        userId,
        20
      ),

      getPatientSummary(
        userId
      ),
    ]);

  const generatedInsights =
    generatedResults.length > 0
      ? generatedResults
      : patientSummary.healthInsights.filter(
          (item) =>
            item.ai_status ===
              "Generated" ||
            item.ai_status ===
              "generated"
        );

  const latestIntelligenceDate =
    generatedInsights[0]
      ?.created_at ??
    null;

  const healthIntelligence =
    buildHealthIntelligence({
      ...patientSummary,
      profile,
    });

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

      healthIntelligence,
    });

  const patientJourneyEvents =
    buildPatientJourneyEvents({
      patientSummary,
    });

  const unifiedExperienceResult =
    buildUnifiedIntelligenceExperienceContext({
      patientSummary,

      intelligence:
        healthIntelligence,

      runtime,
    });

  return {
    profile,

    patientSummary,

    patientJourneyEvents,

    patientJourney,

    assessments:
      patientSummary.assessments,

    latestCheckIn:
      patientSummary.latestCheckIn,

    healthIntelligence,

    unifiedExperience:
      unifiedExperienceResult.status ===
      "ready"
        ? unifiedExperienceResult.experience
        : null,

    unifiedExperienceStatus:
      unifiedExperienceResult.status,

    unifiedExperienceUnavailableReason:
      unifiedExperienceResult
        .unavailableReason,

    reportStats: {
      uploadedReports,

      savedIntelligence:
        generatedInsights.length,

      latestIntelligenceDate,
    },
  };
}