import { supabase } from "@/lib/supabase";

export async function getHealthPlanSummary(userId: string) {
  const [
    assessmentResponse,
    checkInResponse,
    reportsResponse,
    insightsResponse,
    generatedResponse,
    historyResponse,
  ] = await Promise.all([
    supabase
      .from("organ_assessments")
      .select("organ_name, score, risk_level")
      .eq("user_id", userId)
      .order("score", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("daily_checkins")
      .select("mood, wellness_score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("uploaded_lab_files")
      .select("id, file_name, extraction_status, created_at, extracted_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("health_insights")
      .select("id, report_id, ai_status, risk_level, summary, next_best_action, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("generated_intelligence_results")
      .select("insight_id, report_id, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(10),
    supabase
      .from("health_history")
      .select("id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (assessmentResponse.error) {
    throw new Error(assessmentResponse.error.message);
  }

  if (checkInResponse.error) {
    throw new Error(checkInResponse.error.message);
  }

  if (reportsResponse.error) {
    throw new Error(reportsResponse.error.message);
  }

  if (insightsResponse.error) {
    throw new Error(insightsResponse.error.message);
  }

  if (generatedResponse.error) {
    throw new Error(generatedResponse.error.message);
  }

  if (historyResponse.error) {
    throw new Error(historyResponse.error.message);
  }

  return {
    priorityAssessment: assessmentResponse.data || null,
    latestCheckIn: checkInResponse.data || null,
    uploadedReports: reportsResponse.data || [],
    healthInsights: insightsResponse.data || [],
    generatedResults: generatedResponse.data || [],
    historyItems: historyResponse.data || [],
  };
}