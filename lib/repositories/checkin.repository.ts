import { supabase } from "@/lib/supabase";

export type DailyCheckInSummary = {
  mood: string;
  wellness_score: number;
  created_at: string;
};

export async function getLatestCheckIn(
  userId: string
): Promise<DailyCheckInSummary | null> {
  const { data, error } = await supabase
    .from("daily_checkins")
    .select("mood, wellness_score, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as DailyCheckInSummary | null;
}