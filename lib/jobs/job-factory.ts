import {
  randomUUID,
} from "node:crypto";

import type {
  BackgroundJob,
  JobType,
} from "./job-types";

import {
  JOB_STATUS,
} from "./job-types";

export type CreateJobOptions<
  TPayload,
> = {
  type:
    JobType;

  payload:
    TPayload;

   maxAttempts?:
    number;

  availableAt?:
    string | Date;
};

export function createJob<
  TPayload,
>({
  type,
  payload,
  maxAttempts = 3,
  availableAt,
}: CreateJobOptions<TPayload>): BackgroundJob<TPayload> {
  const createdAt =
    new Date()
      .toISOString();

  const normalizedAvailableAt =
    availableAt instanceof Date
      ? availableAt
          .toISOString()
      : typeof availableAt ===
          "string" &&
        !Number.isNaN(
          new Date(
            availableAt
          ).getTime()
        )
        ? new Date(
            availableAt
          ).toISOString()
        : createdAt;

  return {
    id:
      randomUUID(),

    type,

    status:
      JOB_STATUS.PENDING,

    payload,

    attempts:
      0,

    maxAttempts,

        createdAt,

    availableAt:
      normalizedAvailableAt,

    startedAt:
      null,

    finishedAt:
      null,

    lastError:
      null,
  };
}