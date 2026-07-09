import { getRecentAssessments } from "@/lib/repositories/assessment.repository";
import { getLatestCheckIn } from "@/lib/repositories/checkin.repository";
import { getRecentUploadedReports } from "@/lib/repositories/reports.repository";
import {
  getRecentGeneratedResults,
  getRecentHealthInsights,
} from "@/lib/repositories/insight.repository";
import { getRecentHealthHistory } from "@/lib/repositories/history.repository";
import { PatientSummary } from "@/lib/models/patient";

export async function getPatientSummary(userId: string): Promise<PatientSummary> {
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
    getRecentUploadedReports(userId, 20),
    getRecentHealthInsights(userId, 20),
    getRecentGeneratedResults(userId, 20),
    getRecentHealthHistory(userId, 20),
  ]);

  return {
    profile: null,
    assessments,
    latestCheckIn,
    uploadedReports,
    healthInsights,
    generatedResults,
    historyItems,
  };
}