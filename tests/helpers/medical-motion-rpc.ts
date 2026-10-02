import type { SupabaseClient } from "@supabase/supabase-js";
import { contextContent } from "./medical-motion-context";
import { sql, LocalPostgresError } from "./medical-motion-postgres";
export const literal = (value: unknown) => "'" + String(value).replaceAll("'", "''") + "'";
export function createCall(owner: string, input = contextContent()) {
  return `public.create_medical_motion_execution_context(${literal(owner)}::uuid,${literal(input.schemaVersion)},${literal(input.executionVersion)},
    ${literal(input.assetVersion)},${literal(input.clinical.message)},${literal(input.clinical.language)},${literal(JSON.stringify(input.candidatePlan))}::jsonb)`;
}
/** Existing psql approach with a Supabase RPC-shaped seam: the real repository
 * validates on both sides, while privileges and storage execute in PostgreSQL.
 * No HTTP or production Supabase connection is used. */
export const client = { rpc: async (name: string, p: Record<string, unknown>) => {
  try {
    let call: string;
    if (name === "create_medical_motion_execution_context") call = `public.create_medical_motion_execution_context(
      ${literal(p.p_user_id)}::uuid,${literal(p.p_schema_version)},${literal(p.p_execution_version)},${literal(p.p_asset_version)},
      ${literal(p.p_clinical_message)},${literal(p.p_clinical_language)},${literal(JSON.stringify(p.p_candidate_plan))}::jsonb)`;
    else if (name === "read_medical_motion_execution_context") call = `public.read_medical_motion_execution_context(${literal(p.p_context_id)}::uuid,${literal(p.p_user_id)}::uuid)`;
    else if (name === "enqueue_medical_motion_job") call = `public.enqueue_medical_motion_job(
      ${literal(p.p_user_id)}::uuid,${literal(p.p_request_id)}::uuid,${literal(p.p_schema_version)},${literal(p.p_execution_version)},
      ${literal(p.p_asset_version)},${literal(p.p_clinical_message)},${literal(p.p_clinical_language)},${literal(JSON.stringify(p.p_candidate_plan))}::jsonb,${Number(p.p_scene_index)})`;
    else if (name === "mutate_background_job_attempt") call = `public.mutate_background_job_attempt(
      ${literal(p.p_job_id)}::uuid,${literal(p.p_attempt_token)}::uuid,${literal(p.p_action)},${Number(p.p_retry_delay_ms ?? 0)},
      ${p.p_error_message === null || p.p_error_message === undefined ? "null" : literal(p.p_error_message)})`;
    else if (name === "defer_background_job_completion") call = `public.defer_background_job_completion(${literal(p.p_job_id)}::uuid,${literal(p.p_attempt_token)}::uuid)`;
    else if (name === "claim_background_job_by_id") call = `public.claim_background_job_by_id(${literal(p.p_job_id)}::uuid,
      array[${(p.p_allowed_job_types as string[]).map(literal).join(",")}])`;
    else throw new Error();
    const output = await sql(`set role service_role; select coalesce(json_agg(row_to_json(c)), '[]'::json)::text from ${call} c;`);
    return { data: JSON.parse(output), error: null };
  } catch (error) { return { data: null, error: { code: error instanceof LocalPostgresError ? error.code : undefined, message: "Local context RPC failed." } }; }
} } as unknown as SupabaseClient;
