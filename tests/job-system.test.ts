import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  InMemoryJobQueue,
} from "@/lib/jobs/in-memory-job-queue";

import {
  JobDispatcher,
} from "@/lib/jobs/job-dispatcher";

import {
  JobRetryPolicy,
} from "@/lib/jobs/job-retry-policy";

import {
  JobRunner,
} from "@/lib/jobs/job-runner";

import {
  JobWorker,
} from "@/lib/jobs/job-worker";

import {
  JOB_STATUS,
  JOB_TYPES,
  type BackgroundJob,
} from "@/lib/jobs/job-types";

import {
  createJob,
} from "@/lib/jobs/job-factory";

function createTestJob(
  overrides:
    Partial<
      BackgroundJob<{
        reportId:
          number;
      }>
    > = {}
): BackgroundJob<{
  reportId:
    number;
}> {
  return {
    id:
      "job_test_1",

    type:
      JOB_TYPES.PDF_EXTRACTION,

    status:
      JOB_STATUS.PENDING,

    payload: {
      reportId:
        100,
    },

    attempts:
      0,

    maxAttempts:
      3,

    createdAt:
      new Date().toISOString(),

    startedAt:
      null,

    finishedAt:
      null,

    lastError:
      null,

    ...overrides,
  };
}

describe(
  "Background job system",
  () => {
    it(
      "enqueues, peeks, dequeues, and clears jobs",
      async () => {
        const queue =
          new InMemoryJobQueue();

        const job =
          createTestJob();

        expect(
          await queue.size()
        ).toBe(
          0
        );

        await queue.enqueue(
          job
        );

        expect(
          await queue.size()
        ).toBe(
          1
        );

        expect(
          await queue.peek<
            BackgroundJob
          >()
        ).toBe(
          job
        );

        expect(
          await queue.dequeue<
            BackgroundJob
          >()
        ).toBe(
          job
        );

        expect(
          await queue.size()
        ).toBe(
          0
        );

        await queue.enqueue(
          job
        );

        await queue.clear();

        expect(
          await queue.size()
        ).toBe(
          0
        );
      }
    );

    it(
      "dispatches a job to its registered handler",
      async () => {
        const dispatcher =
          new JobDispatcher();

        const handler =
          vi.fn(
            async () =>
              undefined
          );

        dispatcher.register(
          JOB_TYPES.PDF_EXTRACTION,
          handler
        );

        const job =
          createTestJob();

        await dispatcher.dispatch(
          job
        );

        expect(
          handler
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          handler
        ).toHaveBeenCalledWith(
          job
        );
      }
    );

    it(
  "creates a valid pending background job",
  () => {
    const job =
      createJob({
        type:
          JOB_TYPES.PDF_EXTRACTION,

        payload: {
          reportId: 100,
        },
      });

    expect(
  job.id
).toMatch(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
);

    expect(job.status).toBe(
      JOB_STATUS.PENDING
    );

    expect(job.attempts).toBe(
      0
    );

    expect(job.maxAttempts).toBe(
      3
    );

    expect(job.startedAt).toBeNull();

    expect(job.finishedAt).toBeNull();

    expect(job.lastError).toBeNull();
  }
);

    it(
      "throws when no handler is registered",
      async () => {
        const dispatcher =
          new JobDispatcher();

        const job =
          createTestJob();

        await expect(
          dispatcher.dispatch(
            job
          )
        ).rejects.toThrow(
          'No handler registered for "pdf-extraction".'
        );
      }
    );

    it(
      "marks a successfully processed job as completed",
      async () => {
        const queue =
          new InMemoryJobQueue();

        const dispatcher =
          new JobDispatcher();

        const handler =
          vi.fn(
            async () =>
              undefined
          );

        dispatcher.register(
          JOB_TYPES.PDF_EXTRACTION,
          handler
        );

        const worker =
          new JobWorker(
            queue,
            dispatcher
          );

        const job =
          createTestJob();

        await queue.enqueue(
          job
        );

        const processed =
          await worker.processNext();

        expect(
          processed
        ).toBe(
          true
        );

        expect(
          job.status
        ).toBe(
          JOB_STATUS.COMPLETED
        );

        expect(
          job.startedAt
        ).toEqual(
          expect.any(
            String
          )
        );

        expect(
          job.finishedAt
        ).toEqual(
          expect.any(
            String
          )
        );

        expect(
          job.lastError
        ).toBeNull();

        expect(
          job.attempts
        ).toBe(
          0
        );

        expect(
          await queue.size()
        ).toBe(
          0
        );
      }
    );

    it(
      "returns false when the queue is empty",
      async () => {
        const queue =
          new InMemoryJobQueue();

        const dispatcher =
          new JobDispatcher();

        const worker =
          new JobWorker(
            queue,
            dispatcher
          );

        expect(
          await worker.processNext()
        ).toBe(
          false
        );
      }
    );

    it(
      "requeues a failed job while retry attempts remain",
      async () => {
        const queue =
          new InMemoryJobQueue();

        const dispatcher =
          new JobDispatcher();

        dispatcher.register(
          JOB_TYPES.PDF_EXTRACTION,
          async () => {
            throw new Error(
              "Temporary failure"
            );
          }
        );

        const worker =
          new JobWorker(
            queue,
            dispatcher,
            new JobRetryPolicy()
          );

        const job =
          createTestJob({
            maxAttempts:
              3,
          });

        await queue.enqueue(
          job
        );

        await worker.processNext();

        expect(
          job.attempts
        ).toBe(
          1
        );

        expect(
          job.status
        ).toBe(
          JOB_STATUS.RETRYING
        );

        expect(
          job.finishedAt
        ).toBeNull();

        expect(
          job.lastError
        ).toBeNull();

        expect(
          await queue.size()
        ).toBe(
          1
        );

        expect(
          await queue.peek<
            BackgroundJob
          >()
        ).toBe(
          job
        );
      }
    );

    it(
      "marks a job as failed after the maximum attempts",
      async () => {
        const queue =
          new InMemoryJobQueue();

        const dispatcher =
          new JobDispatcher();

        dispatcher.register(
          JOB_TYPES.PDF_EXTRACTION,
          async () => {
            throw new Error(
              "Permanent failure"
            );
          }
        );

        const worker =
          new JobWorker(
            queue,
            dispatcher,
            new JobRetryPolicy()
          );

        const job =
          createTestJob({
            attempts:
              2,

            maxAttempts:
              3,
          });

        await queue.enqueue(
          job
        );

        await worker.processNext();

        expect(
          job.attempts
        ).toBe(
          3
        );

        expect(
          job.status
        ).toBe(
          JOB_STATUS.FAILED
        );

        expect(
          job.finishedAt
        ).toEqual(
          expect.any(
            String
          )
        );

        expect(
          job.lastError
        ).toBe(
          "Permanent failure"
        );

        expect(
          await queue.size()
        ).toBe(
          0
        );
      }
    );

    it(
      "runs jobs until the queue becomes empty",
      async () => {
        const queue =
          new InMemoryJobQueue();

        const dispatcher =
          new JobDispatcher();

        const handledJobIds:
          string[] = [];

        dispatcher.register(
          JOB_TYPES.PDF_EXTRACTION,
          async (
            job
          ) => {
            handledJobIds.push(
              job.id
            );
          }
        );

        const worker =
          new JobWorker(
            queue,
            dispatcher
          );

        const runner =
          new JobRunner(
            worker
          );

        const firstJob =
          createTestJob({
            id:
              "job_first",
          });

        const secondJob =
          createTestJob({
            id:
              "job_second",
          });

        await queue.enqueue(
          firstJob
        );

        await queue.enqueue(
          secondJob
        );

        const processedJobs =
          await runner.runUntilEmpty();

        expect(
          processedJobs
        ).toBe(
          2
        );

        expect(
          handledJobIds
        ).toEqual([
          "job_first",
          "job_second",
        ]);

        expect(
          firstJob.status
        ).toBe(
          JOB_STATUS.COMPLETED
        );

        expect(
          secondJob.status
        ).toBe(
          JOB_STATUS.COMPLETED
        );

        expect(
          await queue.size()
        ).toBe(
          0
        );
      }
    );

    it(
      "processes retries until the job eventually succeeds",
      async () => {
        const queue =
          new InMemoryJobQueue();

        const dispatcher =
          new JobDispatcher();

        let handlerAttempts =
          0;

        dispatcher.register(
          JOB_TYPES.PDF_EXTRACTION,
          async () => {
            handlerAttempts++;

            if (
              handlerAttempts <
              3
            ) {
              throw new Error(
                "Temporary failure"
              );
            }
          }
        );

        const worker =
          new JobWorker(
            queue,
            dispatcher
          );

        const runner =
          new JobRunner(
            worker
          );

        const job =
          createTestJob({
            maxAttempts:
              3,
          });

        await queue.enqueue(
          job
        );

        const processedJobs =
          await runner.runUntilEmpty();

        expect(
          processedJobs
        ).toBe(
          3
        );

        expect(
          handlerAttempts
        ).toBe(
          3
        );

        expect(
          job.attempts
        ).toBe(
          2
        );

        expect(
          job.status
        ).toBe(
          JOB_STATUS.COMPLETED
        );

        expect(
          job.lastError
        ).toBeNull();

        expect(
          await queue.size()
        ).toBe(
          0
        );
      }
    );
  }
);