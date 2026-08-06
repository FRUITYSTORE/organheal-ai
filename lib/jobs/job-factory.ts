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
};

export function createJob<
  TPayload,
>({
  type,
  payload,
  maxAttempts = 3,
}: CreateJobOptions<TPayload>): BackgroundJob<TPayload> {
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

    createdAt:
      new Date().toISOString(),

    startedAt:
      null,

    finishedAt:
      null,

    lastError:
      null,
  };
}