import { getUserProfileSummary } from "@/lib/repositories/profile.repository";
import { countUploadedReports } from "@/lib/repositories/reports.repository";
import { getRecentGeneratedIntelligenceResults } from "@/lib/repositories/insight.repository";
import { getPatientSummary } from "@/lib/services/shared/patient-summary.service";
import { buildHealthIntelligence } from "@/lib/health-intelligence/health-intelligence.service";

export async function getDashboardSummary(userId: string) {
  const [profile, uploadedReports, generatedResults, patientSummary] =
    await Promise.all([
      getUserProfileSummary(userId),
      countUploadedReports(userId),
      getRecentGeneratedIntelligenceResults(userId, 20),
      getPatientSummary(userId),
    ]);

  const generatedInsights =
    generatedResults.length > 0
      ? generatedResults
      : patientSummary.healthInsights.filter(
          (item) =>
            item.ai_status === "Generated" || item.ai_status === "generated"
        );

  const latestIntelligenceDate = generatedInsights[0]?.created_at || null;
 const healthIntelligence = buildHealthIntelligence({
  ...patientSummary,
  profile,
});

    return {
    profile,

    patientSummary,

    assessments:
      patientSummary.assessments,

    latestCheckIn:
      patientSummary.latestCheckIn,

    healthIntelligence,

    reportStats: {
      uploadedReports,

      savedIntelligence:
        generatedInsights.length,

      latestIntelligenceDate,
    },
  };
}