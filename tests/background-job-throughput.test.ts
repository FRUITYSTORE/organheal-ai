import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  JOB_STATUS,
  JOB_TYPES,
} from "@/lib/jobs/job-types";

import {
  JobDispatcher,
} from "@/lib/jobs/job-dispatcher";

import {
  DurableBackgroundJobWorker,
} from "@/lib/jobs/background-job-worker";

import {
  DurableBackgroundJobRunner,
} from "@/lib/jobs/durable-background-job-runner";

import type {
  BackgroundJobWorkerRepository,
  DurableBackgroundJob,
} from "@/lib/jobs/background-job-worker.repository";

vi.mock(
  "@/lib/api/api-logger",
  () => ({
    logApiError:
      vi.fn(),
  })
);

const JOB_COUNT =
  100;

function createJob(
  index:
    number
): DurableBackgroundJob {
  return {
    id:
      `throughput-job-${index}`,

    userId:
      "throughput-user",

    requestId:
      `throughput-request-${index}`,

    type:
      JOB_TYPES.FOLLOW_UP_DELIVERY,

    status:
      JOB_STATUS.RUNNING,

    payload: {
      index,
    },

    attempts:
      0,

    maxAttempts:
      3,

    availableAt:
      "2026-08-24T00:00:00.000Z",

    createdAt:
      "2026-08-24T00:00:00.000Z",

    updatedAt:
      "2026-08-24T00:00:00.000Z",

    startedAt:
      "2026-08-24T00:00:00.000Z",

    finishedAt:
      null,

    lastError:
      null,
  };
}

describe(
  "Durable background-job controlled throughput",
  () => {
    it(
      "processes 100 queued jobs exactly once without loss or failure",
      async () => {
        const jobs =
          Array.from(
            {
              length:
                JOB_COUNT,
            },
            (
              _,
              index
            ) =>
              createJob(
                index + 1
              )
          );

        const queue =
          [...jobs];

        const completedIds:
          string[] = [];

        const dispatchedIds:
          string[] = [];

        const repository = {
          recoverStaleJobs:
            vi.fn(
              async () => ({
                recoveredRetrying:
                  0,

                recoveredFailed:
                  0,
              })
            ),

          claimNext:
            vi.fn(
              async () =>
                queue.shift() ??
                null
            ),

          markCompleted:
            vi.fn(
              async (
                jobId:
                  string
              ) => {
                completedIds.push(
                  jobId
                );
              }
            ),

          scheduleRetry:
            vi.fn(),

          markFailed:
            vi.fn(),
        };

        const dispatcher =
          new JobDispatcher();

        dispatcher.register(
          JOB_TYPES.FOLLOW_UP_DELIVERY,
          async (
            job
          ) => {
            dispatchedIds.push(
              job.id
            );
          }
        );

        const worker =
          new DurableBackgroundJobWorker(
            repository as unknown as
              BackgroundJobWorkerRepository,
            dispatcher
          );

        const runner =
          new DurableBackgroundJobRunner(
            worker,
            repository as unknown as
              BackgroundJobWorkerRepository
          );

        const startedAt =
          performance.now();

        const result =
          await runner.runBatch(
            JOB_COUNT
          );

        const elapsedMs =
          performance.now() -
          startedAt;

        const uniqueDispatchedIds =
          new Set(
            dispatchedIds
          );

        const uniqueCompletedIds =
          new Set(
            completedIds
          );

        expect(
          result.processedJobs
        ).toBe(
          JOB_COUNT
        );

        expect(
          result.reachedLimit
        ).toBe(
          true
        );

        expect(
          result.recoveredRetrying
        ).toBe(
          0
        );

        expect(
          result.recoveredFailed
        ).toBe(
          0
        );

        expect(
          dispatchedIds
        ).toHaveLength(
          JOB_COUNT
        );

        expect(
          completedIds
        ).toHaveLength(
          JOB_COUNT
        );

        expect(
          uniqueDispatchedIds.size
        ).toBe(
          JOB_COUNT
        );

        expect(
          uniqueCompletedIds.size
        ).toBe(
          JOB_COUNT
        );

        expect(
          repository.scheduleRetry
        ).not.toHaveBeenCalled();

        expect(
          repository.markFailed
        ).not.toHaveBeenCalled();

        expect(
          queue
        ).toHaveLength(
          0
        );

        console.log(
          JSON.stringify({
            event:
              "background_job_throughput_test",

            jobs:
              JOB_COUNT,

            processedJobs:
              result.processedJobs,

            uniqueDispatched:
              uniqueDispatchedIds.size,

            uniqueCompleted:
              uniqueCompletedIds.size,

            failures:
              repository
                .markFailed
                .mock
                .calls
                .length,

            retries:
              repository
                .scheduleRetry
                .mock
                .calls
                .length,

            elapsedMs:
              Number(
                elapsedMs.toFixed(
                  2
                )
              ),

            jobsPerSecond:
              elapsedMs > 0
                ? Number(
                    (
                      JOB_COUNT /
                      (
                        elapsedMs /
                        1000
                      )
                    ).toFixed(
                      2
                    )
                  )
                : null,
          })
        );
           }
    );

    it(
      "processes 100 jobs across 5 concurrent workers without duplicate claims",
      async () => {
        const workerCount =
          5;

        const jobs =
          Array.from(
            {
              length:
                JOB_COUNT,
            },
            (
              _,
              index
            ) =>
              createJob(
                index + 1
              )
          );

        const queue =
          [...jobs];

        const claimedIds =
          new Set<string>();

        const completedIds =
          new Set<string>();

        const duplicateClaims:
          string[] = [];

        const repository = {
          recoverStaleJobs:
            vi.fn(
              async () => ({
                recoveredRetrying:
                  0,

                recoveredFailed:
                  0,
              })
            ),

          claimNext:
            vi.fn(
              async () => {
                const job =
                  queue.shift() ??
                  null;

                if (!job) {
                  return null;
                }

                if (
                  claimedIds.has(
                    job.id
                  )
                ) {
                  duplicateClaims.push(
                    job.id
                  );
                }

                claimedIds.add(
                  job.id
                );

                return job;
              }
            ),

          markCompleted:
            vi.fn(
              async (
                jobId:
                  string
              ) => {
                completedIds.add(
                  jobId
                );
              }
            ),

          scheduleRetry:
            vi.fn(),

          markFailed:
            vi.fn(),
        };

        const dispatcher =
          new JobDispatcher();

        dispatcher.register(
          JOB_TYPES.FOLLOW_UP_DELIVERY,
          async () => {
            await Promise.resolve();
          }
        );

        const workers =
          Array.from(
            {
              length:
                workerCount,
            },
            () =>
              new DurableBackgroundJobWorker(
                repository as unknown as
                  BackgroundJobWorkerRepository,
                dispatcher
              )
          );

        const startedAt =
          performance.now();

        const workerResults =
          await Promise.all(
            workers.map(
              async (
                worker
              ) => {
                let processed =
                  0;

                while (
                  await worker.processNext()
                ) {
                  processed++;
                }

                return processed;
              }
            )
          );

        const elapsedMs =
          performance.now() -
          startedAt;

        const totalProcessed =
          workerResults.reduce(
            (
              total,
              processed
            ) =>
              total +
              processed,
            0
          );

        expect(
          totalProcessed
        ).toBe(
          JOB_COUNT
        );

        expect(
          claimedIds.size
        ).toBe(
          JOB_COUNT
        );

        expect(
          completedIds.size
        ).toBe(
          JOB_COUNT
        );

        expect(
          duplicateClaims
        ).toHaveLength(
          0
        );

        expect(
          queue
        ).toHaveLength(
          0
        );

        expect(
          repository.scheduleRetry
        ).not.toHaveBeenCalled();

        expect(
          repository.markFailed
        ).not.toHaveBeenCalled();

        console.log(
          JSON.stringify({
            event:
              "background_job_concurrency_test",

            workers:
              workerCount,

            jobs:
              JOB_COUNT,

            totalProcessed,

            uniqueClaims:
              claimedIds.size,

            uniqueCompleted:
              completedIds.size,

            duplicateClaims:
              duplicateClaims.length,

            failures:
              repository
                .markFailed
                .mock
                .calls
                .length,

            elapsedMs:
              Number(
                elapsedMs.toFixed(
                  2
                )
              ),
          })
        );
      }
    );
  }
);