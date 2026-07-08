import { getRecentAssessments } from "@/lib/repositories/assessment.repository";
import { getLatestCheckIn } from "@/lib/repositories/checkin.repository";
import { getRecentUploadedReports } from "@/lib/repositories/reports.repository";
import {
  getRecentGeneratedIntelligenceResults,
  getRecentHealthInsights,
} from "@/lib/repositories/insight.repository";
import { getRecentHealthHistory } from "@/lib/repositories/history.repository";

export async function getDoctorPortalSummary(userId: string) {
  const [
    assessments,
    latestCheckIn,
    uploadedReports,
    healthInsights,
    generatedResults,
    healthHistory,
  ] = await Promise.all([
    getRecentAssessments(userId, 20),
    getLatestCheckIn(userId),
    getRecentUploadedReports(userId, 20),
    getRecentHealthInsights(userId, 20),
    getRecentGeneratedIntelligenceResults(userId, 20),
    getRecentHealthHistory(userId, 10),
  ]);

  const savedAnalysis = generatedResults.map((item) => ({
    insight_id: item.id,
    updated_at: item.created_at,
  }));

  return {
    assessments,
    latestCheckIn,
    uploadedReports,
    healthInsights,
    savedAnalysis,
    healthHistory,
  };
}