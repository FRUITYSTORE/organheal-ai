import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  supabase,
} from "@/lib/supabase";

import type {
  AssessmentSummary,
} from "@/lib/models/assessment";

const ASSESSMENT_SELECT =
  "organ_name, score, risk_level, notes, created_at";

export type SaveAssessmentInput = {
  userId:
    string;

  organName:
    string;

  score:
    number;

  riskLevel:
    string;

  notes?:
    string | null;
};

export async function getRecentAssessments(
  userId:
    string,
  limit = 20,
  client:
    SupabaseClient = supabase
): Promise<
  AssessmentSummary[]
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
        "organ_assessments"
      )
      .select(
        ASSESSMENT_SELECT
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
  ) as AssessmentSummary[];
}

export async function saveOrganAssessment(
  {
    userId,
    organName,
    score,
    riskLevel,
    notes,
  }:
    SaveAssessmentInput,
  client:
    SupabaseClient = supabase
): Promise<void> {
  const {
    error,
  } =
    await client
      .from(
        "organ_assessments"
      )
      .upsert(
        {
          user_id:
            userId,

          organ_name:
            organName,

          score,

          risk_level:
            riskLevel,

          notes:
            notes ?? null,
        },
        {
          onConflict:
            "user_id,organ_name",
        }
      );

  if (error) {
    throw new Error(
      error.message
    );
  }
}