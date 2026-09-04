import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  BackgroundJob,
} from "./job-types";

export type EnqueueBackgroundJobResult = {
  jobId: string;

  created: boolean;
};

type EnqueueBackgroundJobRpcRow = {
  job_id?: unknown;

  created?: unknown;
};

export class BackgroundJobRepository {
  constructor(
    private readonly client:
      SupabaseClient
  ) {}

  async create(
    userId: string,
    requestId: string | null,
    job: BackgroundJob
  ): Promise<void> {
    const {
      error,
    } = await this.client
      .from(
        "background_jobs"
      )
      .insert({
        id:
          job.id,

        user_id:
          userId,

        request_id:
          requestId,

        job_type:
          job.type,

        status:
          job.status,

        payload:
          job.payload,

        attempts:
          job.attempts,

                max_attempts:
          job.maxAttempts,

        available_at:
          job.availableAt ??
          job.createdAt,

        created_at:
          job.createdAt,
      });

    if (error) {
      throw error;
    }
  }

    async findActiveReportJob(
    userId: string,
    jobType: string,
    reportId: number
  ): Promise<string | null> {
    const {
      data,
      error,
    } =
      await this.client
        .from(
          "background_jobs"
        )
        .select(
          "id"
        )
        .eq(
          "user_id",
          userId
        )
        .eq(
          "job_type",
          jobType
        )
        .eq(
          "report_id",
          reportId
        )
        .in(
          "status",
          [
            "pending",
            "running",
            "retrying",
          ]
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          }
        )
        .limit(
          1
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    const row =
      data as
        | {
            id?:
              unknown;
          }
        | null;

    if (
      !row ||
      typeof row.id !==
        "string" ||
      !row.id.trim()
    ) {
      return null;
    }

    return row.id;
  }

  async createReportJobOnce(
    userId: string,
    requestId: string | null,
    reportId: number,
    job: BackgroundJob
  ): Promise<
    EnqueueBackgroundJobResult
  > {
    const {
      data,
      error,
    } = await this.client.rpc(
      "enqueue_background_job_once",
      {
        p_job_id:
          job.id,

        p_user_id:
          userId,

        p_request_id:
          requestId,

        p_job_type:
          job.type,

        p_payload:
          job.payload,

        p_report_id:
          reportId,

        p_max_attempts:
          job.maxAttempts,

        p_created_at:
          job.createdAt,
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
        | EnqueueBackgroundJobRpcRow
        | undefined;

    if (
      !result ||
      typeof result.job_id !==
        "string" ||
      !result.job_id.trim() ||
      typeof result.created !==
        "boolean"
    ) {
      throw new Error(
        "Background job enqueue RPC returned an invalid result."
      );
    }

    return {
      jobId:
        result.job_id,

      created:
        result.created,
    };
  }

    async createFollowUpJobOnce({
    userId,
    requestId,
    idempotencyKey,
    job,
  }: {
    userId:
      string;

    requestId:
      string | null;

    idempotencyKey:
      string;

    job:
      BackgroundJob;
  }): Promise<
    EnqueueBackgroundJobResult
  > {
    const {
      data,
      error,
    } = await this.client.rpc(
      "enqueue_follow_up_delivery_once",
      {
        p_job_id:
          job.id,

        p_user_id:
          userId,

        p_request_id:
          requestId,

        p_payload:
          job.payload,

        p_idempotency_key:
          idempotencyKey,

        p_max_attempts:
          job.maxAttempts,

        p_available_at:
          job.availableAt ??
          job.createdAt,

        p_created_at:
          job.createdAt,
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
        | EnqueueBackgroundJobRpcRow
        | undefined;

    if (
      !result ||
      typeof result.job_id !==
        "string" ||
      !result.job_id.trim() ||
      typeof result.created !==
        "boolean"
    ) {
      throw new Error(
        "Follow-up delivery enqueue RPC returned an invalid result."
      );
    }

    return {
      jobId:
        result.job_id,

      created:
        result.created,
    };
  }

  async findById(
    jobId: string
  ): Promise<
    Record<
      string,
      unknown
    > | null
  > {
    const {
      data,
      error,
    } = await this.client
      .from(
        "background_jobs"
      )
      .select("*")
      .eq(
        "id",
        jobId
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }
}