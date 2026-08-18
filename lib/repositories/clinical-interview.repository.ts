import {
  supabase,
} from "@/lib/supabase";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  ClinicalReasoningState,
} from "@/lib/health-intelligence/runtime/clinical-reasoning-state";

const CLINICAL_INTERVIEW_SESSIONS_TABLE =
  "clinical_interview_sessions";

const CLINICAL_INTERVIEW_SELECT =
  "id, user_id, status, reasoning_state, created_at, updated_at";

export type ClinicalInterviewStatus =
  | "active"
  | "completed"
  | "abandoned";

export type ClinicalInterviewSession = {
  id:
    string;

  user_id:
    string;

  status:
    ClinicalInterviewStatus;

  reasoning_state:
    ClinicalReasoningState;

  created_at:
    string;

  updated_at:
    string;
};

export type CreateClinicalInterviewInput = {
  userId:
    string;

  reasoningState:
    ClinicalReasoningState;

  status?:
    ClinicalInterviewStatus;
};

export type UpdateClinicalInterviewInput = {
  userId:
    string;

  interviewId:
    string;

  reasoningState:
    ClinicalReasoningState;

  status?:
    ClinicalInterviewStatus;
};

export async function createClinicalInterview(
  {
    userId,
    reasoningState,
    status = "active",
  }:
    CreateClinicalInterviewInput,
  client:
    SupabaseClient = supabase
): Promise<ClinicalInterviewSession> {
  const {
    data,
    error,
  } =
    await client
      .from(
        CLINICAL_INTERVIEW_SESSIONS_TABLE
      )
      .insert({
        user_id:
          userId,

        status,

        reasoning_state:
          reasoningState,
      })
      .select(
        CLINICAL_INTERVIEW_SELECT
      )
      .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as ClinicalInterviewSession;
}

export async function getClinicalInterview(
  userId:
    string,
  interviewId:
    string,
  client:
    SupabaseClient = supabase
): Promise<ClinicalInterviewSession | null> {
  const {
    data,
    error,
  } =
    await client
      .from(
        CLINICAL_INTERVIEW_SESSIONS_TABLE
      )
      .select(
        CLINICAL_INTERVIEW_SELECT
      )
      .eq(
        "user_id",
        userId
      )
      .eq(
        "id",
        interviewId
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data
    ? data as ClinicalInterviewSession
    : null;
}

export async function updateClinicalInterview(
  {
    userId,
    interviewId,
    reasoningState,
    status = "active",
  }:
    UpdateClinicalInterviewInput,
  client:
    SupabaseClient = supabase
): Promise<ClinicalInterviewSession> {
  const {
    data,
    error,
  } =
    await client
      .from(
        CLINICAL_INTERVIEW_SESSIONS_TABLE
      )
      .update({
        reasoning_state:
          reasoningState,

        status,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "user_id",
        userId
      )
      .eq(
        "id",
        interviewId
      )
      .select(
        CLINICAL_INTERVIEW_SELECT
      )
      .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as ClinicalInterviewSession;
}