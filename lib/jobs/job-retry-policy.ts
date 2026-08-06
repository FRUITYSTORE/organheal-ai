import type {
  BackgroundJob,
} from "./job-types";

import {
  JOB_STATUS,
} from "./job-types";

export class JobRetryPolicy {
  shouldRetry(
    job: BackgroundJob
  ): boolean {
    return (
      job.attempts <
      job.maxAttempts
    );
  }

  prepareRetry(
    job: BackgroundJob
  ): void {
    job.status =
      JOB_STATUS.RETRYING;

    job.finishedAt =
      null;

    job.lastError =
      null;
  }

  markFailed(
    job: BackgroundJob,
    error: unknown
  ): void {
    job.status =
      JOB_STATUS.FAILED;

    job.finishedAt =
      new Date().toISOString();

    job.lastError =
      error instanceof Error
        ? error.message
        : String(error);
  }
}