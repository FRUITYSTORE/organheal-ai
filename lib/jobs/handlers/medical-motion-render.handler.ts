import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobHandlerResult } from "../job-handler";
import type { DurableBackgroundJob } from "../background-job-worker.repository";
import { BackgroundJobWorkerRepository } from "../background-job-worker.repository";
import { ExecutionOwnership } from "../execution-ownership";
import { JOB_TYPES } from "../job-types";
import type { BackgroundJob } from "../job-types";
import { isUuid } from "@/lib/validation/uuid";
import { validateMedicalMotionJobPayload } from "@/lib/medical-motion/job.repository";
import { ExecutionContextError, MedicalMotionExecutionContextRepository } from "@/lib/medical-motion/execution-context.repository";
import { executeMedicalMotionRequest } from "@/lib/medical-motion/execute-medical-motion";
import { readExecutionResources, recordCandidateOwnership } from "@/lib/medical-motion/render/execution-resources";
import { discardArtifact } from "@/lib/medical-motion/render/artifact-output";
import type { RenderMedia } from "@/lib/medical-motion/contracts/scene";
import { ArtifactError, type ArtifactRecord } from "@/lib/medical-motion/artifacts/repository";
import type { MedicalMotionArtifactService } from "@/lib/medical-motion/artifacts/service";
import { BackgroundJobResultRepository } from "../background-job-result.repository";
import { prepareExplanationAuthorization } from "@/lib/symptom-explanation/explanation-authorization";
import { validateExplanationRenderRequest } from "@/lib/medical-motion/render/explanation-renderer";

export type LocalArtifactCandidate = Readonly<{
  /** Internal invocation-owned location. Never serialize, persist or expose. */
  localPath: string;
  media: RenderMedia;
  executionSeconds: number;
  discard(): Promise<boolean>;
}>;
export type MedicalMotionHandlerOutcome = JobHandlerResult & {
  outcome: "PERMANENT" | "RETRYABLE" | "OWNERSHIP_LOST" | "PUBLICATION_FINALIZED" | "EXECUTION_SUCCEEDED_AWAITING_ARTIFACT_PUBLICATION";
};
type Policy = Readonly<{
  capability: "medical-motion-render";
  mode: "production" | "development";
  /** Required trusted internal consumer owns disposal after accepting candidate.
   * Registration in the request runtime is intentionally absent. */
  acceptCandidate(candidate: LocalArtifactCandidate): Promise<void>;
  signal?: AbortSignal;
  artifacts?: MedicalMotionArtifactService;
}>;
type Dependencies = {
  contexts: Pick<MedicalMotionExecutionContextRepository, "read" | "reconstruct">;
  attempts: Pick<BackgroundJobWorkerRepository, "renewLease">;
  execute: typeof executeMedicalMotionRequest;
};
const permanent = (errorCode: string): MedicalMotionHandlerOutcome => ({ disposition: "fail", outcome: "PERMANENT", errorCode });
const retryable = (errorCode: string): MedicalMotionHandlerOutcome => ({ disposition: "retry", outcome: "RETRYABLE", errorCode });
const lost = (): MedicalMotionHandlerOutcome => ({ disposition: "ownership-lost", outcome: "OWNERSHIP_LOST" });

/** Explicit render-capable server factory; no default runtime, host or route.
 * Test seams are trusted code, never queue configuration. */
export function createMedicalMotionRenderHandler(client: SupabaseClient, policy: Policy, dependencies?: Dependencies) {
  if (policy.capability !== JOB_TYPES.MEDICAL_MOTION_RENDER || !["production", "development"].includes(policy.mode) ||
      typeof policy.acceptCandidate !== "function" || (policy.mode === "production" && !policy.artifacts)) throw new Error("Invalid trusted render worker policy.");
  const mode = policy.mode, acceptCandidate = policy.acceptCandidate, externalSignal = policy.signal, artifacts = policy.artifacts;
  const deps = dependencies ?? {
    contexts: new MedicalMotionExecutionContextRepository(client),
    attempts: new BackgroundJobWorkerRepository(client, [JOB_TYPES.MEDICAL_MOTION_RENDER]),
    execute: executeMedicalMotionRequest,
  };
  return async (value: BackgroundJob): Promise<MedicalMotionHandlerOutcome> => {
    const job = value as DurableBackgroundJob;
    let payload;
    try {
      if (job.type !== JOB_TYPES.MEDICAL_MOTION_RENDER || job.status !== "running" ||
          !isUuid(job.userId) || !isUuid(job.id) || !isUuid(job.attemptToken)) return permanent("INVALID_MOTION_JOB");
      payload = validateMedicalMotionJobPayload(job.payload);
    } catch { return permanent("INVALID_MOTION_JOB"); }
    const ownership = new ExecutionOwnership({ jobId: job.id, attemptToken: job.attemptToken }, {
      renewLease: attempt => deps.attempts.renewLease(attempt),
      // Publication is available only with the trusted durable artifact service.
      publish: request => {
        if (!artifacts) throw new Error("Artifact publication is unavailable.");
        return new BackgroundJobResultRepository(client).publish(request);
      },
    });
    const cancel = () => ownership.cancel();
    externalSignal?.addEventListener("abort", cancel, { once: true });
    if (externalSignal?.aborted) cancel();
    let candidate: LocalArtifactCandidate | undefined;
    let durable: ArtifactRecord | undefined;
    let ambiguous = false;
    try {
      const owned = await ownership.run<MedicalMotionHandlerOutcome>(async signal => {
        let outcome: MedicalMotionHandlerOutcome;
        try {
          const context = await deps.contexts.read(payload.executionContextId, job.userId);
          const input = await deps.contexts.reconstruct(payload.executionContextId, job.userId, payload.sceneIndex);
          if (signal.aborted) return { status: "succeeded", value: lost() };
          const serverOptions = { clinicalContextId: context.id, assetVersion: context.assetVersion, mode, outputPath: "render.mp4" };
          if (artifacts) {
            // Stored bytes are not clinical authority. Reuse the complete
            // current authorization/readiness gates before any recovery read.
            const prepared = prepareExplanationAuthorization({clinical:input.clinical,plan:input.plan,sceneIndex:input.sceneIndex},serverOptions);
            if (!("ok" in prepared)) return {status:"succeeded",value:permanent(prepared.errorCode)};
            const checked=validateExplanationRenderRequest(prepared.authorization,serverOptions.outputPath,{mode});
            if (!("ok" in checked)) return {status:"succeeded",value:permanent(checked.errorCode)};
            durable = await artifacts.reconcile(job, signal);
            if (durable) return { status: "succeeded", value: { disposition: "ownership-lost", outcome: "EXECUTION_SUCCEEDED_AWAITING_ARTIFACT_PUBLICATION" } };
          }
          const result = await deps.execute(input, serverOptions, { signal });
          const resources = readExecutionResources(result);
          // Runtime authority, not outputPath, grants disposal/handoff rights.
          if (resources?.artifact) {
            const artifact = resources.artifact;
            const local = { localPath: artifact.outputPath, media: artifact.media,
              executionSeconds: result.status === "completed" ? result.durationSeconds : 0,
              discard: () => discardArtifact(artifact) };
            Object.defineProperty(local, "toJSON", { value: () => { throw new Error("LOCAL_ARTIFACT_NOT_SERIALIZABLE"); } });
            candidate = Object.freeze(local);
            if (resources.dimensions) recordCandidateOwnership(candidate, artifact, resources.dimensions,
              {jobId:job.id,userId:job.userId,attemptToken:job.attemptToken});
          }
          if (signal.aborted) outcome = lost();
          else if (result.status === "completed") {
            if (artifacts && candidate) {
              durable = await artifacts.handoff(job, candidate, signal);
              return { status: "succeeded", value: { disposition: "ownership-lost", outcome: "EXECUTION_SUCCEEDED_AWAITING_ARTIFACT_PUBLICATION" } };
            }
            let settled = false;
            outcome = candidate ? { disposition: "defer-completion", outcome: "EXECUTION_SUCCEEDED_AWAITING_ARTIFACT_PUBLICATION",
              settle: async accepted => {
                if (settled) throw new Error("ARTIFACT_HANDOFF_ALREADY_SETTLED");
                settled = true;
                try {
                  if (accepted && !externalSignal?.aborted) await acceptCandidate(candidate!);
                  else await candidate!.discard();
                } catch {
                  await candidate!.discard();
                  throw new Error("ARTIFACT_HANDOFF_FAILED");
                }
              } } : permanent("ARTIFACT_OWNERSHIP_UNAVAILABLE");
          } else if (result.status === "failed") {
            // Unknown termination/cleanup is quarantined and never retryable.
            outcome = ["BLENDER_FAILED", "RENDER_TIMEOUT"].includes(result.errorCode) && resources?.cleanupConfirmed
              ? retryable(result.errorCode) : permanent(result.errorCode);
          } else outcome = permanent("INVALID_EXECUTION_RESULT");
        } catch (error) {
          if (error instanceof ArtifactError) {
            ambiguous = ["ARTIFACT_STATE_UNKNOWN", "ARTIFACT_STORAGE_UNAVAILABLE"].includes(error.code);
            outcome = error.code === "ARTIFACT_OWNERSHIP_LOST" ? lost() : ambiguous ? retryable(error.code) : permanent(error.code);
            return { status: "succeeded", value: outcome };
          }
          outcome = error instanceof ExecutionContextError && error.code === "CONTEXT_READ_FAILED"
            ? retryable("CONTEXT_READ_FAILED")
            : permanent(error instanceof ExecutionContextError ? error.code : "MOTION_HANDLER_INTERNAL_FAILURE");
        }
        return { status: "succeeded", value: outcome };
      });
      if (owned.execution !== "succeeded" || !await ownership.confirmHandoff()) {
        if (candidate && !artifacts) await candidate.discard();
        return lost();
      }
      if (durable) {
        const manifest = { kind: "artifact" as const, referenceId: durable.id };
        let publication;
        try { publication = await ownership.publish(manifest); }
        catch {
          try { publication = await ownership.publish(manifest); }
          catch { return lost(); } // no render retry; durable state reconciles after lease recovery
        }
        if (publication.outcome === "applied" || publication.outcome === "already-finalized") {
          if (candidate) await candidate.discard();
          return { disposition: "already-finalized", outcome: "PUBLICATION_FINALIZED" };
        }
        return publication.outcome === "conflict" ? permanent("ARTIFACT_CONFLICT") : lost();
      }
      if (artifacts && ambiguous) return owned.value; // retain/quarantine local candidate on unknown state
      if (owned.value.disposition !== "defer-completion" && candidate) await candidate.discard();
      return owned.value;
    } finally { externalSignal?.removeEventListener("abort", cancel); }
  };
}
