import {
  beforeEach,
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

function createFollowUpJob(
  overrides:
    Partial<DurableBackgroundJob> = {}
): DurableBackgroundJob {
  return {
    id:
      "job-follow-up-e2e",

    userId:
      "user-123",

    requestId:
      "req-follow-up-e2e",

    type:
      JOB_TYPES.FOLLOW_UP_DELIVERY,

    status:
      JOB_STATUS.RUNNING,

    payload: {
      delivery: {
        userId:
          "user-123",

        channel:
          "email",

        language:
          "en",

        priority:
          "medium",

        purpose:
          "repeat-checkin",

        title:
          "Add a new health check-in",

        body:
          "Complete a new health check-in.",

        actionLabel:
          "Open Check-In",

        actionHref:
          "/checkin",

        safetyNote:
          null,

        requiresImmediateDelivery:
          false,
      },

      idempotencyKey:
        "follow-up:user-123:email:repeat-checkin:2026-08-09",

      retryDelaysMinutes: [
        30,
        180,
      ],

      auditMetadata: {
        source:
          "follow-up-dispatch-adapter",

        dispatchStatus:
          "ready",

        purpose:
          "repeat-checkin",

        language:
          "en",

        messageGeneratedAt:
          "2026-08-06T17:45:00.000Z",

        dispatchPlanGeneratedAt:
          "2026-08-06T18:00:00.000Z",

        envelopeGeneratedAt:
          "2026-08-06T18:15:00.000Z",
      },
    },

    attempts:
      0,

    maxAttempts:
      3,

    availableAt:
      "2026-08-09T18:00:00.000Z",

    createdAt:
      "2026-08-06T18:00:00.000Z",

    updatedAt:
      "2026-08-09T18:00:00.000Z",

    startedAt:
      "2026-08-09T18:00:00.000Z",

    finishedAt:
      null,

    lastError:
      null,

    ...overrides,
  };
}

function createRepositoryMock() {
  return {
    recoverStaleJobs:
      vi.fn(),

    claimNext:
      vi.fn(),

    markCompleted:
      vi.fn(),

    scheduleRetry:
      vi.fn(),

    markFailed:
      vi.fn(),
  };
}

describe(
  "Durable follow-up worker integration",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks();
      }
    );

    it(
      "claims dispatches and completes a follow-up delivery job",
      async () => {
        const repository =
          createRepositoryMock();

        const job =
          createFollowUpJob();

        repository.claimNext
          .mockResolvedValue(
            job
          );

        const dispatcher =
          new JobDispatcher();

        const handler =
          vi.fn(
            async () =>
              undefined
          );

        dispatcher.register(
          JOB_TYPES.FOLLOW_UP_DELIVERY,
          handler
        );

        const worker =
          new DurableBackgroundJobWorker(
            repository as unknown as
              BackgroundJobWorkerRepository,
            dispatcher
          );

        const processed =
          await worker.processNext();

        expect(
          processed
        ).toBe(
          true
        );

        expect(
          repository.claimNext
        ).toHaveBeenCalledTimes(
          1
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

        expect(
          repository.markCompleted
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          repository.markCompleted
        ).toHaveBeenCalledWith(
          job.id
        );

        expect(
          repository.scheduleRetry
        ).not.toHaveBeenCalled();

        expect(
          repository.markFailed
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "schedules retry when follow-up delivery fails and attempts remain",
      async () => {
        const repository =
          createRepositoryMock();

        const job =
          createFollowUpJob({
            attempts:
              0,

            maxAttempts:
              3,
          });

        repository.claimNext
          .mockResolvedValue(
            job
          );

        const dispatcher =
          new JobDispatcher();

        dispatcher.register(
          JOB_TYPES.FOLLOW_UP_DELIVERY,
          async () => {
            throw new Error(
              "Temporary delivery failure"
            );
          }
        );

        const worker =
          new DurableBackgroundJobWorker(
            repository as unknown as
              BackgroundJobWorkerRepository,
            dispatcher
          );

        const processed =
          await worker.processNext();

        expect(
          processed
        ).toBe(
          true
        );

        expect(
          repository.markCompleted
        ).not.toHaveBeenCalled();

        expect(
          repository.scheduleRetry
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          repository.scheduleRetry
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            jobId:
              job.id,

            attempts:
              1,

            availableAt:
              expect.any(
                String
              ),

            errorMessage:
              "Temporary delivery failure",
          })
        );

        expect(
          repository.markFailed
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "marks the follow-up job failed when the final attempt fails",
      async () => {
        const repository =
          createRepositoryMock();

        const job =
          createFollowUpJob({
            attempts:
              2,

            maxAttempts:
              3,
          });

        repository.claimNext
          .mockResolvedValue(
            job
          );

        const dispatcher =
          new JobDispatcher();

        dispatcher.register(
          JOB_TYPES.FOLLOW_UP_DELIVERY,
          async () => {
            throw new Error(
              "Permanent delivery failure"
            );
          }
        );

        const worker =
          new DurableBackgroundJobWorker(
            repository as unknown as
              BackgroundJobWorkerRepository,
            dispatcher
          );

        const processed =
          await worker.processNext();

        expect(
          processed
        ).toBe(
          true
        );

        expect(
          repository.markCompleted
        ).not.toHaveBeenCalled();

        expect(
          repository.scheduleRetry
        ).not.toHaveBeenCalled();

        expect(
          repository.markFailed
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          repository.markFailed
        ).toHaveBeenCalledWith({
          jobId:
            job.id,

          attempts:
            3,

          errorMessage:
            "Permanent delivery failure",
        });
      }
    );
  }
);
