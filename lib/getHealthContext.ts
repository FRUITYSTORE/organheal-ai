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
  getHealthInsightsByReportId,
} from "@/lib/repositories/insight.repository";

import {
  getReportsLibrary,
} from "@/lib/services/reports/reports.service";

import {
  getPatientSummary,
} from "@/lib/services/shared/patient-summary.service";

import {
  supabase,
} from "@/lib/supabase";

async function getLatestReportContext(
  userId: string
): Promise<AssistantLatestReportContext | null> {
  try {
    const reports =
      await getReportsLibrary(
        userId,
        1
      );

    const latestReport =
      reports[0] ?? null;

    if (!latestReport) {
      return null;
    }

    const insights =
      await getHealthInsightsByReportId(
        userId,
        latestReport.reportId
      );

    const latestInsight =
      insights[0] ?? null;

    return {
      reportId:
        latestReport.reportId,

      fileName:
        latestReport.fileName,

      reportType:
        latestReport.reportType,

      uploadedAt:
        latestReport.uploadedAt,

      summary:
        latestInsight?.summary ||
        latestReport.summary ||
        null,

      keyFindings:
        latestInsight?.key_findings ||
        null,

      recommendations:
        latestInsight?.recommendations ||
        null,

      doctorBrief:
        latestInsight?.doctor_brief ||
        null,

      nextBestAction:
        latestInsight?.next_best_action ||
        latestReport.nextBestAction ||
        null,

      riskLevel:
        latestInsight?.risk_level ||
        latestReport.riskLevel ||
        null,
    };
  } catch (error) {
    console.error(
      "Could not load latest report context:",
      error
    );

    return null;
  }
}

export async function getHealthContext(
  isArabic = false
): Promise<AssistantResponseHealthContext | null> {
  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();

  if (
    userError ||
    !userData.user
  ) {
    return null;
  }

  const userId =
    userData.user.id;

  const patientSummary =
    await getPatientSummary(
      userId
    );

  const latestReportContext =
    await getLatestReportContext(
      userId
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

      language:
        isArabic
          ? "ar"
          : "en",
    });

  const unifiedSummary =
    runtime.modules.summary.data;

  const doctorPresentation =
    unifiedSummary
      ? presentDoctorIntelligence(
          unifiedSummary,
          isArabic
            ? "ar"
            : "en"
        )
      : null;

  const doctorBrief =
    doctorPresentation?.brief ??
    intelligence.doctorBrief.data.brief ??
    null;

  return buildAssistantHealthContext({
    patientSummary,
    intelligence,
    runtime,
    doctorBrief,
    latestReportContext,
  });
}