import { getRecentAssessments } from "@/lib/repositories/assessment.repository";
import { getLatestCheckIn } from "@/lib/repositories/checkin.repository";
import { getUserProfileSummary } from "@/lib/repositories/profile.repository";
import { countUploadedReports } from "@/lib/repositories/reports.repository";
import {
  getRecentGeneratedIntelligenceResults,
  getRecentHealthInsights,
} from "@/lib/repositories/insight.repository";

export async function getDashboardSummary(userId: string) {
  const [
    profile,
    assessments,
    latestCheckIn,
    uploadedReports,
    generatedResults,
    healthInsights,
  ] = await Promise.all([
    getUserProfileSummary(userId),
    getRecentAssessments(userId, 20),
    getLatestCheckIn(userId),
    countUploadedReports(userId),
    getRecentGeneratedIntelligenceResults(userId, 20),
    getRecentHealthInsights(userId, 20),
  ]);

  const generatedInsights =
    generatedResults.length > 0
      ? generatedResults
      : healthInsights.filter(
          (item) =>
            item.ai_status === "Generated" || item.ai_status === "generated"
        );

  const latestIntelligenceDate = generatedInsights[0]?.created_at || null;

  return {
    profile,
    assessments,
    latestCheckIn,
    reportStats: {
      uploadedReports,
      savedIntelligence: generatedInsights.length,
      latestIntelligenceDate,
    },
  };
}