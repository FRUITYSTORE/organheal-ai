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
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export async function getPatientSummary(
  userId: string,
  client: SupabaseClient = supabase
): Promise<PatientSummary> {
  const [
    assessments,
    recentCheckIns,
    uploadedReports,
    healthInsights,
    generatedResults,
    historyItems,
  ] = await Promise.all([
    getRecentAssessments(userId, 20, client),
    getRecentCheckIns(userId, 20, client),
    getRecentUploadedReports(userId, 20, client),
    getRecentHealthInsights(userId, 20, client),
    getRecentGeneratedResults(userId, 20, client),
    getRecentHealthHistory(userId, 20, client),
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