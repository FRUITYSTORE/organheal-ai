import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import { configuration, sql } from "./helpers/medical-motion-postgres";
import { client, literal } from "./helpers/medical-motion-rpc";
import { contextContent } from "./helpers/medical-motion-context";
import { MedicalMotionJobRepository } from "@/lib/medical-motion/job.repository";
import { MedicalMotionExecutionContextRepository } from "@/lib/medical-motion/execution-context.repository";
import type { MedicalMotionContextContent } from "@/lib/medical-motion/contracts/execution-context";
import { artifactSchema } from "./helpers/medical-motion-artifacts";

function call(owner:string,request:string,scene=0,c:MedicalMotionContextContent=contextContent()) {
  return `public.enqueue_medical_motion_job('${owner}','${request}',${literal(c.schemaVersion)},${literal(c.executionVersion)},
    ${literal(c.assetVersion)},${literal(c.clinical.message)},${literal(c.clinical.language)},${literal(JSON.stringify(c.candidatePlan))}::jsonb,${scene})`;
}
const passed=(body:string)=>sql(`begin; do $$ begin ${body} end $$; select 'PASSED'; rollback;`);
describe("mandatory real PostgreSQL Medical Motion durable job foundation",()=>{
  let owner:string,other:string,request:string;
  const repo=new MedicalMotionJobRepository(client), contexts=new MedicalMotionExecutionContextRepository(client);
  beforeAll(async()=>{
    configuration(); expect((await sql("show server_version;")).startsWith("17.11")).toBe(true);
    if(await sql("select to_regclass('public.medical_motion_requests') is null;")==="t") {
      await sql(readFileSync("supabase/migrations/20261002004551_medical_motion_durable_jobs.sql","utf8"));
    }
    await artifactSchema();
  });
  beforeEach(async()=>{
    owner=randomUUID();other=randomUUID();request=randomUUID();
    await sql(`insert into auth.users(id) values('${owner}'),('${other}');`);
  });
  afterEach(async()=>{
    // Guarded disposable-database administrative synthetic-fixture cleanup.
    await sql(`begin;
      alter table public.background_job_results disable trigger background_job_results_immutable;
      delete from public.background_job_results where job_id in(select id from public.background_jobs where user_id in('${owner}','${other}'));
      alter table public.background_job_results enable trigger background_job_results_immutable;
      alter table public.background_jobs disable trigger background_jobs_medical_motion_link;
      delete from public.background_jobs where user_id in('${owner}','${other}');
      alter table public.background_jobs enable trigger background_jobs_medical_motion_link;
      alter table public.medical_motion_requests disable trigger medical_motion_requests_immutable;
      delete from public.medical_motion_requests where user_id in('${owner}','${other}');
      alter table public.medical_motion_requests enable trigger medical_motion_requests_immutable;
      alter table public.medical_motion_execution_contexts disable trigger medical_motion_execution_contexts_immutable;
      delete from public.medical_motion_execution_contexts where user_id in('${owner}','${other}');
      alter table public.medical_motion_execution_contexts enable trigger medical_motion_execution_contexts_immutable;
      delete from auth.users where id in('${owner}','${other}'); commit;`);
  });
  it("atomically commits context/request/job with matching owner and database identities",async()=>{
    const result=await repo.enqueue(owner,request,contextContent(),0);
    expect(result.created).toBe(true);
    expect(await sql(`select count(*) from public.background_jobs j join public.medical_motion_execution_contexts c
      on c.id=j.execution_context_id and c.user_id=j.user_id where j.id='${result.jobId}' and c.id='${result.executionContextId}' and j.user_id='${owner}';`)).toBe("1");
    expect((await contexts.read(result.executionContextId,owner)).userId===owner).toBe(true);
  });
  it("forced job insert failure rolls back context and request mapping too",async()=>{
    expect(await sql(`begin;
      create function pg_temp.reject_motion_job() returns trigger language plpgsql as $$ begin raise exception 'Forced fixture failure'; end $$;
      create trigger motion_test_reject before insert on public.background_jobs for each row execute function pg_temp.reject_motion_job();
      do $$ begin
        begin perform ${call(owner,request)}; raise exception 'Missing failure' using errcode='22023'; exception when raise_exception then null; end;
        if exists(select 1 from public.medical_motion_execution_contexts where user_id='${owner}') or
          exists(select 1 from public.medical_motion_requests where user_id='${owner}') or exists(select 1 from public.background_jobs where user_id='${owner}') then
          raise exception 'Partial commit'; end if;
      end $$; select 'PASSED'; rollback;`)).toBe("PASSED");
  });
  it("queue contains precisely PHI-free references and reconstruction preserves content",async()=>{
    const input=contextContent(),r=await repo.enqueue(owner,request,input,0);
    expect(await sql(`select (jsonb_object_keys_count=4) from (select count(*) jsonb_object_keys_count from
      public.background_jobs j,jsonb_object_keys(j.payload) where j.id='${r.jobId}') s;`)).toBe("t");
    const p=JSON.parse(await sql(`select payload::text from public.background_jobs where id='${r.jobId}';`));
    expect(Object.keys(p).sort()).toEqual(["executionContextId","executionVersion","sceneIndex","schemaVersion"]);
    const reconstructed=await repo.reconstruct({type:"medical-motion-render",userId:owner,payload:p});
    expect(reconstructed.clinical.message===input.clinical.message).toBe(true);
  });
  it("lost-response replay returns stable context and job even after terminal status",async()=>{
    const a=await repo.enqueue(owner,request,contextContent(),0),b=await repo.enqueue(owner,request,contextContent(),0);
    expect(a.jobId===b.jobId && a.executionContextId===b.executionContextId && b.created===false).toBe(true);
    await sql(`select * from public.claim_background_job_by_id('${a.jobId}',array['medical-motion-render']);
      select * from public.mutate_background_job_attempt('${a.jobId}',(select attempt_token from public.background_jobs where id='${a.jobId}'),'fail');`);
    const c=await repo.enqueue(owner,request,contextContent(),0); expect(c.jobId===a.jobId && !c.created).toBe(true);
  });
  it.each(["message","plan","asset"])("conflicting %s replay is rejected without replacing snapshot",async field=>{
    const initial=contextContent(),a=await repo.enqueue(owner,request,initial,0),changed=contextContent();
    if(field==="message") changed.clinical.message="changed synthetic input";
    if(field==="plan") (changed.candidatePlan as Record<string,unknown>).topic="changed synthetic topic";
    if(field==="asset") changed.assetVersion="other-version";
    expect(await passed(`begin perform ${call(owner,request,0,changed)}; raise exception 'Conflict accepted';
      exception when sqlstate 'OM409' then null; end;`)).toBe("PASSED");
    await expect(repo.enqueue(owner,request,changed,0)).rejects.toThrow(/^MOTION_JOB_CONFLICT$/);
    expect((await contexts.read(a.executionContextId,owner)).clinical.message===initial.clinical.message).toBe(true);
  });
  it("new scene shares immutable revision but receives distinct logical work",async()=>{
    const a=await repo.enqueue(owner,request,contextContent(),0),b=await repo.enqueue(owner,request,contextContent(),1);
    expect(a.executionContextId===b.executionContextId && a.jobId!==b.jobId).toBe(true);
    const replay=await repo.enqueue(owner,request,contextContent(),1); expect(replay.jobId===b.jobId && !replay.created).toBe(true);
  });
  it("different request/content creates a new immutable revision",async()=>{
    const a=await repo.enqueue(owner,request,contextContent(),0),input=contextContent();input.clinical.message="changed synthetic input";
    const b=await repo.enqueue(owner,randomUUID(),input,0); expect(a.executionContextId!==b.executionContextId && a.jobId!==b.jobId).toBe(true);
  });
  it("same request identity is owner-scoped; cross-owner reconstruction is denied",async()=>{
    const a=await repo.enqueue(owner,request,contextContent(),0),b=await repo.enqueue(other,request,contextContent(),0);
    expect(a.executionContextId!==b.executionContextId).toBe(true);
    await expect(contexts.read(a.executionContextId,other)).rejects.toThrow("CONTEXT_NOT_FOUND");
  });
  it.each(["cross-user","missing","malformed"])("rejects %s context/payload linkage",async kind=>{
    const c=await contexts.create(owner,contextContent()),ctx=kind==="missing"?randomUUID():c.id;
    const user=kind==="cross-user"?other:owner;
    const p=JSON.stringify({schemaVersion:"1",executionVersion:"1",executionContextId:ctx,sceneIndex:0,...(kind==="malformed"?{clinical:"synthetic"}:{})});
    expect(await passed(`begin insert into public.background_jobs(user_id,job_type,execution_context_id,payload)
      values('${user}','medical-motion-render','${ctx}',${literal(p)}::jsonb); raise exception 'Invalid link accepted';
      exception when invalid_parameter_value then null; end;`)).toBe("PASSED");
  });
  it("durable FK prevents deletion of a context linked to work",async()=>{
    const r=await repo.enqueue(owner,request,contextContent(),0);
    expect(await sql(`begin; alter table public.medical_motion_execution_contexts disable trigger medical_motion_execution_contexts_immutable;
      do $$ begin begin delete from public.medical_motion_execution_contexts where id='${r.executionContextId}';
      raise exception 'FK deletion accepted'; exception when foreign_key_violation then null; end; end $$;
      select 'PASSED'; rollback;`)).toBe("PASSED");
  });
  it("unsupported execution version is rejected instead of substituting current policy",async()=>{
    const input=contextContent(); input.executionVersion="2" as "1";
    expect(await passed(`begin perform ${call(owner,request,0,input)}; raise exception 'Version accepted'; exception when invalid_parameter_value then null; end;`)).toBe("PASSED");
    await expect(repo.enqueue(owner,request,input,0)).rejects.toThrow("INVALID_CONTEXT");
  });
  it.each(["anon","authenticated"])("%s cannot invoke atomic enqueue",async role=>{
    expect(await sql(`begin; set local role ${role}; do $$ begin begin perform ${call(owner,request)};
      raise exception 'Client enqueue accepted'; exception when insufficient_privilege then null; end; end $$; select 'PASSED'; rollback;`)).toBe("PASSED");
  });
  it("service-role cannot directly insert render work or read request mappings",async()=>{
    const c=await contexts.create(owner,contextContent());
    expect(await sql(`begin; set local role service_role; do $$ begin
      begin insert into public.background_jobs(user_id,job_type,execution_context_id,payload) values('${owner}','medical-motion-render','${c.id}',
      jsonb_build_object('schemaVersion','1','executionVersion','1','executionContextId','${c.id}','sceneIndex',0));
      raise exception 'Direct enqueue accepted'; exception when insufficient_privilege then null; end;
      begin perform 1 from public.medical_motion_requests; raise exception 'Mapping read accepted'; exception when insufficient_privilege then null; end;
      end $$; select 'PASSED'; rollback;`)).toBe("PASSED");
  });
  it("legacy/request capabilities cannot claim render jobs via next or by ID",async()=>{
    const r=await repo.enqueue(owner,request,contextContent(),0);
    expect(await sql(`select count(*) from public.claim_next_background_job();`)).toBe("0");
    expect(await sql(`select count(*) from public.claim_background_job_by_id('${r.jobId}');`)).toBe("0");
    expect(await sql(`select count(*) from public.claim_next_background_job(array['pdf-extraction','follow-up-delivery']);`)).toBe("0");
    expect(await sql(`select count(*) from public.claim_background_job_by_id('${r.jobId}',array['pdf-extraction']);`)).toBe("0");
  });
  it("explicit Blender capability claims render work with attempt fencing",async()=>{
    const r=await repo.enqueue(owner,request,contextContent(),0);
    expect(await sql(`select count(*) from public.claim_background_job_by_id('${r.jobId}',array['medical-motion-render']) where attempt_token is not null and lease_expires_at>clock_timestamp();`)).toBe("1");
  });
  it.each(["pdf-extraction","follow-up-delivery"])("normal %s work remains claimable",async type=>{
    const id=randomUUID();await sql(`insert into public.background_jobs(id,user_id,job_type) values('${id}','${owner}','${type}');`);
    expect(await sql(`select id from public.claim_next_background_job();`)).toBe(id);
  });
  it("workers with different capability sets cannot take each other's pending work",async()=>{
    const r=await repo.enqueue(owner,request,contextContent(),0),pdf=randomUUID();
    await sql(`insert into public.background_jobs(id,user_id,job_type) values('${pdf}','${owner}','pdf-extraction');`);
    const claims=await Promise.all([sql("select job_type from public.claim_next_background_job(array['medical-motion-render']);"),sql("select job_type from public.claim_next_background_job(array['pdf-extraction']);")]);
    expect(claims).toEqual(["medical-motion-render","pdf-extraction"]);
    expect(await sql(`select count(*) from public.claim_background_job_by_id('${r.jobId}',array['pdf-extraction']);`)).toBe("0");
  });
  it("two connections enqueue one logical revision/work while uncommitted rows remain invisible",async()=>{
    let signal!:()=>void;const locked=new Promise<void>(resolve=>{signal=resolve;});
    const first=sql(`begin; select row_to_json(r)::text from ${call(owner,request)} r;
select 'JOB_LOCKED';
select pg_sleep(1); commit;`,signal);
    await Promise.race([locked,first.then(()=>{throw new Error("Missing fixture lock marker.");})]);
    expect(await sql(`select count(*) from public.medical_motion_execution_contexts where user_id='${owner}';`)).toBe("0");
    expect(await sql(`select count(*) from public.background_jobs where user_id='${owner}';`)).toBe("0");
    const second=repo.enqueue(owner,request,contextContent(),0);
    const firstOutput=await first,r=JSON.parse(firstOutput.split(/\r?\n/)[0]),replay=await second;
    expect(replay.jobId===r.job_id && replay.executionContextId===r.execution_context_id && !replay.created).toBe(true);
    expect(await sql(`select count(*) from public.background_jobs where user_id='${owner}';`)).toBe("1");
    expect(await sql(`select count(*) from public.medical_motion_execution_contexts where user_id='${owner}';`)).toBe("1");
  },15000);
  it("recovery cannot bypass capabilities and fences out the expired attempt",async()=>{
    const r=await repo.enqueue(owner,request,contextContent(),0);
    expect(await sql(`begin; do $$ declare old_token uuid; fresh_token uuid; result record; begin
      select attempt_token into old_token from public.claim_background_job_by_id('${r.jobId}',array['medical-motion-render']);
      update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id='${r.jobId}';
      perform public.recover_stale_background_jobs();
      if exists(select 1 from public.claim_background_job_by_id('${r.jobId}')) then raise exception 'Recovery bypass'; end if;
      select attempt_token into fresh_token from public.claim_background_job_by_id('${r.jobId}',array['medical-motion-render']);
      if old_token=fresh_token then raise exception 'Token reused'; end if;
      select * into result from public.mutate_background_job_attempt('${r.jobId}',old_token,'complete');
      if result.outcome<>'ownership-lost' then raise exception 'Old attempt accepted'; end if;
      end $$; select 'PASSED'; rollback;`)).toBe("PASSED");
  });
  it("Step 4 fenced publication still applies atomically to explicitly claimed work",async()=>{
    const r=await repo.enqueue(owner,request,contextContent(),0);
    expect(await sql(`begin; do $$ declare token uuid; result record; item public.medical_motion_artifacts%rowtype; begin
      select attempt_token into token from public.claim_background_job_by_id('${r.jobId}',array['medical-motion-render']);
      select * into item from public.motion_artifact_operation('${r.jobId}','${owner}',token,'reserve',null,'video',100,repeat('a',64));
      perform public.motion_artifact_operation('${r.jobId}','${owner}',token,'persist',item.id);
      select * into result from public.publish_background_job_result('${r.jobId}',token,'artifact',item.id);
      if result.outcome<>'applied' or not exists(select 1 from public.background_jobs where id='${r.jobId}' and status='completed') then raise exception 'Publication regression'; end if;
      end $$; select 'PASSED'; rollback;`)).toBe("PASSED");
  });
  it("rejects invalid capabilities and null by-ID without claiming other work",async()=>{
    await repo.enqueue(owner,request,contextContent(),0);
    expect(await passed(`begin perform public.claim_next_background_job(array['unknown']); raise exception 'Invalid capability accepted'; exception when invalid_parameter_value then null; end;`)).toBe("PASSED");
    expect(await sql("select count(*) from public.claim_background_job_by_id(null,array['medical-motion-render']);")).toBe("0");
    expect(await sql("select count(*) from public.claim_background_job_by_id(null);")).toBe("0");
  });
  it("unique logical identity blocks duplicate direct work even under privileged fixture writes",async()=>{
    const r=await repo.enqueue(owner,request,contextContent(),0);
    expect(await passed(`begin insert into public.background_jobs(user_id,job_type,payload,execution_context_id)
      select user_id,job_type,payload,execution_context_id from public.background_jobs where id='${r.jobId}';
      raise exception 'Duplicate accepted'; exception when unique_violation then null; end;`)).toBe("PASSED");
  });
  it("logical context/job/request identities cannot be mutated or deleted",async()=>{
    const r=await repo.enqueue(owner,request,contextContent(),0);
    expect(await passed(`begin update public.background_jobs set payload=payload||'{"sceneIndex":1}' where id='${r.jobId}';
      raise exception 'Job mutation accepted' using errcode='22023'; exception when object_not_in_prerequisite_state then null; end;
      begin delete from public.background_jobs where id='${r.jobId}'; raise exception 'Job deletion accepted' using errcode='22023'; exception when object_not_in_prerequisite_state then null; end;
      begin update public.medical_motion_requests set request_id=gen_random_uuid() where user_id='${owner}';
      raise exception 'Mapping mutation accepted' using errcode='22023'; exception when object_not_in_prerequisite_state then null; end;`)).toBe("PASSED");
  });
});
