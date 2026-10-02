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
import { readExecutionResources } from "@/lib/medical-motion/render/execution-resources";
import { discardArtifact } from "@/lib/medical-motion/render/artifact-output";
import type { RenderMedia } from "@/lib/medical-motion/contracts/scene";

export type LocalArtifactCandidate = Readonly<{
  /** Internal invocation-owned location. Never serialize, persist or expose. */
  localPath: string;
  media: RenderMedia;
  executionSeconds: number;
  discard(): Promise<boolean>;
}>;
export type MedicalMotionHandlerOutcome = JobHandlerResult & {
  outcome: "PERMANENT" | "RETRYABLE" | "OWNERSHIP_LOST" | "EXECUTION_SUCCEEDED_AWAITING_ARTIFACT_PUBLICATION";
};
type Policy = Readonly<{
  capability: "medical-motion-render";
  mode: "production" | "development";
  /** Required trusted internal consumer owns disposal after accepting candidate.
   * Registration in the request runtime is intentionally absent. */
  acceptCandidate(candidate: LocalArtifactCandidate): Promise<void>;
  signal?: AbortSignal;
}>;
type Dependencies = {
  contexts: Pick<MedicalMotionExecutionContextRepository, "read" | "reconstruct">;
  attempts: Pick<BackgroundJobWorkerRepository, "renewLease">;
  execute: typeof executeMedicalMotionRequest;
};
const permanent = (errorCode: string): MedicalMotionHandlerOutcome => ({ disposition: "fail", outcome: "PERMANENT", errorCode });
const retryable = (errorCode: string): MedicalMotionHandlerOutcome => ({ disposition: "retry", outcome: "RETRYABLE", errorCode });
const lost = (): MedicalMotionHandlerOutcome => ({ disposition: "ownership-lost", outcome: "OWNERSHIP_LOST" });

/** Explicit render-capable server factory; no default runtime, host, route or
 * storage integration. Test seams are trusted code, never queue configuration. */
export function createMedicalMotionRenderHandler(client: SupabaseClient, policy: Policy, dependencies?: Dependencies) {
  if (policy.capability !== JOB_TYPES.MEDICAL_MOTION_RENDER || !["production", "development"].includes(policy.mode) ||
      typeof policy.acceptCandidate !== "function") throw new Error("Invalid trusted render worker policy.");
  const mode = policy.mode, acceptCandidate = policy.acceptCandidate, externalSignal = policy.signal;
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
      // No manifest/reference exists in this milestone. A programming mistake
      // cannot reach the publication repository through this boundary.
      publish: async () => { throw new Error("Artifact publication is unavailable."); },
    });
    const cancel = () => ownership.cancel();
    externalSignal?.addEventListener("abort", cancel, { once: true });
    if (externalSignal?.aborted) cancel();
    let candidate: LocalArtifactCandidate | undefined;
    try {
      const owned = await ownership.run<MedicalMotionHandlerOutcome>(async signal => {
        let outcome: MedicalMotionHandlerOutcome;
        try {
          const context = await deps.contexts.read(payload.executionContextId, job.userId);
          const input = await deps.contexts.reconstruct(payload.executionContextId, job.userId, payload.sceneIndex);
          if (signal.aborted) return { status: "succeeded", value: lost() };
          const result = await deps.execute(input, { clinicalContextId: context.id, assetVersion: context.assetVersion,
            mode, outputPath: "render.mp4" }, { signal });
          const resources = readExecutionResources(result);
          // Runtime authority, not outputPath, grants disposal/handoff rights.
          if (resources?.artifact) {
            const artifact = resources.artifact;
            const local = { localPath: artifact.outputPath, media: artifact.media,
              executionSeconds: result.status === "completed" ? result.durationSeconds : 0,
              discard: () => discardArtifact(artifact) };
            Object.defineProperty(local, "toJSON", { value: () => { throw new Error("LOCAL_ARTIFACT_NOT_SERIALIZABLE"); } });
            candidate = Object.freeze(local);
          }
          if (signal.aborted) outcome = lost();
          else if (result.status === "completed") {
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
          outcome = error instanceof ExecutionContextError && error.code === "CONTEXT_READ_FAILED"
            ? retryable("CONTEXT_READ_FAILED")
            : permanent(error instanceof ExecutionContextError ? error.code : "MOTION_HANDLER_INTERNAL_FAILURE");
        }
        return { status: "succeeded", value: outcome };
      });
      if (owned.execution !== "succeeded" || !await ownership.confirmHandoff()) {
        if (candidate) await candidate.discard();
        return lost();
      }
      if (owned.value.disposition !== "defer-completion" && candidate) await candidate.discard();
      return owned.value;
    } finally { externalSignal?.removeEventListener("abort", cancel); }
  };
}
