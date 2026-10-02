import "server-only";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
const literal=(value:unknown)=>"'"+String(value).replaceAll("'","''")+"'";
/** Isolated workstation transport only. No HTTP DB client or production fallback.
 * Implements the existing RPC contract, not a queue/ownership abstraction. */
export function createIsolatedMotionDatabase(env:NodeJS.ProcessEnv){
  let url:URL;try{url=new URL(env.ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL!);}catch{throw Error("INVALID_ISOLATED_DATABASE");}
  const executable=env.ORGANHEAL_TEST_PSQL;
  if(!["postgres:","postgresql:"].includes(url.protocol)||!["localhost","127.0.0.1"].includes(url.hostname)||
    url.pathname!=="/organheal_ownership_test_step3c"||!executable||!existsSync(executable))throw Error("INVALID_ISOLATED_DATABASE");
  async function query(input:string):Promise<string>{
    return new Promise((resolve,reject)=>{
      const child=spawn(executable!,["-X","-w","-q","-A","-t","-v","ON_ERROR_STOP=1","-v","VERBOSITY=sqlstate","-h",url.hostname,
        "-p",url.port||"5432","-U",decodeURIComponent(url.username),"-d",url.pathname.slice(1)],
        {windowsHide:true,env:{...env,PGPASSWORD:decodeURIComponent(url.password),PGOPTIONS:"-c statement_timeout=7000",PGCONNECT_TIMEOUT:"5"}});
      let output="",code:string|undefined;const deadline=setTimeout(()=>{child.kill();reject(Error("ISOLATED_DATABASE_TIMEOUT"));},10000);
      child.stdout.on("data",chunk=>{output+=String(chunk);if(output.length>2*1024*1024){child.kill();reject(Error("ISOLATED_DATABASE_RESPONSE_INVALID"));}});
      child.stderr.on("data",chunk=>{code=String(chunk).match(/ERROR:\s+([0-9A-Z]{5})\b/)?.[1]??code;});
      child.on("error",()=>{clearTimeout(deadline);reject(Error("ISOLATED_DATABASE_UNAVAILABLE"));});
      child.on("close",status=>{clearTimeout(deadline);status===0?resolve(output.trim()):reject(Object.assign(Error("ISOLATED_DATABASE_RPC_FAILED"),{code}));});
      child.stdin.on("error",()=>{});child.stdin.end("set standard_conforming_strings=on;\n"+input);
    });
  }
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
  return {client,readiness:async()=>{
    const version=await query("show server_version;");if(!version.startsWith("17.11"))throw Error("ISOLATED_DATABASE_VERSION_REQUIRED");
    const schema=await query("select to_regclass('public.medical_motion_artifacts') is not null and to_regprocedure('public.resume_motion_worker_pending(integer)') is not null;");
    if(schema!=="t")throw Error("WORKER_SCHEMA_UNAVAILABLE");return true;
  }};
}
