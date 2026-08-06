import {
  supabase,
} from "@/lib/supabase";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

const HEALTH_HISTORY_SELECT =
  "id, module_name, score, status, notes, created_at";

export type HealthHistorySummary = {
  id:
    string;

  module_name:
    string;

  score:
    number;

  status:
    string | null;

  notes?:
    string | null;

  created_at:
    string;
};

export type AddHealthHistoryInput = {
  userId:
    string;

  moduleName:
    string;

  score:
    number;

  status:
    string;

  notes?:
    string | null;
};

export async function getRecentHealthHistory(
  userId:
    string,
  limit = 10,
  client:
    SupabaseClient = supabase
): Promise<
  HealthHistorySummary[]
> {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        limit,
        100
      )
    );

  const {
    data,
    error,
  } =
    await client
      .from(
        "health_history"
      )
      .select(
        HEALTH_HISTORY_SELECT
      )
      .eq(
        "user_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        safeLimit
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    data ?? []
  ) as HealthHistorySummary[];
}

export async function addHealthHistoryItem(
  {
    userId,
    moduleName,
    score,
    status,
    notes,
  }:
    AddHealthHistoryInput,
  client:
    SupabaseClient = supabase
): Promise<void> {
  const {
    error,
  } =
    await client
      .from(
        "health_history"
      )
      .insert({
        user_id:
          userId,

        module_name:
          moduleName,

        score,

        status,

        notes:
          notes ?? null,
      });

  if (error) {
    throw new Error(
      error.message
    );
  }
}