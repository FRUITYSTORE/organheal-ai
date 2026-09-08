import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  buildPatientClinicalLongitudinalComparison,
  type PatientClinicalLongitudinalComparison,
} from "@/lib/application/clinical/patient-clinical-longitudinal-comparison.service";

import {
  getMedicalReportMarkersByReportIds,
} from "@/lib/repositories/report-markers.repository";

import type {
  UploadedReportSummary,
} from "@/lib/repositories/reports.repository";

export type BuildAssistantMultiReportComparisonInput = {
  userId:
    string;

  reports:
    UploadedReportSummary[];

  client:
    SupabaseClient;
};

export async function buildAssistantMultiReportComparison({
  userId,
  reports,
  client,
}: BuildAssistantMultiReportComparisonInput): Promise<
  PatientClinicalLongitudinalComparison
> {
  if (
    reports.length <
    2
  ) {
    return buildPatientClinicalLongitudinalComparison({
      reports,

      reportMarkers:
        [],
    });
  }

  const reportIds =
    reports.map(
      (
        report
      ) =>
        report.id
    );

  const reportMarkers =
    await getMedicalReportMarkersByReportIds(
      userId,
      reportIds,
      client
    );

  return buildPatientClinicalLongitudinalComparison({
    reports,
    reportMarkers,
  });
}