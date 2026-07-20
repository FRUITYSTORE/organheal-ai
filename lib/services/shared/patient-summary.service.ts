import { getRecentAssessments } from "@/lib/repositories/assessment.repository";
import {
  getRecentCheckIns,
} from "@/lib/repositories/checkin.repository";
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
    recentCheckIns,
    uploadedReports,
    healthInsights,
    generatedResults,
    historyItems,
  ] = await Promise.all([
    getRecentAssessments(userId, 20),
    getRecentCheckIns(userId, 20),
    getRecentUploadedReports(userId, 20),
    getRecentHealthInsights(userId, 20),
    getRecentGeneratedResults(userId, 20),
    getRecentHealthHistory(userId, 20),
  ]);

  const latestCheckIn =
    recentCheckIns[0] ?? null;

  return {
    profile: null,
    assessments,
    latestCheckIn,
    recentCheckIns,
    uploadedReports,
    healthInsights,
    generatedResults,
    historyItems,
  };
}