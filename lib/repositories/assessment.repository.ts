import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { AssessmentSummary } from "@/lib/models/assessment";

export type SaveAssessmentInput = {
  userId: string;
  organName: string;
  score: number;
  riskLevel: string;
  notes?: string | null;
};

export async function getRecentAssessments(
  userId: string,
  limit = 20,
  client: SupabaseClient = supabase
): Promise<AssessmentSummary[]> {
  const { data, error } = await client
    .from("organ_assessments")
    .select(
      "organ_name, score, risk_level, notes, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as AssessmentSummary[];
}

export async function saveOrganAssessment({
  userId,
  organName,
  score,
  riskLevel,
  notes,
}: SaveAssessmentInput): Promise<void> {
  const { error } = await supabase
    .from("organ_assessments")
    .upsert(
      {
        user_id: userId,
        organ_name: organName,
        score,
        risk_level: riskLevel,
        notes: notes ?? null,
      },
      {
        onConflict: "user_id,organ_name",
      }
    );

  if (error) {
    throw new Error(error.message);
  }
}