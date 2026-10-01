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

  attemptToken: string;
  leaseExpiresAt: string;
};

export type BackgroundJobAttempt = { jobId: string; attemptToken: string };
export type AttemptMutationResult = {
  outcome: "applied" | "ownership-lost" | "already-finalized";
  status: JobStatus | null;
  leaseExpiresAt: string | null;
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

  attempt_token: string;
  lease_expires_at: string;
};

function mapBackgroundJobRow<
  TPayload = unknown,
>(
  row:
    BackgroundJobRow
): DurableBackgroundJob<TPayload> {
  if (row.status !== "running" || typeof row.attempt_token !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.attempt_token) ||
    typeof row.lease_expires_at !== "string" || !Number.isFinite(Date.parse(row.lease_expires_at))) {
    throw new Error("Background job claim did not return valid attempt ownership.");
  }
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

    attemptToken: row.attempt_token,
    leaseExpiresAt: row.lease_expires_at,
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

    async claimById<
    TPayload = unknown,
  >(
    jobId:
      string
  ): Promise<
    DurableBackgroundJob<TPayload> | null
  > {
    const {
      data,
      error,
    } =
      await this.client.rpc(
        "claim_background_job_by_id",
        {
          p_job_id:
            jobId,
        }
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

  private async mutateAttempt(
    attempt: BackgroundJobAttempt, action: "renew" | "complete" | "retry" | "fail",
    options: { retryDelayMs?: number; errorMessage?: string } = {},
  ): Promise<AttemptMutationResult> {
    const { data, error } = await this.client.rpc("mutate_background_job_attempt", {
      p_job_id: attempt.jobId, p_attempt_token: attempt.attemptToken, p_action: action,
      p_retry_delay_ms: options.retryDelayMs ?? 0, p_error_message: options.errorMessage ?? null,
    });
    if (error) throw error;
    const row = Array.isArray(data) && data.length === 1 ? data[0] : null;
    if (!row || !["applied", "ownership-lost", "already-finalized"].includes(row.outcome) ||
      !(row.job_status === null || ["pending", "running", "completed", "failed", "retrying", "cancelled"].includes(row.job_status)) ||
      !(row.lease_expires_at === null || (typeof row.lease_expires_at === "string" && Number.isFinite(Date.parse(row.lease_expires_at))))) {
      // Empty/zero-row RPC responses are protocol failures, never success.
      throw new Error("Background job ownership mutation returned an invalid result.");
    }
    return { outcome: row.outcome, status: row.job_status, leaseExpiresAt: row.lease_expires_at };
  }

  renewLease(attempt: BackgroundJobAttempt) {
    return this.mutateAttempt(attempt, "renew");
  }

  markCompleted(attempt: BackgroundJobAttempt) {
    return this.mutateAttempt(attempt, "complete");
  }

  scheduleRetry(input: BackgroundJobAttempt & { retryDelayMs: number; errorMessage: string }) {
    return this.mutateAttempt(input, "retry", input);
  }

  markFailed(input: BackgroundJobAttempt & { errorMessage: string }) {
    return this.mutateAttempt(input, "fail", input);
  }
}
