import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  limit = 20,
  client: SupabaseClient = supabase
): Promise<HealthInsightSummary[]> {
  const { data, error } = await client
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
  userId: string,
  client: SupabaseClient = supabase
): Promise<number> {
  const { count, error } = await client
    .from("health_insights")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId)
    .eq("ai_status", "Generated");

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export type GeneratedIntelligenceSummary = {
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
}

export async function countGeneratedIntelligenceResults(
  userId: string,
  client: SupabaseClient = supabase
): Promise<number> {
  const { count, error } = await client
    .from("generated_intelligence_results")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}
export type GeneratedResultSummary = {
  insight_id: number | null;
  report_id: number | null;
  updated_at: string | null;
};

export async function getRecentGeneratedResults(
  userId: string,
  limit = 20,
  client: SupabaseClient = supabase
): Promise<GeneratedResultSummary[]> {
  const { data, error } = await client
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
export type SavedGeneratedIntelligenceResult = {
  insight_id: number;
  result: unknown;
  updated_at: string | null;
};

export type SaveGeneratedIntelligenceResultInput = {
  userId: string;
  insightId: number;
  reportId: number | null;
  result: unknown;
};

export async function getGeneratedResultByInsightId(
  userId: string,
  insightId: number
): Promise<SavedGeneratedIntelligenceResult | null> {
  const { data, error } = await supabase
    .from("generated_intelligence_results")
    .select("insight_id, result, updated_at")
    .eq("user_id", userId)
    .eq("insight_id", insightId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as SavedGeneratedIntelligenceResult | null;
}

export async function saveGeneratedIntelligenceResult(
  input: SaveGeneratedIntelligenceResultInput
): Promise<void> {
  const { error } = await supabase
    .from("generated_intelligence_results")
    .upsert(
      {
        user_id: input.userId,
        insight_id: input.insightId,
        report_id: input.reportId,
        result: input.result,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,insight_id",
      }
    );

  if (error) {
    throw new Error(error.message);
  }
}
export async function getLatestGeneratedResultByInsightIds(
  userId: string,
  insightIds: number[]
): Promise<SavedGeneratedIntelligenceResult | null> {
  if (insightIds.length === 0) {
    return null;
  }

  const { data, error } = await supabase
    .from("generated_intelligence_results")
    .select("insight_id, result, updated_at")
    .eq("user_id", userId)
    .in("insight_id", insightIds)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as SavedGeneratedIntelligenceResult | null;
}
export async function updateHealthInsight(
  userId: string,
  insightId: number,
  update: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from("health_insights")
    .update(update)
    .eq("id", insightId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
export type PersistReportIntelligenceAtomicInput = {
  insightId: number;
  reportId: number | null;
  medicalCategory: string | null;
  aiStatus: string | null;
  riskLevel: string | null;
  summary: string | null;
  keyFindings: string | null;
  riskSignals: string | null;
  recommendations: string | null;
  doctorBrief: string | null;
  nextBestAction: string | null;
  generatedResult: unknown;
};

export async function persistReportIntelligenceAtomic(
  input: PersistReportIntelligenceAtomicInput
): Promise<void> {
  const { error } = await supabase.rpc(
    "persist_report_intelligence",
    {
      p_insight_id: input.insightId,
      p_report_id: input.reportId,
      p_medical_category: input.medicalCategory,
      p_ai_status: input.aiStatus,
      p_risk_level: input.riskLevel,
      p_summary: input.summary,
      p_key_findings: input.keyFindings,
      p_risk_signals: input.riskSignals,
      p_recommendations: input.recommendations,
      p_doctor_brief: input.doctorBrief,
      p_next_best_action: input.nextBestAction,
      p_generated_result: input.generatedResult,
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}
export async function getHealthInsightsByReportId(
  userId: string,
  reportId: number,
  client: SupabaseClient = supabase
): Promise<HealthInsightSummary[]> {
  const { data, error } = await client
    .from("health_insights")
    .select(
      "id, report_id, insight_title, summary, key_findings, recommendations, doctor_brief, ai_status, risk_level, next_best_action, report_type, created_at"
    )
    .eq("user_id", userId)
    .eq("report_id", reportId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as HealthInsightSummary[];
}

export async function getGeneratedResultsByReportId(
  userId: string,
  reportId: number,
  client: SupabaseClient = supabase
): Promise<GeneratedResultSummary[]> {
  const { data, error } = await client
    .from("generated_intelligence_results")
    .select("insight_id, report_id, updated_at")
    .eq("user_id", userId)
    .eq("report_id", reportId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as GeneratedResultSummary[];
}