import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { configuration, sql } from "./helpers/medical-motion-postgres";
import { literal } from "./helpers/medical-motion-rpc";
import { contextContent } from "./helpers/medical-motion-context";

const migration="supabase/migrations/20261002012033_medical_motion_handler_pending.sql";
describe("mandatory PostgreSQL pending artifact execution safety",()=>{
  beforeAll(async()=>{
    configuration();expect((await sql("show server_version;")).startsWith("17.11")).toBe(true);
    if(await sql("select to_regprocedure('public.defer_background_job_completion(uuid,uuid)') is null;")==="t") await sql(readFileSync(migration,"utf8"));
  });
  async function check(body:string){
    const owner=randomUUID(),request=randomUUID(),c=contextContent();
    const output=await sql(`begin; do $test$ declare queued record; claimed public.background_jobs%rowtype; other public.background_jobs%rowtype; r record; n integer; begin
      insert into auth.users(id) values('${owner}');
      select * into queued from public.enqueue_medical_motion_job('${owner}','${request}','1','1',${literal(c.assetVersion)},
        ${literal(c.clinical.message)},'en',${literal(JSON.stringify(c.candidatePlan))}::jsonb,0);
      select * into claimed from public.claim_background_job_by_id(queued.job_id,array['medical-motion-render']);
      ${body}
      end $test$; select 'PASSED'; rollback;`);
    expect(output).toBe("PASSED");
  }
  const defer="select * into r from public.defer_background_job_completion(claimed.id,claimed.attempt_token);";
  it("fenced defer retains token without completion/result/path",()=>check(`${defer}
    if r.outcome<>'applied' or r.job_status<>'awaiting-artifact-publication' then raise exception 'defer failed'; end if;
    if not exists(select 1 from public.background_jobs where id=claimed.id and finished_at is null and lease_expires_at is null
      and attempt_token=claimed.attempt_token and attempts=0 and last_error is null and payload=claimed.payload) then raise exception 'state invalid'; end if;
    if exists(select 1 from public.background_job_results where job_id=claimed.id) then raise exception 'premature publication'; end if;`));
  it("identical lost-response replay reconciles",()=>check(`${defer} ${defer}
    if r.outcome<>'already-finalized' then raise exception 'replay failed'; end if;`));
  it("pending work cannot be claimed by ID or next",()=>check(`${defer}
    if exists(select 1 from public.claim_background_job_by_id(claimed.id,array['medical-motion-render'])) or
      exists(select 1 from public.claim_next_background_job(array['medical-motion-render'])) then raise exception 'pending reclaimed'; end if;`));
  it("recovery ignores publication-pending state",()=>check(`${defer}
    select * into r from public.recover_stale_background_jobs();
    if r.recovered_retrying<>0 or r.recovered_failed<>0 then raise exception 'pending recovered'; end if;`));
  it.each(["renew","complete","retry","fail"])("existing %s cannot exit pending state",action=>check(`${defer}
    select * into r from public.mutate_background_job_attempt(claimed.id,claimed.attempt_token,'${action}');
    if r.outcome<>'ownership-lost' then raise exception 'pending mutated'; end if;`));
  it("Step 4 publication cannot use pending token",()=>check(`${defer}
    select * into r from public.publish_background_job_result(claimed.id,claimed.attempt_token,'artifact',gen_random_uuid());
    if r.outcome<>'ownership-lost' then raise exception 'premature publish'; end if;`));
  it("wrong token cannot defer",()=>check(`select * into r from public.defer_background_job_completion(claimed.id,gen_random_uuid());
    if r.outcome<>'ownership-lost' then raise exception 'stale defer'; end if;`));
  it("expired lease cannot defer",()=>check(`update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id=claimed.id;
    ${defer} if r.outcome<>'ownership-lost' then raise exception 'expired defer'; end if;`));
  it("permanent failure is terminal",()=>check(`select * into r from public.mutate_background_job_attempt(claimed.id,claimed.attempt_token,'fail',0,'UNSAFE_FOR_VIDEO_FIRST');
    if r.job_status<>'failed' then raise exception 'permanent retried'; end if;
    if exists(select 1 from public.claim_background_job_by_id(claimed.id,array['medical-motion-render'])) then raise exception 'failed reclaimed'; end if;`));
  it("retry respects fencing after reclaim",()=>check(`select * into r from public.mutate_background_job_attempt(claimed.id,claimed.attempt_token,'retry',0,'RENDER_TIMEOUT');
    if r.job_status<>'retrying' then raise exception 'retry invalid'; end if;
    perform public.claim_background_job_by_id(claimed.id,array['medical-motion-render']);
    select * into r from public.mutate_background_job_attempt(claimed.id,claimed.attempt_token,'fail',0,'OLD');
    if r.outcome<>'ownership-lost' then raise exception 'old token accepted'; end if;`));
  it.each(["anon","authenticated"])("%s cannot invoke defer",role=>check(`execute 'set local role ${role}';
    begin perform public.defer_background_job_completion(claimed.id,claimed.attempt_token); raise exception 'client allowed';
    exception when insufficient_privilege then null; end; execute 'reset role';`));
  it("default request capability cannot claim render",()=>check(`select * into r from public.mutate_background_job_attempt(claimed.id,claimed.attempt_token,'retry',0,'RENDER_TIMEOUT');
    if exists(select 1 from public.claim_background_job_by_id(claimed.id)) or exists(select 1 from public.claim_next_background_job()) then raise exception 'request claimed render'; end if;`));
  it("legacy handlers cannot defer",()=>check(`insert into public.background_jobs(user_id,job_type,payload) values(claimed.user_id,'pdf-extraction','{}') returning * into other;
    select * into other from public.claim_background_job_by_id(other.id);
    select * into r from public.defer_background_job_completion(other.id,other.attempt_token);
    if r.outcome<>'ownership-lost' then raise exception 'legacy deferred'; end if;`));
});
