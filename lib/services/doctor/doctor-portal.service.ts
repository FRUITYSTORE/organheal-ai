import "server-only";

import {
  buildHealthIntelligence,
} from "@/lib/health-intelligence/health-intelligence.service";

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
  userId: string,
  language:
    DoctorPortalLanguage = "en"
) {

  const patientSummary =
    await getPatientSummary(userId);

  const savedAnalysis =
    patientSummary.generatedResults.map(
      (item) => ({
        insight_id:
          item.insight_id,

        updated_at:
          item.updated_at,
      })
    );

  /*
   * Keep the legacy intelligence result temporarily
   * because the current Doctor Portal components still
   * consume its existing contract.
   */
  const healthIntelligence =
    buildHealthIntelligence(
      patientSummary
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

    /*
     * Legacy contract retained until Doctor Portal
     * components migrate to V2.
     */
    healthIntelligence,

    /*
     * Health Intelligence V2 modules.
     */
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