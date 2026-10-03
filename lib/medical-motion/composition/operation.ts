import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BackgroundJobWorkerRepository, type DurableBackgroundJob } from "@/lib/jobs/background-job-worker.repository";
import { BackgroundJobResultRepository } from "@/lib/jobs/background-job-result.repository";
import { ExecutionOwnership } from "@/lib/jobs/execution-ownership";
import type { MedicalMotionCompositionService } from "./service";
import { CompositionError } from "./specification";
import { ArtifactError } from "../artifacts/repository";
/** Trusted opt-in operation. No registration in the installed worker/service, no public endpoint. */
export async function executeOwnedComposition(client: SupabaseClient, service: MedicalMotionCompositionService,
  job: DurableBackgroundJob, baseJobId: string, specification: unknown, externalSignal: AbortSignal) {
  const attempts = new BackgroundJobWorkerRepository(client, [job.type === "medical-motion-compose" ? "medical-motion-compose" : "medical-motion-render"]);
  const results = new BackgroundJobResultRepository(client);
  const ownership = new ExecutionOwnership({ jobId: job.id, attemptToken: job.attemptToken }, {
    renewLease: attempt => attempts.renewLease(attempt), publish: request => results.publish(request),
  });
  const cancel = () => ownership.cancel(); externalSignal.addEventListener("abort", cancel, { once: true });
  if (externalSignal.aborted) cancel();
  try {
    let failureCode: string | undefined;
    const owned = await ownership.run<Awaited<ReturnType<MedicalMotionCompositionService["compose"]>>>(async signal => {
      try { return { status: "succeeded" as const, value: await service.compose(job, baseJobId, specification, signal) }; }
      catch (error) {
        failureCode = error instanceof CompositionError || error instanceof ArtifactError ? error.code : "COMPOSITION_INTERNAL_FAILURE";
        return { status: "failed" as const };
      }
    });
    if (owned.execution === "failed") return { outcome: "failed" as const, errorCode: failureCode };
    if (owned.execution !== "succeeded" || !await ownership.confirmHandoff()) return { outcome: "ownership-lost" as const };
    await service.assertCurrent(job, baseJobId, specification,
      { artifactId: owned.value.artifact.id, fingerprint: owned.value.fingerprint }, ownership.signal);
    const manifest = { kind: "artifact" as const, referenceId: owned.value.artifact.id };
    let publication;
    try { publication = await ownership.publish(manifest); }
    catch { publication = await ownership.publish(manifest); }
    return { outcome: publication.outcome, artifactId: owned.value.artifact.id, fingerprint: owned.value.fingerprint };
  } finally { externalSignal.removeEventListener("abort", cancel); }
}
