import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  buildAssistantHealthContext,
} from "@/lib/health-intelligence/application/assistant-health-context.builder";

import type {
  AssistantLatestReportContext,
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

import {
  buildHealthIntelligence,
} from "@/lib/health-intelligence/health-intelligence.service";

import {
  presentDoctorIntelligence,
} from "@/lib/health-intelligence/presentation/doctor-intelligence.presenter";

import {
  buildHealthRuntime,
} from "@/lib/health-intelligence/runtime/health-intelligence-runtime.builder";

import {
  getPatientSummary,
} from "@/lib/services/shared/patient-summary.service";

import {
  getMedicalReportMarkersByReportId,
} from "@/lib/repositories/report-markers.repository";

type AssistantContextLanguage =
  | "en"
  | "ar";

export type BuildAuthenticatedAssistantContextInput = {
  userId:
    string;

  language:
    AssistantContextLanguage;

  client:
    SupabaseClient;
};

export async function buildAuthenticatedAssistantContext({
  userId,
  language,
  client,
}: BuildAuthenticatedAssistantContextInput): Promise<
  AssistantResponseHealthContext
> {
  const patientSummary =
    await getPatientSummary(
      userId,
      client
    );

  const intelligence =
    buildHealthIntelligence(
      patientSummary
    );

  const runtime =
    await buildHealthRuntime({
      userId,

      patient:
        patientSummary,

      intelligence,

      language,
    });

  const latestReport =
    patientSummary.uploadedReports[0] ??
    null;

  const latestInsight =
    latestReport
      ? patientSummary.healthInsights.find(
          (insight) =>
            Number(
              insight.report_id
            ) ===
            Number(
              latestReport.id
            )
        ) ?? null
      : null;

        const latestReportMarkers =
    latestReport
      ? await getMedicalReportMarkersByReportId(
          userId,
          latestReport.id,
          client
        )
      : [];

  const latestReportContext:
    AssistantLatestReportContext | null =
      latestReport
        ? {
            reportId:
              latestReport.id,

            fileName:
              latestReport.file_name ||
              "Medical report",

            reportType:
              latestReport.report_type ||
              "Medical report",

            uploadedAt:
              latestReport.created_at ??
              null,

            summary:
              latestInsight?.summary ??
              null,

            keyFindings:
              latestInsight?.key_findings ??
              null,

            recommendations:
              latestInsight?.recommendations ??
              null,

            doctorBrief:
              latestInsight?.doctor_brief ??
              null,

            nextBestAction:
              latestInsight?.next_best_action ??
              null,

            riskLevel:
              latestInsight?.risk_level ??
              null,

                          reportEvidence:
              latestReportMarkers
                .map(
                  (marker) => ({
                    marker:
                      marker.marker_name,

                    value:
                      marker.marker_value,

                    unit:
                      marker.marker_unit,
                  })
                ),
          }
        : null;

  const unifiedSummary =
    runtime.modules.summary.data;

  const doctorPresentation =
    unifiedSummary
      ? presentDoctorIntelligence(
          unifiedSummary,
          language
        )
      : null;

  const doctorBrief =
    doctorPresentation?.brief ??
    intelligence.doctorBrief.data.brief ??
    latestReportContext?.doctorBrief ??
    null;

  return buildAssistantHealthContext({
    patientSummary,

    intelligence,

    runtime,

    doctorBrief,

    latestReportContext,
  });
}