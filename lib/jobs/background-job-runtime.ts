import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  getSupabaseAdminClient,
} from "@/lib/supabase-admin";

import {
  DurableBackgroundJobRunner,
} from "@/lib/jobs/durable-background-job-runner";

import {
  DurableBackgroundJobWorker,
} from "@/lib/jobs/background-job-worker";

import {
  BackgroundJobWorkerRepository,
} from "@/lib/jobs/background-job-worker.repository";

import {
  JobDispatcher,
} from "@/lib/jobs/job-dispatcher";

import {
  createPdfExtractionHandler,
} from "@/lib/jobs/handlers/pdf-extraction.handler";

import {
  createFollowUpDeliveryHandler,
} from "@/lib/jobs/handlers/follow-up-delivery.handler";

import {
  JOB_TYPES,
} from "@/lib/jobs/job-types";

export type BackgroundJobRuntime = {
  dispatcher:
    JobDispatcher;

  repository:
    BackgroundJobWorkerRepository;

  worker:
    DurableBackgroundJobWorker;

  runner:
    DurableBackgroundJobRunner;
};

export function createBackgroundJobRuntime(
  client:
    SupabaseClient =
      getSupabaseAdminClient()
): BackgroundJobRuntime {
  const dispatcher =
    new JobDispatcher();

  dispatcher.register(
    JOB_TYPES.PDF_EXTRACTION,
    createPdfExtractionHandler(
      client
    )
  );

  dispatcher.register(
    JOB_TYPES.FOLLOW_UP_DELIVERY,
    createFollowUpDeliveryHandler(
      client
    )
  );

  const repository =
    new BackgroundJobWorkerRepository(
      client
    );

  const worker =
    new DurableBackgroundJobWorker(
      repository,
      dispatcher
    );

  const runner =
    new DurableBackgroundJobRunner(
      worker,
      repository
    );

  return {
    dispatcher,
    repository,
    worker,
    runner,
  };
}