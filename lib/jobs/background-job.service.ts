import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  FollowUpDeliveryEnvelope,
} from "@/lib/health-intelligence/application/follow-up-dispatch-adapter.service";

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

export type FollowUpDeliveryJobPayload = {
  delivery:
    NonNullable<
      FollowUpDeliveryEnvelope[
        "payload"
      ]
    >;

  idempotencyKey:
    string;

  retryDelaysMinutes:
    number[];

  auditMetadata:
    FollowUpDeliveryEnvelope[
      "auditMetadata"
    ];
};

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

    async findActivePdfExtraction({
    userId,
    reportId,
  }: {
    userId:
      string;

    reportId:
      number;
  }): Promise<
    string | null
  > {
    if (
      !Number.isSafeInteger(
        reportId
      ) ||
      reportId <= 0
    ) {
      throw new Error(
        "A valid report ID is required to find active PDF extraction."
      );
    }

    return this.repository
      .findActiveReportJob(
        userId,
        JOB_TYPES
          .PDF_EXTRACTION,
        reportId
      );
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

    async enqueueFollowUpDelivery({
    envelope,
  }: {
    envelope:
      FollowUpDeliveryEnvelope;
  }): Promise<
    EnqueueBackgroundJobResult
  > {
    if (
      !envelope.enqueue ||
      envelope.status !==
        "ready"
    ) {
      throw new Error(
        "A ready follow-up delivery envelope is required."
      );
    }

    if (
      !envelope.userId ||
      !envelope.userId.trim()
    ) {
      throw new Error(
        "A valid user ID is required to enqueue follow-up delivery."
      );
    }

    if (
      !envelope.payload
    ) {
      throw new Error(
        "A follow-up delivery payload is required."
      );
    }

    if (
      !envelope.availableAt ||
      Number.isNaN(
        new Date(
          envelope.availableAt
        ).getTime()
      )
    ) {
      throw new Error(
        "A valid follow-up delivery availability time is required."
      );
    }

    if (
      !envelope.idempotencyKey ||
      !envelope
        .idempotencyKey
        .trim()
    ) {
      throw new Error(
        "A follow-up delivery idempotency key is required."
      );
    }

    if (
      !Number.isInteger(
        envelope.maxAttempts
      ) ||
      envelope.maxAttempts <=
        0
    ) {
      throw new Error(
        "Follow-up delivery max attempts must be greater than zero."
      );
    }

    const payload:
      FollowUpDeliveryJobPayload = {
      delivery: {
        ...envelope.payload,

        userId:
          envelope.userId,
      },

      idempotencyKey:
        envelope.idempotencyKey,

      retryDelaysMinutes: [
        ...envelope
          .retryDelaysMinutes,
      ],

      auditMetadata: {
        ...envelope
          .auditMetadata,
      },
    };

    const job =
      createJob({
        type:
          JOB_TYPES
            .FOLLOW_UP_DELIVERY,

        payload,

        maxAttempts:
          envelope.maxAttempts,

        availableAt:
          envelope.availableAt,
      });

       return this.repository
      .createFollowUpJobOnce({
        userId:
          envelope.userId,

        requestId:
          envelope.requestId,

        idempotencyKey:
          envelope.idempotencyKey,

        job,
      });
  }
}