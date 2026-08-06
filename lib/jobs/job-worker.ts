import type {
  BackgroundJob,
} from "./job-types";

import type {
  BackgroundJobQueue,
} from "./job-queue";

import {
  JOB_STATUS,
} from "./job-types";

import {
  JobDispatcher,
} from "./job-dispatcher";

import {
  JobRetryPolicy,
} from "./job-retry-policy";

export class JobWorker {
  constructor(
    private readonly queue:
      BackgroundJobQueue,

    private readonly dispatcher:
      JobDispatcher,

    private readonly retryPolicy =
      new JobRetryPolicy()
  ) {}

  async processNext(): Promise<boolean> {
    const job =
      await this.queue.dequeue<
        BackgroundJob
      >();

    if (!job) {
      return false;
    }

    job.status =
      JOB_STATUS.RUNNING;

    job.startedAt =
      new Date().toISOString();

    try {
      await this.dispatcher.dispatch(
        job
      );

      job.status =
        JOB_STATUS.COMPLETED;

      job.finishedAt =
        new Date().toISOString();

      job.lastError =
        null;
    } catch (error) {
      job.attempts++;

      if (
        this.retryPolicy.shouldRetry(
          job
        )
      ) {
        this.retryPolicy.prepareRetry(
          job
        );

        await this.queue.enqueue(
          job
        );
      } else {
        this.retryPolicy.markFailed(
          job,
          error
        );
      }
    }

    return true;
  }
}