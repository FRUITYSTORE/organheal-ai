import { supabase } from "@/lib/supabase";

export type DailyCheckInSummary = {
  mood: string;
  wellness_score: number;
  created_at: string;
};

export async function getRecentCheckIns(
  userId: string,
  limit = 20
): Promise<DailyCheckInSummary[]> {
  const safeLimit = Math.max(
    1,
    Math.min(limit, 100)
  );

  const { data, error } = await supabase
    .from("daily_checkins")
    .select(
      "mood, wellness_score, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    })
    .limit(safeLimit);

  if (error) {
    throw new Error(error.message);
  }

  return (
    (data as DailyCheckInSummary[] | null) ??
    []
  );
}

export async function getLatestCheckIn(
  userId: string
): Promise<DailyCheckInSummary | null> {
  const recentCheckIns =
    await getRecentCheckIns(userId, 1);

  return recentCheckIns[0] ?? null;
}