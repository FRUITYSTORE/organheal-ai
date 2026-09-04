import "server-only";

import type { PatientSummary } from "@/lib/models/patient";

import {
  getUploadedReportsByIds,
  type UploadedReportSummary,
} from "@/lib/repositories/reports.repository";

import {
  getGeneratedResultsByReportId,
  getHealthInsightsByReportId,
  type GeneratedResultSummary,
  type HealthInsightSummary,
} from "@/lib/repositories/insight.repository";

import {
  getMedicalReportMarkersByReportId,
} from "@/lib/repositories/report-markers.repository";

import {
  getPatientSummary,
} from "@/lib/services/shared/patient-summary.service";

import type { SupabaseClient } from "@supabase/supabase-js";

function prioritizeReport(
  focusedReport: UploadedReportSummary,
  reports: UploadedReportSummary[]
): UploadedReportSummary[] {
  return [
    focusedReport,
    ...reports.filter(
      (report) => report.id !== focusedReport.id
    ),
  ];
}

function prioritizeInsights(
  focusedInsights: HealthInsightSummary[],
  insights: HealthInsightSummary[]
): HealthInsightSummary[] {
  const focusedInsightIds = new Set(
    focusedInsights.map((insight) => insight.id)
  );

  return [
    ...focusedInsights,
    ...insights.filter(
      (insight) => !focusedInsightIds.has(insight.id)
    ),
  ];
}

function getGeneratedResultKey(
  result: GeneratedResultSummary
): string {
  if (result.insight_id !== null) {
    return `insight:${result.insight_id}`;
  }

  return [
    "report",
    result.report_id ?? "none",
    result.updated_at ?? "none",
  ].join(":");
}

function prioritizeGeneratedResults(
  focusedResults: GeneratedResultSummary[],
  results: GeneratedResultSummary[]
): GeneratedResultSummary[] {
  const focusedResultKeys = new Set(
    focusedResults.map(getGeneratedResultKey)
  );

  return [
    ...focusedResults,
    ...results.filter(
      (result) =>
        !focusedResultKeys.has(
          getGeneratedResultKey(result)
        )
    ),
  ];
}

export async function getFocusedReportPatientSummary(
  userId: string,
  reportId: number,
  client: SupabaseClient
): Promise<PatientSummary | null> {
    const [
    patientSummary,
    focusedReports,
    focusedInsights,
    focusedGeneratedResults,
    focusedReportMarkers,
  ] = await Promise.all([
    getPatientSummary(userId, client),
    getUploadedReportsByIds(
      userId,
      [reportId],
      client
    ),
    getHealthInsightsByReportId(
      userId,
      reportId,
      client
    ),
    getGeneratedResultsByReportId(
      userId,
      reportId,
      client
    ),
    getMedicalReportMarkersByReportId(
      userId,
      reportId,
      client
    ),
  ]);
  const focusedReport =
    focusedReports[0] ?? null;

  if (!focusedReport) {
    return null;
  }

  return {
    ...patientSummary,

    uploadedReports: prioritizeReport(
      focusedReport,
      patientSummary.uploadedReports
    ),

    reportMarkers:
      focusedReportMarkers,

    healthInsights: prioritizeInsights(
      focusedInsights,
      patientSummary.healthInsights
    ),

    generatedResults:
      prioritizeGeneratedResults(
        focusedGeneratedResults,
        patientSummary.generatedResults
      ),
  };
}