import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BackgroundJobWorkerRepository, type DurableBackgroundJob } from "@/lib/jobs/background-job-worker.repository";
import { DurableBackgroundJobWorker } from "@/lib/jobs/background-job-worker";
import { JobDispatcher } from "@/lib/jobs/job-dispatcher";
import { ApprovedPersonalizationRepository } from "./approved-spec.repository";
import { validateCompositionJobPayload } from "./approved-spec";
import { executeOwnedComposition } from "./operation";
import type { MedicalMotionCompositionService } from "./service";
import { CompositionError } from "./specification";
import type { JobHandlerResult } from "@/lib/jobs/job-handler";

/** Explicit long-lived server capability only. Never registered with request/cron workers.
 * Existing host can poll this runtime alongside render; no additional OS service. */
export function createCompositionJobRuntime(client: SupabaseClient, service: MedicalMotionCompositionService,
  policy: { concurrency: number; signal: AbortSignal; observeJob?: (id: string) => (result?: JobHandlerResult) => void }) {
  if (!Number.isSafeInteger(policy.concurrency) || policy.concurrency < 1 || policy.concurrency > 4) throw Error("INVALID_COMPOSITION_CAPACITY");
  const repository = new BackgroundJobWorkerRepository(client, ["medical-motion-compose"]);
  const specs = new ApprovedPersonalizationRepository(client), dispatcher = new JobDispatcher();
  const controllers = new Map<string, AbortController>();
  const counters = { executions: 0, published: 0, ownershipLost: 0, failures: 0 };
  dispatcher.register("medical-motion-compose", async claimed => {
    const job = claimed as DurableBackgroundJob;
    const done = policy.observeJob?.(job.id);
    const controller = new AbortController(); controllers.set(job.id, controller); counters.executions++;
    const signal = AbortSignal.any([policy.signal, controller.signal]);
    let stopped = false, timer: ReturnType<typeof setTimeout> | undefined, checking: Promise<void> | undefined;
    const watch = (specId: string) => {
      const check = async () => {
        if (stopped || signal.aborted) return;
        try { if (!await specs.currentAttempt(specId, job.userId, job.attemptToken, AbortSignal.any([signal, AbortSignal.timeout(10000)]))) controller.abort(); }
        catch { if (!stopped) controller.abort(); }
        if (!stopped && !signal.aborted) timer = setTimeout(() => { checking = check(); }, 1000);
      };
      timer = setTimeout(() => { checking = check(); }, 1000);
    };
    try {
      const spec = await specs.read(validateCompositionJobPayload(job.payload).approvedPersonalizationSpecId, job.userId);
      if (spec.jobId !== job.id) return { disposition: "fail", errorCode: "COMPOSITION_SPEC_JOB_MISMATCH" };
      watch(spec.id);
      const result = await executeOwnedComposition(client, service, job, spec.baseJobId, spec.specification, signal);
      if (result.outcome === "applied" || result.outcome === "already-finalized") { counters.published++; return { disposition: "already-finalized" }; }
      if (result.outcome === "ownership-lost" || signal.aborted) { counters.ownershipLost++; return { disposition: "ownership-lost" }; }
      counters.failures++;
      const transient = ["ARTIFACT_STATE_UNKNOWN", "ARTIFACT_STORAGE_UNAVAILABLE", "COMPOSITION_PROCESS_FAILED", "COMPOSITION_TIMEOUT"];
      return { disposition: transient.includes(result.errorCode ?? "") ? "retry" : "fail", errorCode: result.errorCode ?? "COMPOSITION_FAILED" };
    } catch (error) { return signal.aborted ? { disposition: "ownership-lost" } : error instanceof CompositionError && error.code === "COMPOSITION_INVALID"
      ? { disposition: "fail", errorCode: "COMPOSITION_APPROVED_SPEC_UNAVAILABLE" }
      : { disposition: "retry", errorCode: "COMPOSITION_REPLAY_UNAVAILABLE" }; }
    finally { stopped = true; clearTimeout(timer); await checking; controllers.delete(job.id); done?.(); }
  });
  const worker = new DurableBackgroundJobWorker(repository, dispatcher);
  let active = 0;
  const bounded = async (run: () => Promise<boolean>) => {
    if (policy.signal.aborted || active >= policy.concurrency) return false;
    active++;
    try { return await run(); } finally { active--; }
  };
  return { repository, dispatcher, specs, processNext: () => bounded(() => worker.processNext()),
    processById: (id: string) => bounded(() => worker.processById(id)),
    recover: () => repository.recoverStaleJobs({ maximumJobs: 10 }),
    cancel: async (id: string, owner: string) => { const spec = await specs.read(id, owner);
      const cancelled = await specs.cancel(id, owner); if (cancelled) controllers.get(spec.jobId)?.abort(); return cancelled; },
    metrics: () => Object.freeze({ ...counters }),
    capacity: () => Object.freeze({ active, maximum: policy.concurrency, databaseMaximum: 4 }) };
}
