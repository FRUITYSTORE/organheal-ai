import { supabase } from "@/lib/supabase";
import { AssessmentSummary } from "@/lib/models/assessment";

export async function getRecentAssessments(
  userId: string,
  limit = 20
): Promise<AssessmentSummary[]> {
  const { data, error } = await supabase
    .from("organ_assessments")
    .select("organ_name, score, risk_level, notes, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as AssessmentSummary[];
}