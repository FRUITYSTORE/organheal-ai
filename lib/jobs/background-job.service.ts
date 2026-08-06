import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  createJob,
} from "./job-factory";

import {
  JOB_TYPES,
} from "./job-types";

import type {
  JobType,
} from "./job-types";

import {
  BackgroundJobRepository,
} from "./background-job.repository";

import type {
  EnqueueBackgroundJobResult,
} from "./background-job.repository";

export class BackgroundJobService {
  private readonly repository:
    BackgroundJobRepository;

  constructor(
    client: SupabaseClient
  ) {
    this.repository =
      new BackgroundJobRepository(
        client
      );
  }

  async enqueue<TPayload>({
    userId,
    requestId = null,
    type,
    payload,
    maxAttempts,
  }: {
    userId: string;

    requestId?: string | null;

    type: JobType;

    payload: TPayload;

    maxAttempts?: number;
  }): Promise<string> {
    const job =
      createJob({
        type,
        payload,
        maxAttempts,
      });

    await this.repository.create(
      userId,
      requestId,
      job
    );

    return job.id;
  }

  async enqueuePdfExtraction<
    TPayload extends {
      reportId: number;
    },
  >({
    userId,
    requestId = null,
    payload,
    maxAttempts,
  }: {
    userId: string;

    requestId?: string | null;

    payload: TPayload;

    maxAttempts?: number;
  }): Promise<
    EnqueueBackgroundJobResult
  > {
    if (
      !Number.isSafeInteger(
        payload.reportId
      ) ||
      payload.reportId <= 0
    ) {
      throw new Error(
        "A valid report ID is required to enqueue PDF extraction."
      );
    }

    const job =
      createJob({
        type:
          JOB_TYPES
            .PDF_EXTRACTION,

        payload,

        maxAttempts,
      });

    return this.repository
      .createReportJobOnce(
        userId,
        requestId,
        payload.reportId,
        job
      );
  }
}