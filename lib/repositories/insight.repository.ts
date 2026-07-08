import { supabase } from "@/lib/supabase";

export type HealthInsightSummary = {
  id: number;
  report_id: number | null;
  insight_title: string | null;
  summary: string | null;
  key_findings: string | null;
  recommendations: string | null;
  doctor_brief: string | null;
  ai_status: string | null;
  risk_level: string | null;
  next_best_action: string | null;
  report_type: string | null;
  created_at: string;
};

export async function getRecentHealthInsights(
  userId: string,
  limit = 20
): Promise<HealthInsightSummary[]> {
  const { data, error } = await supabase
    .from("health_insights")
    .select(
      "id, report_id, insight_title, summary, key_findings, recommendations, doctor_brief, ai_status, risk_level, next_best_action, report_type, created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as HealthInsightSummary[];
}

export async function countGeneratedInsights(
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("health_insights")
    .select("id, ai_status")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).filter(
    (item) => item.ai_status === "generated"
  ).length;
}export type GeneratedIntelligenceSummary = {
  id: number;
  created_at: string | null;
};

export async function getRecentGeneratedIntelligenceResults(
  userId: string,
  limit = 20
): Promise<GeneratedIntelligenceSummary[]> {
  const { data, error } = await supabase
    .from("generated_intelligence_results")
    .select("id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as GeneratedIntelligenceSummary[];
}export type GeneratedResultSummary = {
  insight_id: number | null;
  report_id: number | null;
  updated_at: string | null;
};

export async function getRecentGeneratedResults(
  userId: string,
  limit = 20
): Promise<GeneratedResultSummary[]> {
  const { data, error } = await supabase
    .from("generated_intelligence_results")
    .select("insight_id, report_id, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as GeneratedResultSummary[];
}