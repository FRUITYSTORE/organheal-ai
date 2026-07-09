import { getUserProfileSummary } from "@/lib/repositories/profile.repository";
import { countUploadedReports } from "@/lib/repositories/reports.repository";
import { getRecentGeneratedIntelligenceResults } from "@/lib/repositories/insight.repository";
import { getPatientSummary } from "@/lib/services/shared/patient-summary.service";
import { calculatePatientPriority } from "@/lib/health-intelligence/patient-priority-engine";

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
  const patientPriority = calculatePatientPriority(patientSummary.assessments);

  return {
    profile,
    assessments: patientSummary.assessments,
    latestCheckIn: patientSummary.latestCheckIn,
    patientPriority,
    reportStats: {
      uploadedReports,
      savedIntelligence: generatedInsights.length,
      latestIntelligenceDate,
    },
  };
}