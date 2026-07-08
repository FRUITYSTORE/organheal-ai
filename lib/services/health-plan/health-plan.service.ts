import { getRecentAssessments } from "@/lib/repositories/assessment.repository";
import { getLatestCheckIn } from "@/lib/repositories/checkin.repository";
import { getRecentUploadedReports } from "@/lib/repositories/reports.repository";
import {
  getRecentGeneratedIntelligenceResults,
  getRecentHealthInsights,
} from "@/lib/repositories/insight.repository";
import { getRecentHealthHistory } from "@/lib/repositories/history.repository";

export async function getHealthPlanSummary(userId: string) {
  const [
    assessments,
    latestCheckIn,
    uploadedReports,
    healthInsights,
    generatedResults,
    historyItems,
  ] = await Promise.all([
    getRecentAssessments(userId, 20),
    getLatestCheckIn(userId),
    getRecentUploadedReports(userId, 10),
    getRecentHealthInsights(userId, 10),
    getRecentGeneratedIntelligenceResults(userId, 10),
    getRecentHealthHistory(userId, 10),
  ]);

  const priorityAssessment =
    assessments.length > 0
      ? [...assessments].sort((a, b) => a.score - b.score)[0]
      : null;

  return {
    priorityAssessment,
    latestCheckIn,
    uploadedReports,
    healthInsights,
    generatedResults,
    historyItems,
  };
}