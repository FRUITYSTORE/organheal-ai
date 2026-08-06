import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  buildUnifiedHealthRuntime,
} from "@/lib/health-intelligence/runtime/unified-health-runtime";

import {
  getFocusedReportPatientSummary,
} from "@/lib/services/intelligence/report-patient-summary-overlay.service";

type FocusedIntelligenceLanguage =
  | "en"
  | "ar";

export async function getFocusedIntelligenceSummary(
  userId:
    string,
  reportId:
    number,
  language:
    FocusedIntelligenceLanguage,
  client:
    SupabaseClient
) {
  const patientSummary =
    await getFocusedReportPatientSummary(
      userId,
      reportId,
      client
    );

  if (!patientSummary) {
    return null;
  }

  const focusedReport =
    patientSummary.uploadedReports[0] ??
    null;

  if (
    !focusedReport ||
    focusedReport.id !== reportId
  ) {
    return null;
  }

  const unifiedRuntime =
    await buildUnifiedHealthRuntime({
      userId,

      patient:
        patientSummary,

      language,

      audience:
        "general",
    });

  const healthIntelligence =
    unifiedRuntime
      .clinicalDecision
      .intelligence;

  return {
    intelligenceSummary: {
      assessments:
        patientSummary.assessments,

      latestCheckIn:
        patientSummary.latestCheckIn,

      healthIntelligence,
    },

    healthInsights:
      patientSummary.healthInsights.filter(
        (insight) =>
          Number(
            insight.report_id
          ) === reportId
      ),

    uploadedReports:
      patientSummary.uploadedReports.filter(
        (report) =>
          Number(
            report.id
          ) === reportId
      ),

    summary:
      unifiedRuntime.summary,
  };
}