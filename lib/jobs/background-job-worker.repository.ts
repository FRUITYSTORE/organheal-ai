import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  getSupabaseAdminClient,
} from "@/lib/supabase-admin";

import type {
  BackgroundJob,
  JobStatus,
  JobType,
} from "./job-types";

export type DurableBackgroundJob<
  TPayload = unknown,
> = BackgroundJob<TPayload> & {
  userId:
    string;

  requestId:
    string | null;

  availableAt:
    string;

  updatedAt:
    string;
};

export type BackgroundJobRecoveryResult = {
  recoveredRetrying:
    number;

  recoveredFailed:
    number;
};

type BackgroundJobRecoveryRpcRow = {
  recovered_retrying?:
    unknown;

  recovered_failed?:
    unknown;
};

type BackgroundJobRow = {
  id:
    string;

  user_id:
    string;

  request_id:
    string | null;

  job_type:
    JobType;

  status:
    JobStatus;

  payload:
    unknown;

  attempts:
    number;

  max_attempts:
    number;

  available_at:
    string;

  started_at:
    string | null;

  finished_at:
    string | null;

  last_error:
    string | null;

  created_at:
    string;

  updated_at:
    string;
};

function mapBackgroundJobRow<
  TPayload = unknown,
>(
  row:
    BackgroundJobRow
): DurableBackgroundJob<TPayload> {
  return {
    id:
      row.id,

    userId:
      row.user_id,

    requestId:
      row.request_id,

    type:
      row.job_type,

    status:
      row.status,

    payload:
      row.payload as TPayload,

    attempts:
      row.attempts,

    maxAttempts:
      row.max_attempts,

    availableAt:
      row.available_at,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,

    startedAt:
      row.started_at,

    finishedAt:
      row.finished_at,

    lastError:
      row.last_error,
  };
}

export class BackgroundJobWorkerRepository {
  constructor(
    private readonly client:
      SupabaseClient =
        getSupabaseAdminClient()
  ) {}

    async recoverStaleJobs({
    staleAfterSeconds = 1800,
    maximumJobs = 10,
  }: {
    staleAfterSeconds?:
      number;

    maximumJobs?:
      number;
  } = {}): Promise<
    BackgroundJobRecoveryResult
  > {
    const {
      data,
      error,
    } =
      await this.client.rpc(
        "recover_stale_background_jobs",
        {
          p_stale_after_seconds:
            staleAfterSeconds,

          p_maximum_jobs:
            maximumJobs,
        }
      );

    if (error) {
      throw error;
    }

    const rows =
      Array.isArray(data)
        ? data
        : data
          ? [data]
          : [];

    const result =
      rows[0] as
        | BackgroundJobRecoveryRpcRow
        | undefined;

    if (
      !result ||
      typeof result.recovered_retrying !==
        "number" ||
      typeof result.recovered_failed !==
        "number"
    ) {
      throw new Error(
        "Background job recovery RPC returned an invalid result."
      );
    }

    return {
      recoveredRetrying:
        result.recovered_retrying,

      recoveredFailed:
        result.recovered_failed,
    };
  }

  async claimNext<
    TPayload = unknown,
  >(): Promise<
    DurableBackgroundJob<TPayload> | null
  > {
    const {
      data,
      error,
    } =
      await this.client.rpc(
        "claim_next_background_job"
      );

    if (error) {
      throw error;
    }

    const rows =
      Array.isArray(data)
        ? data
        : [];

    const row =
      rows[0] as
        | BackgroundJobRow
        | undefined;

    return row
      ? mapBackgroundJobRow<TPayload>(
          row
        )
      : null;
  }

  async markCompleted(
    jobId:
      string
  ): Promise<void> {
    const now =
      new Date().toISOString();

    const {
      error,
    } =
      await this.client
        .from(
          "background_jobs"
        )
        .update({
          status:
            "completed",

          finished_at:
            now,

          last_error:
            null,

          updated_at:
            now,
        })
        .eq(
          "id",
          jobId
        );

    if (error) {
      throw error;
    }
  }

  async scheduleRetry({
    jobId,
    attempts,
    availableAt,
    errorMessage,
  }: {
    jobId:
      string;

    attempts:
      number;

    availableAt:
      string;

    errorMessage:
      string;
  }): Promise<void> {
    const now =
      new Date().toISOString();

    const {
      error,
    } =
      await this.client
        .from(
          "background_jobs"
        )
        .update({
          status:
            "retrying",

          attempts,

          available_at:
            availableAt,

          started_at:
            null,

          finished_at:
            null,

          last_error:
            errorMessage,

          updated_at:
            now,
        })
        .eq(
          "id",
          jobId
        );

    if (error) {
      throw error;
    }
  }

  async markFailed({
    jobId,
    attempts,
    errorMessage,
  }: {
    jobId:
      string;

    attempts:
      number;

    errorMessage:
      string;
  }): Promise<void> {
    const now =
      new Date().toISOString();

    const {
      error,
    } =
      await this.client
        .from(
          "background_jobs"
        )
        .update({
          status:
            "failed",

          attempts,

          finished_at:
            now,

          last_error:
            errorMessage,

          updated_at:
            now,
        })
        .eq(
          "id",
          jobId
        );

    if (error) {
      throw error;
    }
  }
}