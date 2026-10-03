import type { SupabaseClient } from "@supabase/supabase-js";
import { contextContent } from "./medical-motion-context";
import { sql, LocalPostgresError } from "./medical-motion-postgres";
export const literal = (value: unknown) => "'" + String(value).replaceAll("'", "''") + "'";
export function createCall(owner: string, input = contextContent()) {
  return `public.create_medical_motion_execution_context(${literal(owner)}::uuid,${literal(input.schemaVersion)},${literal(input.executionVersion)},
    ${literal(input.assetVersion)},${literal(input.clinical.message)},${literal(input.clinical.language)},${literal(JSON.stringify(input.candidatePlan))}::jsonb)`;
}
/** Direct local PostgreSQL transport with a Supabase RPC-shaped seam: the real repository
 * validates on both sides, while privileges and storage execute in PostgreSQL.
 * No HTTP or production Supabase connection is used. */
export const client = { rpc: async (name: string, p: Record<string, unknown>) => {
  try {
    let call: string;
    if(name==='motion_delivery_operation'){const r=await sql(`set role service_role;select public.motion_delivery_operation(${p.p_user_id?literal(p.p_user_id)+'::uuid':'null'},${literal(p.p_action)},${p.p_request_id?literal(p.p_request_id)+'::uuid':'null'},${p.p_input===null?'null':literal(JSON.stringify(p.p_input))+'::jsonb'});`);return {data:JSON.parse(r||'null'),error:null};}
    else if (name === "approve_motion_personalization") call = `public.approve_motion_personalization(${literal(p.p_user_id)}::uuid,${literal(JSON.stringify(p.p_content))}::jsonb)`;
    else if(name==='motion_composition_attempt_current'){const r=await sql(`set role service_role;select public.motion_composition_attempt_current(${literal(p.p_spec_id)}::uuid,${literal(p.p_user_id)}::uuid,${literal(p.p_attempt_token)}::uuid);`);return {data:r==='t',error:null};}
    else if(name==='cancel_motion_personalization'){const r=await sql(`set role service_role;select public.cancel_motion_personalization(${literal(p.p_spec_id)}::uuid,${literal(p.p_user_id)}::uuid);`);return {data:r==='t',error:null};}
    else if (name === "read_approved_motion_personalization") call = `public.read_approved_motion_personalization(${literal(p.p_spec_id)}::uuid,${literal(p.p_user_id)}::uuid)`;
    else if (name === "claim_next_background_job") call = `public.claim_next_background_job(array[${(p.p_allowed_job_types as string[]).map(literal).join(",")}])`;
    else if (name === "create_medical_motion_execution_context") call = `public.create_medical_motion_execution_context(
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
    else if (name === "motion_artifact_operation") call = `public.motion_artifact_operation(${literal(p.p_job_id)}::uuid,${literal(p.p_user_id)}::uuid,
      ${literal(p.p_attempt_token)}::uuid,${literal(p.p_action)},${p.p_artifact_id?literal(p.p_artifact_id)+"::uuid":"null"},
      ${p.p_media?literal(p.p_media):"null"},${p.p_byte_size?Number(p.p_byte_size):"null"},${p.p_sha256?literal(p.p_sha256):"null"})`;
    else if(name==="motion_reuse_operation") call=`public.motion_reuse_operation(${literal(p.p_job_id)}::uuid,${literal(p.p_user_id)}::uuid,${literal(p.p_attempt_token)}::uuid,
      ${literal(p.p_action)},${literal(JSON.stringify(p.p_identity))}::jsonb,${p.p_epoch===null?"null":Number(p.p_epoch)},${p.p_artifact_id?literal(p.p_artifact_id)+"::uuid":"null"})`;
    else if (name === "publish_background_job_result") call = `public.publish_background_job_result(${literal(p.p_job_id)}::uuid,${literal(p.p_attempt_token)}::uuid,${literal(p.p_result_kind)},${literal(p.p_reference_id)}::uuid)`;
    else if (name === "read_published_motion_artifact") call = `public.read_published_motion_artifact(${literal(p.p_job_id)}::uuid,${literal(p.p_user_id)}::uuid)`;
    else if (name === "read_motion_composition_intent") {
      const output = await sql(`set role service_role; select public.read_motion_composition_intent(${literal(p.p_job_id)}::uuid,
        ${literal(p.p_user_id)}::uuid,${literal(p.p_attempt_token)}::uuid,${literal(p.p_fingerprint)});`);
      return { data: output || null, error: null };
    }
    else if (name === "check_motion_composition_base" || name === "motion_composition_provenance") {
      const parameters = name === "check_motion_composition_base" ?
        ["p_job_id", "p_user_id", "p_attempt_token", "p_base_job_id", "p_base_artifact_id", "p_base_fingerprint", "p_output_fingerprint", "p_render_signature"] :
        ["p_job_id", "p_user_id", "p_attempt_token", "p_artifact_id", "p_base_job_id", "p_base_artifact_id", "p_context_id", "p_provenance"];
      const args = parameters.map(key => key === "p_provenance" ? `${literal(JSON.stringify(p[key]))}::jsonb` :
        ["p_base_fingerprint", "p_output_fingerprint", "p_render_signature"].includes(key) ? literal(p[key]) : `${literal(p[key])}::uuid`).join(",");
      return { data: await sql(`set role service_role; select public.${name}(${args});`) === "t", error: null };
    }
    else if (name === "resume_motion_artifact_job") {
      const output=await sql(`set role service_role; select public.resume_motion_artifact_job(${literal(p.p_job_id)}::uuid,${literal(p.p_user_id)}::uuid);`);
      return {data:output==="t",error:null};
    }
    else throw new Error();
    const output = await sql(`set role service_role; select coalesce(json_agg(row_to_json(c)), '[]'::json)::text from ${call} c;`);
    return { data: JSON.parse(output), error: null };
  } catch (error) { return { data: null, error: { code: error instanceof LocalPostgresError ? error.code : undefined, message: "Local context RPC failed." } }; }
} } as unknown as SupabaseClient;
