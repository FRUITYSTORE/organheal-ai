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

  const { data: dailyCheckIn, error: checkInError } = await supabase
    .from("daily_checkins")
    .select("mood, wellness_score, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const intelligence = buildHealthIntelligence({
    assessments: assessments || [],
    labReport: null,
    dailyCheckIn: checkInError ? null : dailyCheckIn || null,
    isArabic,
  });

  return {
    overallScore: intelligence.overallScore,
    strongestOrgan: intelligence.strongestOrgan,
    priorityOrgan: intelligence.priorityOrgan,
    labScore: null,
    dailyCheckInScore: checkInError ? null : dailyCheckIn?.wellness_score ?? null,
    healthEngine: intelligence,
  };
}
