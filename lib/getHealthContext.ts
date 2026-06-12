import { supabase } from "./supabase";
import { buildHealthIntelligence } from "./intelligenceBuilder";

export async function getHealthContext(isArabic = false) {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return null;
  }

  const user = userData.user;

  const { data: assessments } = await supabase
    .from("organ_assessments")
    .select("organ_name, score, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: labReport, error: labError } = await supabase
    .from("lab_reports")
    .select("score, interpretation, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: dailyCheckIn, error: checkInError } = await supabase
    .from("daily_checkins")
    .select("mood, wellness_score, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const intelligence = buildHealthIntelligence({
    assessments: assessments || [],
    labReport: labError ? null : labReport || null,
    dailyCheckIn: checkInError ? null : dailyCheckIn || null,
    isArabic,
  });

  return {
    overallScore: intelligence.overallScore,
    strongestOrgan: intelligence.strongestOrgan,
    priorityOrgan: intelligence.priorityOrgan,
    labScore: labError ? null : labReport?.score ?? null,
    dailyCheckInScore: checkInError ? null : dailyCheckIn?.wellness_score ?? null,
    dailyMood: checkInError ? null : dailyCheckIn?.mood ?? null,
    healthEngine: intelligence,
  };
}