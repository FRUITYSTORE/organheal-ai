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
      const result = await this.dispatcher.dispatch(
        job
      );

      // This legacy in-memory worker has no fenced persistence. Never turn a
      // durable disposition into completion or an unfenced retry loop.
      if (result && result.disposition !== "complete") {
        if (result.disposition === "defer-completion") {
          try { await result.settle(false); } catch { /* No unfenced retry on cleanup failure. */ }
        }
        if (result.disposition === "ownership-lost") return true;
        job.status = JOB_STATUS.FAILED;
        job.finishedAt = new Date().toISOString();
        job.lastError = "DURABLE_HANDLER_REQUIRES_FENCED_WORKER";
        return true;
      }

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
