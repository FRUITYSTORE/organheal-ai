import { supabase } from "@/lib/supabase";

export type HealthHistorySummary = {
  id: string;
  module_name: string;
  score: number;
  status: string | null;
  notes?: string | null;
  created_at: string;
};

export type AddHealthHistoryInput = {
  userId: string;
  moduleName: string;
  score: number;
  status: string;
  notes?: string | null;
};

export async function getRecentHealthHistory(
  userId: string,
  limit = 10
): Promise<HealthHistorySummary[]> {
  const { data, error } = await supabase
    .from("health_history")
    .select("id, module_name, score, status, notes, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as HealthHistorySummary[];
}

export async function addHealthHistoryItem({
  userId,
  moduleName,
  score,
  status,
  notes,
}: AddHealthHistoryInput): Promise<void> {
  const { error } = await supabase
    .from("health_history")
    .insert({
      user_id: userId,
      module_name: moduleName,
      score,
      status,
      notes: notes ?? null,
    });

  if (error) {
    throw new Error(error.message);
  }
}