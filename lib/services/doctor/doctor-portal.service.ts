import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  supabase,
} from "@/lib/supabase";

import {
  buildUnifiedHealthRuntime,
} from "@/lib/health-intelligence/runtime/unified-health-runtime";

import {
  getPatientSummary,
} from "@/lib/services/shared/patient-summary.service";

type DoctorPortalLanguage =
  | "en"
  | "ar";

export async function getDoctorPortalSummary(
  userId:
    string,
  language:
    DoctorPortalLanguage = "en",
  client:
    SupabaseClient = supabase
) {
  const patientSummary =
    await getPatientSummary(
      userId,
      client
    );

  const savedAnalysis =
    patientSummary.generatedResults.map(
      (item) => ({
        insight_id:
          item.insight_id,

        updated_at:
          item.updated_at,
      })
    );

  const unifiedRuntime =
    await buildUnifiedHealthRuntime({
      userId,

      patient:
        patientSummary,

      language,

      audience:
        "healthcare-professionals",

      hasDoctorBrief:
        patientSummary.healthInsights.some(
          (insight) =>
            typeof insight.doctor_brief ===
              "string" &&
            insight.doctor_brief
              .trim()
              .length > 0
        ),
    });

  const healthIntelligence =
    unifiedRuntime
      .clinicalDecision
      .intelligence;

  return {
    assessments:
      patientSummary.assessments,

    latestCheckIn:
      patientSummary.latestCheckIn,

    uploadedReports:
      patientSummary.uploadedReports.slice(
        0,
        20
      ),

    healthInsights:
      patientSummary.healthInsights.slice(
        0,
        20
      ),

    savedAnalysis,

    healthHistory:
      patientSummary.historyItems.slice(
        0,
        10
      ),

    healthIntelligence,

    doctorIntelligence: {
      summary:
        unifiedRuntime.summary,

      story:
        unifiedRuntime
          .intelligenceRuntime
          .modules
          .story,

      momentum:
        unifiedRuntime
          .intelligenceRuntime
          .modules
          .momentum,

      clinicalConfidence:
        unifiedRuntime
          .intelligenceRuntime
          .modules
          .clinicalConfidence,

      evidence:
        unifiedRuntime
          .intelligenceRuntime
          .modules
          .evidence,

      nextDecision:
        unifiedRuntime
          .intelligenceRuntime
          .modules
          .nextDecision,

      decisionImpact:
        unifiedRuntime
          .intelligenceRuntime
          .modules
          .decisionImpact,
    },

    pipeline: {
      readyModuleCount:
        unifiedRuntime
          .metadata
          .readyModuleCount,

      unavailableModuleCount:
        unifiedRuntime
          .metadata
          .unavailableModuleCount,

      errorModuleCount:
        unifiedRuntime
          .metadata
          .errorModuleCount,

      generatedAt:
        unifiedRuntime
          .metadata
          .generatedAt,
    },
  };
}