import "server-only";
import { isolatedPostgresTarget, isolatedPostgresQuery } from "./postgres-transport";
import type { SupabaseClient } from "@supabase/supabase-js";
const literal=(value:unknown)=>"'"+String(value).replaceAll("'","''")+"'";
/** Isolated workstation transport only. No HTTP DB client or production fallback.
 * Implements the existing RPC contract, not a queue/ownership abstraction. */
export function createIsolatedMotionDatabase(env:NodeJS.ProcessEnv){
  isolatedPostgresTarget(env);
  const query=(input:string)=>isolatedPostgresQuery(env,input);
  const client={rpc:async(name:string,p:Record<string,unknown>)=>{
    try{
      let call:string;
      const motionTypes=()=>{if(JSON.stringify(p.p_allowed_job_types)!=='["medical-motion-render"]')throw Error();return "array['medical-motion-render']";};
      if(name==="claim_next_background_job")call=`public.claim_next_background_job(${motionTypes()})`;
      else if(name==="claim_background_job_by_id")call=`public.claim_background_job_by_id(${literal(p.p_job_id)}::uuid,${motionTypes()})`;
      else if(name==="read_medical_motion_execution_context")call=`public.read_medical_motion_execution_context(${literal(p.p_context_id)}::uuid,${literal(p.p_user_id)}::uuid)`;
      else if(name==="mutate_background_job_attempt")call=`public.mutate_background_job_attempt(${literal(p.p_job_id)}::uuid,${literal(p.p_attempt_token)}::uuid,${literal(p.p_action)},${Number(p.p_retry_delay_ms??0)},${p.p_error_message?literal(p.p_error_message):"null"})`;
      else if(name==="defer_background_job_completion")call=`public.defer_background_job_completion(${literal(p.p_job_id)}::uuid,${literal(p.p_attempt_token)}::uuid)`;
      else if(name==="motion_artifact_operation")call=`public.motion_artifact_operation(${literal(p.p_job_id)}::uuid,${literal(p.p_user_id)}::uuid,${literal(p.p_attempt_token)}::uuid,${literal(p.p_action)},${p.p_artifact_id?literal(p.p_artifact_id)+"::uuid":"null"},${p.p_media?literal(p.p_media):"null"},${p.p_byte_size?Number(p.p_byte_size):"null"},${p.p_sha256?literal(p.p_sha256):"null"})`;
      else if(name==="publish_background_job_result")call=`public.publish_background_job_result(${literal(p.p_job_id)}::uuid,${literal(p.p_attempt_token)}::uuid,${literal(p.p_result_kind)},${literal(p.p_reference_id)}::uuid)`;
      else if(name==="read_published_motion_artifact")call=`public.read_published_motion_artifact(${literal(p.p_job_id)}::uuid,${literal(p.p_user_id)}::uuid)`;
      else if(name==="recover_stale_background_jobs")call=`public.recover_stale_background_jobs(1800,${Number(p.p_maximum_jobs)})`;
      else if(name==="resume_motion_artifact_job"){const r=await query(`set role service_role;select public.resume_motion_artifact_job(${literal(p.p_job_id)}::uuid,${literal(p.p_user_id)}::uuid);`);return {data:r==="t",error:null};}
      else if(name==="resume_motion_worker_pending")call=`public.resume_motion_worker_pending(${Number(p.p_limit)})`;
      else throw Error();
      return {data:JSON.parse(await query(`set role service_role;select coalesce(json_agg(row_to_json(c)),'[]'::json)::text from (select * from ${call}) c;`)),error:null};
    }catch(error){const code=(error as {code?:string}).code;return {data:null,error:{code:code&&/^[0-9A-Z]{5}$/.test(code)?code:undefined,message:"Isolated worker RPC unavailable."}};}
  }} as unknown as SupabaseClient;
  return {client,operationalQueueHealth:async()=>{
    const value=JSON.parse(await query("begin read only;set local role service_role;select json_build_object('waitingCount',count(*),'oldestWaitingMs',coalesce(greatest(0,extract(epoch from (clock_timestamp()-min(created_at)))*1000),0))::text from public.background_jobs where job_type='medical-motion-render' and status in ('pending','retrying') and available_at<=clock_timestamp();commit;"));
    if(!Number.isSafeInteger(value.waitingCount)||value.waitingCount<0||!Number.isFinite(value.oldestWaitingMs)||value.oldestWaitingMs<0)throw Error("INVALID_QUEUE_HEALTH");
    return {waitingCount:value.waitingCount,oldestWaitingMs:value.oldestWaitingMs};
  },readiness:async()=>{
    const version=await query("show server_version;");if(!version.startsWith("17.11"))throw Error("ISOLATED_DATABASE_VERSION_REQUIRED");
    const schema=await query("select to_regclass('public.medical_motion_artifacts') is not null and to_regprocedure('public.resume_motion_worker_pending(integer)') is not null;");
    if(schema!=="t")throw Error("WORKER_SCHEMA_UNAVAILABLE");return true;
  }};
}
