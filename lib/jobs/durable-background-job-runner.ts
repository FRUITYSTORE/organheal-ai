import {
  DurableBackgroundJobWorker,
} from "@/lib/jobs/background-job-worker";

import type {
  BackgroundJobWorkerRepository,
} from "@/lib/jobs/background-job-worker.repository";

export type DurableJobRunResult = {
  processedJobs:
    number;

  reachedLimit:
    boolean;

  queueWasEmpty:
    boolean;

  recoveredRetrying:
    number;

  recoveredFailed:
    number;
};

export class DurableBackgroundJobRunner {
  constructor(
    private readonly worker:
      DurableBackgroundJobWorker,

    private readonly repository?:
      BackgroundJobWorkerRepository
  ) {}

  async runBatch(
    maximumJobs = 5
  ): Promise<DurableJobRunResult> {
    const normalizedMaximumJobs =
      Number.isInteger(
        maximumJobs
      ) &&
      maximumJobs > 0
        ? maximumJobs
        : 1;

    const recoveryResult =
      this.repository
        ? await this.repository
            .recoverStaleJobs()
        : {
            recoveredRetrying:
              0,

            recoveredFailed:
              0,
          };

    let processedJobs =
      0;

    while (
      processedJobs <
      normalizedMaximumJobs
    ) {
      const processed =
        await this.worker
          .processNext();

      if (!processed) {
        return {
          processedJobs,

          reachedLimit:
            false,

          queueWasEmpty:
            true,

          recoveredRetrying:
            recoveryResult
              .recoveredRetrying,

          recoveredFailed:
            recoveryResult
              .recoveredFailed,
        };
      }

      processedJobs++;
    }

    return {
      processedJobs,

      reachedLimit:
        true,

      queueWasEmpty:
        false,

      recoveredRetrying:
        recoveryResult
          .recoveredRetrying,

      recoveredFailed:
        recoveryResult
          .recoveredFailed,
    };
  }
}