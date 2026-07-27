import { buildHealthIntelligence } from "@/lib/health-intelligence/health-intelligence.service";
import { buildHealthRuntime } from "@/lib/health-intelligence/runtime/health-intelligence-runtime.builder";
import { presentDoctorIntelligence } from "@/lib/health-intelligence/presentation/doctor-intelligence.presenter";
import { getPatientSummary } from "@/lib/services/shared/patient-summary.service";
import { getReportsLibrary } from "@/lib/services/reports/reports.service";
import { getHealthInsightsByReportId } from "@/lib/repositories/insight.repository";
import { supabase } from "@/lib/supabase";

export async function getHealthContext(_isArabic = false) {
  const { data: userData, error: userError } =
    await supabase.auth.getUser();

  if (userError || !userData.user) {
    return null;
  }

  const patientSummary = await getPatientSummary(
  userData.user.id
);

let latestReportContext:
  | {
      reportId: number;
      fileName: string;
      reportType: string;
      uploadedAt: string | null;
      summary: string | null;
      keyFindings: string | null;
      recommendations: string | null;
      doctorBrief: string | null;
      nextBestAction: string | null;
      riskLevel: string | null;
    }
  | null = null;

try {
  const reports = await getReportsLibrary(
    userData.user.id,
    1
  );

  const latestReport = reports[0] ?? null;

  if (latestReport) {
    const insights = await getHealthInsightsByReportId(
      userData.user.id,
      latestReport.reportId
    );

    const latestInsight = insights[0] ?? null;

    latestReportContext = {
      reportId: latestReport.reportId,
      fileName: latestReport.fileName,
      reportType: latestReport.reportType,
      uploadedAt: latestReport.uploadedAt,
      summary:
        latestInsight?.summary ||
        latestReport.summary ||
        null,
      keyFindings:
        latestInsight?.key_findings || null,
      recommendations:
        latestInsight?.recommendations || null,
      doctorBrief:
        latestInsight?.doctor_brief || null,
      nextBestAction:
        latestInsight?.next_best_action ||
        latestReport.nextBestAction ||
        null,
      riskLevel:
        latestInsight?.risk_level ||
        latestReport.riskLevel ||
        null,
    };
  }
} catch (error) {
  console.error(
    "Could not load latest report context:",
    error
  );

  latestReportContext = null;
}

  const intelligence =
    buildHealthIntelligence(patientSummary);

  const runtime = await buildHealthRuntime({
    userId: userData.user.id,
    patient: patientSummary,
    language: _isArabic ? "ar" : "en",
  });

  const unifiedSummary =
    runtime.modules.summary.data;

  const doctorPresentation =
    unifiedSummary
      ? presentDoctorIntelligence(
          unifiedSummary,
          _isArabic ? "ar" : "en"
        )
      : null;

  const overview =
    intelligence.intelligenceOverview.data;

  return {
    overallScore: intelligence.healthScore.data.score,
    strongestOrgan: overview.strongestOrgan,
    priorityOrgan:
      intelligence.priority.data.priorityOrgan,
    labScore: null,
    dailyCheckInScore:
      patientSummary.latestCheckIn?.wellness_score ?? null,

    riskPattern:
      intelligence.doctorBrief.data.riskPattern,

    healthAge: null,
    healthAgeStatus: overview.healthAgeStatus,

    doctorBrief:
      doctorPresentation?.brief ??
      intelligence.doctorBrief.data.brief,

    healthScore: {
      score: intelligence.healthScore.data.score,
      level: intelligence.healthScore.data.level,
      confidence: intelligence.healthScore.confidence,
      dataCompleteness:
        intelligence.healthScore.data.dataCompleteness,
    },

    recommendation:
      intelligence.recommendations.data.primaryAction,

    healthEngine: intelligence,

latestReportContext,
  };
}