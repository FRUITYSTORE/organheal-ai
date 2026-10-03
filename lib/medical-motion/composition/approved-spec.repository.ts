import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/validation/uuid";
import { jsonSnapshot } from "../validation/json-snapshot";
import { isIssuedApprovedSpec, validateApprovedContent, type ApprovedSpecContent, type DurableApprovedSpec } from "./approved-spec";
import { CompositionError } from "./specification";
export class ApprovedPersonalizationRepository {
  constructor(private readonly client: SupabaseClient) {}
  private row(value: unknown, owner: string): DurableApprovedSpec {
    try {
      const v = jsonSnapshot(value) as Record<string, unknown>;
      if (!v || Object.keys(v).length !== 5 || !isUuid(v.id) || !isUuid(v.job_id) || v.user_id !== owner ||
        typeof v.created_at !== "string" || !Number.isFinite(Date.parse(v.created_at))) throw Error();
      const content = validateApprovedContent(v.content);
      if (content.userId !== owner) throw Error();
      return Object.freeze({ ...content, id: v.id, jobId: v.job_id, createdAt: v.created_at });
    } catch { throw new CompositionError("COMPOSITION_INVALID"); }
  }
  async approveAndSchedule(content: ApprovedSpecContent) {
    if (!isIssuedApprovedSpec(content)) throw new CompositionError("COMPOSITION_INVALID");
    let r;
    try { r = await this.client.rpc("approve_motion_personalization", { p_user_id: content.userId, p_content: content }); }
    catch { throw new CompositionError("COMPOSITION_PROCESS_FAILED"); }
    if (r.error || !Array.isArray(r.data) || r.data.length !== 1) throw new CompositionError("COMPOSITION_PROCESS_FAILED");
    return this.row(r.data[0], content.userId);
  }
  async read(id: string, owner: string) {
    if (!isUuid(id) || !isUuid(owner)) throw new CompositionError("COMPOSITION_INVALID");
    let r;
    try { r = await this.client.rpc("read_approved_motion_personalization", { p_spec_id: id, p_user_id: owner }); }
    catch { throw new CompositionError("COMPOSITION_PROCESS_FAILED"); }
    if (r.error || !Array.isArray(r.data) || r.data.length !== 1) throw new CompositionError("COMPOSITION_INVALID");
    const result = this.row(r.data[0], owner);
    if (result.id !== id) throw new CompositionError("COMPOSITION_INVALID");
    return result;
  }
  async cancel(id: string, owner: string) {
    if (!isUuid(id) || !isUuid(owner)) throw new CompositionError("COMPOSITION_INVALID");
    const r = await this.client.rpc("cancel_motion_personalization", { p_spec_id: id, p_user_id: owner }).then(r => r, () => {
      throw new CompositionError("COMPOSITION_PROCESS_FAILED");
    });
    if (r.error || typeof r.data !== "boolean") throw new CompositionError("COMPOSITION_PROCESS_FAILED");
    return r.data;
  }
  async currentAttempt(id: string, owner: string, attempt: string, signal: AbortSignal) {
    if (![id, owner, attempt].every(isUuid)) throw new CompositionError("COMPOSITION_INVALID");
    const request = this.client.rpc("motion_composition_attempt_current", { p_spec_id: id, p_user_id: owner, p_attempt_token: attempt });
    const r = await (typeof request.abortSignal === "function" ? request.abortSignal(signal) : request);
    if (r.error || typeof r.data !== "boolean") throw new CompositionError("COMPOSITION_PROCESS_FAILED");
    return r.data;
  }
}
