import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type { BackgroundJobAttempt } from "./background-job-worker.repository";
import { isUuid as uuid } from "@/lib/validation/uuid";

/** Server-generated opaque reference only. No location, clinical data or JSON. */
export type PublicationManifest = { kind: "artifact"; referenceId: string };
export type PublicationRequest = BackgroundJobAttempt & { manifest: PublicationManifest };
export type PublicationResult =
  | { outcome: "applied" | "already-finalized"; resultId: string }
  | { outcome: "ownership-lost" | "conflict"; resultId: null };

function fields(value: unknown, names: string[]): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  const keys = Reflect.ownKeys(value);
  return keys.length === names.length && keys.every(key =>
    typeof key === "string" && names.includes(key) &&
    Object.getOwnPropertyDescriptor(value, key)?.enumerable === true &&
    "value" in Object.getOwnPropertyDescriptor(value, key)!);
}

export class BackgroundJobResultRepository {
  constructor(private readonly client: SupabaseClient = getSupabaseAdminClient()) {}

  /** Replay explicitly with the identical request after a lost response.
   * Never retries execution, logs the manifest, or guesses commit state. */
  async publish(value: PublicationRequest): Promise<PublicationResult> {
    if (!fields(value, ["jobId", "attemptToken", "manifest"]) ||
      !uuid(value.jobId) || !uuid(value.attemptToken) ||
      !fields(value.manifest, ["kind", "referenceId"]) ||
      value.manifest.kind !== "artifact" || !uuid(value.manifest.referenceId)) {
      throw new Error("Invalid background job publication request.");
    }
    const { data, error } = await this.client.rpc("publish_background_job_result", {
      p_job_id: value.jobId, p_attempt_token: value.attemptToken,
      p_result_kind: value.manifest.kind, p_reference_id: value.manifest.referenceId,
    }).then(response => response, () => {
      throw new Error("Background job publication RPC failed; commit state is unknown.");
    });
    if (error) {
      // Provider errors may contain submitted values; never propagate diagnostics.
      throw new Error("Background job publication RPC failed; commit state is unknown.");
    }
    const row = Array.isArray(data) && data.length === 1 ? data[0] : null;
    if (fields(row, ["outcome", "result_id"])) {
      if ((row.outcome === "applied" || row.outcome === "already-finalized") && uuid(row.result_id)) {
        return { outcome: row.outcome, resultId: row.result_id };
      }
      if ((row.outcome === "ownership-lost" || row.outcome === "conflict") && row.result_id === null) {
        return { outcome: row.outcome, resultId: null };
      }
    }
    throw new Error("Background job publication RPC returned an invalid result; commit state is unknown.");
  }
}
