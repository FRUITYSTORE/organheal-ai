import {
  countUploadedReports,
} from "@/lib/repositories/reports.repository";

import {
  countGeneratedIntelligenceResults,
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
  userId:
    string,
  language:
    DashboardSummaryLanguage = "en"
) {
 const [
  uploadedReportCount,
  savedIntelligenceCount,
  generatedResults,
  patientSummary,
] =
  await Promise.all([
    countUploadedReports(
      userId
    ),

    countGeneratedIntelligenceResults(
      userId
    ),

    getRecentGeneratedIntelligenceResults(
      userId,
      1
    ),

    getPatientSummary(
      userId
    ),
  ]);

  const profile =
    patientSummary.profile;

 const latestIntelligenceDate =
  generatedResults[0]
    ?.created_at ??
  null;

  const healthIntelligence =
    buildHealthIntelligence(
      patientSummary
    );

  const runtime =
    await buildHealthRuntime({
      userId,

      patient:
        patientSummary,

      intelligence:
        healthIntelligence,

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
      uploadedReports:
        uploadedReportCount,

      savedIntelligence:
  savedIntelligenceCount,

      latestIntelligenceDate,
    },
  };
}