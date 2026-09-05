import {
  logApiError,
} from "@/lib/api/api-logger";

import {
  JobDispatcher,
} from "./job-dispatcher";

import {
  BackgroundJobWorkerRepository,
  type DurableBackgroundJob,
} from "./background-job-worker.repository";

const BASE_RETRY_DELAY_MS =
  30_000;

const MAX_RETRY_DELAY_MS =
  15 * 60_000;

function getErrorMessage(
  error: unknown
): string {
  return error instanceof Error
    ? error.message
    : String(error);
}

function calculateRetryDelayMs(
  failedAttemptNumber: number
): number {
  const exponent =
    Math.max(
      failedAttemptNumber - 1,
      0
    );

  return Math.min(
    BASE_RETRY_DELAY_MS *
      2 ** exponent,

    MAX_RETRY_DELAY_MS
  );
}

export class DurableBackgroundJobWorker {
  constructor(
    private readonly repository:
      BackgroundJobWorkerRepository,

    private readonly dispatcher:
      JobDispatcher
  ) {}

  async processNext():
    Promise<boolean> {
    const job =
      await this.repository.claimNext();

    if (!job) {
      return false;
    }

    await this.processClaimedJob(
      job
    );

    return true;
  }

    async processById(
    jobId:
      string
  ): Promise<boolean> {
    const job =
      await this.repository
        .claimById(
          jobId
        );

    if (!job) {
      return false;
    }

    await this.processClaimedJob(
      job
    );

    return true;
  }

  private async processClaimedJob(
    job:
      DurableBackgroundJob
  ): Promise<void> {
    try {
      await this.dispatcher.dispatch(
        job
      );

      await this.repository
        .markCompleted(
          job.id
        );
    } catch (error) {
      const nextAttempts =
        job.attempts + 1;

      const errorMessage =
        getErrorMessage(
          error
        );

      logApiError(
        "background_job.execution_failed",
        error,
        {
          route:
            "background-worker",

          requestId:
            job.requestId,

          jobId:
            job.id,

          jobType:
            job.type,

          attempts:
            nextAttempts,

          maxAttempts:
            job.maxAttempts,
        }
      );

      if (
        nextAttempts <
        job.maxAttempts
      ) {
        const retryDelayMs =
          calculateRetryDelayMs(
            nextAttempts
          );

        const availableAt =
          new Date(
            Date.now() +
              retryDelayMs
          ).toISOString();

        await this.repository
          .scheduleRetry({
            jobId:
              job.id,

            attempts:
              nextAttempts,

            availableAt,

            errorMessage,
          });

        return;
      }

      await this.repository
        .markFailed({
          jobId:
            job.id,

          attempts:
            nextAttempts,

          errorMessage,
        });
    }
  }
}