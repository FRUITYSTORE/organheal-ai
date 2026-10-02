import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { isUuid } from "@/lib/validation/uuid";
import { jsonSnapshot } from "./validation/json-snapshot";
import { MAX_MEDICAL_MOTION_SCENE_INDEX, type MedicalMotionJobPayload } from "./contracts/job";
import { MedicalMotionExecutionContextRepository, validateMedicalMotionContextContent } from "./execution-context.repository";
import { JOB_TYPES, type JobType } from "@/lib/jobs/job-types";

export class MedicalMotionJobError extends Error {
  constructor(readonly code: "INVALID_MOTION_JOB" | "MOTION_JOB_CONFLICT" | "MOTION_JOB_ENQUEUE_FAILED" | "INVALID_MOTION_JOB_RESULT") {
    super(code); this.name = "MedicalMotionJobError";
  }
}
function invalid(): never { throw new MedicalMotionJobError("INVALID_MOTION_JOB"); }
export function validateMedicalMotionJobPayload(value: unknown): MedicalMotionJobPayload {
  try {
    const input = jsonSnapshot(value);
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length !== 4 ||
      Object.keys(input).some(key => !["schemaVersion", "executionContextId", "executionVersion", "sceneIndex"].includes(key)) ||
      input.schemaVersion !== "1" || input.executionVersion !== "1" || !isUuid(input.executionContextId) ||
      typeof input.sceneIndex !== "number" || !Number.isSafeInteger(input.sceneIndex) || input.sceneIndex < 0 ||
      input.sceneIndex > MAX_MEDICAL_MOTION_SCENE_INDEX) return invalid();
    return { ...input, executionContextId: input.executionContextId.toLowerCase() } as MedicalMotionJobPayload;
  } catch { return invalid(); }
}
export type EnqueuedMedicalMotionJob = { jobId: string; executionContextId: string; created: boolean };

export class MedicalMotionJobRepository {
  constructor(private readonly client: SupabaseClient = getSupabaseAdminClient()) {}

  /** Server-issued stable UUID identifies a revision; retain it after a lost
   * response. Same revision/new scene reuses context. Changed content needs a
   * new UUID; conflicting reuse never overwrites or automatically retries. */
  async enqueue(trustedUserId: string, serverRequestId: string, value: unknown, sceneIndex: number): Promise<EnqueuedMedicalMotionJob> {
    if (!isUuid(trustedUserId) || !isUuid(serverRequestId)) return invalid();
    const content = validateMedicalMotionContextContent(value);
    validateMedicalMotionJobPayload({ schemaVersion: "1", executionVersion: content.executionVersion,
      executionContextId: serverRequestId, sceneIndex });
    let response;
    let conflict = false;
    try {
      response = await this.client.rpc("enqueue_medical_motion_job", { p_user_id: trustedUserId.toLowerCase(),
        p_request_id: serverRequestId.toLowerCase(), p_schema_version: content.schemaVersion,
        p_execution_version: content.executionVersion, p_asset_version: content.assetVersion,
        p_clinical_message: content.clinical.message, p_clinical_language: content.clinical.language,
        p_candidate_plan: content.candidatePlan, p_scene_index: sceneIndex });
      if (response.error) {
        conflict = response.error.code === "OM409";
        throw new Error();
      }
    } catch {
      throw new MedicalMotionJobError(conflict ? "MOTION_JOB_CONFLICT" : "MOTION_JOB_ENQUEUE_FAILED");
    }
    try {
      const data = jsonSnapshot(response.data);
      if (!Array.isArray(data) || data.length !== 1) throw new Error();
      const row = data[0];
      if (!row || typeof row !== "object" || Array.isArray(row) || Object.keys(row).length !== 3 ||
        Object.keys(row).some(key => !["job_id", "execution_context_id", "created"].includes(key)) ||
        !isUuid(row.job_id) || !isUuid(row.execution_context_id) || typeof row.created !== "boolean") throw new Error();
      return { jobId: row.job_id.toLowerCase(), executionContextId: row.execution_context_id.toLowerCase(), created: row.created };
    } catch { throw new MedicalMotionJobError("INVALID_MOTION_JOB_RESULT"); }
  }

  /** Non-executing preparation. Trusted claimed row identity is separate from
   * payload; context lookup always matches job owner. Does not mint authority. */
  async reconstruct(job: { type: JobType; userId: string; payload: unknown }) {
    if (job.type !== JOB_TYPES.MEDICAL_MOTION_RENDER || !isUuid(job.userId)) return invalid();
    const payload = validateMedicalMotionJobPayload(job.payload);
    return new MedicalMotionExecutionContextRepository(this.client).reconstruct(payload.executionContextId, job.userId, payload.sceneIndex);
  }
}
