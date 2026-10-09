import { sql as sql } from "./helpers/medical-motion-postgres";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

const databaseUrl = process.env.ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL;
function publicationFixture() {
  const user = randomUUID(), jobId = randomUUID(), reference = randomUUID();
  return { jobId, reference, fixture: `
insert into auth.users(id) values('${user}');
insert into public.background_jobs(id,user_id,job_type) values('${jobId}','${user}','follow-up-delivery');
` };
}
describe.skipIf(!databaseUrl)("Real PostgreSQL fenced publication", () => {
  it("atomically publishes, reconciles identity, rejects conflict and cannot reclaim completion", async () => {
    const { fixture, jobId, reference } = publicationFixture();
    const output = await sql(`begin; ${fixture}
do $$ declare token uuid; first_id uuid; r record; begin
 select attempt_token into token from public.claim_background_job_by_id('${jobId}');
 set local role service_role;
 select * into r from public.publish_background_job_result('${jobId}',token,'artifact','${reference}');
 if r.outcome <> 'applied' or r.result_id is null then raise exception 'Publication rejected'; end if;
 first_id := r.result_id;
 if not exists(select 1 from public.background_jobs where id='${jobId}' and status='completed'
   and lease_expires_at is null and attempt_token=token and attempts=0)
 or not exists(select 1 from public.background_job_results where id=first_id and job_id='${jobId}') then raise exception 'Atomic state missing'; end if;
 select * into r from public.publish_background_job_result('${jobId}',token,'artifact','${reference}');
 if r.outcome <> 'already-finalized' or r.result_id<>first_id then raise exception 'Replay identity changed'; end if;
 select * into r from public.publish_background_job_result('${jobId}',token,'artifact',gen_random_uuid());
 if r.outcome <> 'conflict' or r.result_id is not null then raise exception 'Conflict accepted'; end if;
 if (select count(*) from public.background_job_results where job_id='${jobId}')<>1 then raise exception 'Duplicate results'; end if;
 if exists(select 1 from public.claim_background_job_by_id('${jobId}')) then raise exception 'Completed reclaimed'; end if;
 reset role;
end $$; select 'PASSED'; rollback;`);
    expect(output).toContain("PASSED");
  });
  it("forced completion failure rolls back an inserted result and completion together", async () => {
    const { fixture, jobId, reference } = publicationFixture();
    const output = await sql(`begin; ${fixture}
create function pg_temp.reject_completion() returns trigger language plpgsql as $$ begin raise exception 'forced completion failure'; end $$;
create trigger publication_test_failure before update on public.background_jobs
for each row when (new.status='completed' and new.id='${jobId}') execute function pg_temp.reject_completion();
do $$ declare token uuid; begin
 select attempt_token into token from public.claim_background_job_by_id('${jobId}');
 begin
  perform public.publish_background_job_result('${jobId}',token,'artifact','${reference}');
  raise exception 'Expected failure absent' using errcode='22023';
 exception when raise_exception then null;
 end;
 if exists(select 1 from public.background_job_results where job_id='${jobId}') or not exists(
 select 1 from public.background_jobs where id='${jobId}' and status='running' and attempt_token=token) then raise exception 'Partial commit'; end if;
end $$; select 'PASSED'; rollback;`);
    expect(output).toContain("PASSED");
  });
  it("rejects missing, expired and superseded ownership and invalid identities", async () => {
    const { fixture, jobId, reference } = publicationFixture();
    const output = await sql(`begin; ${fixture}
do $$ declare a uuid; b uuid; r record; begin
 select * into r from public.publish_background_job_result(gen_random_uuid(),gen_random_uuid(),'artifact','${reference}');
 if r.outcome<>'ownership-lost' then raise exception 'Missing accepted'; end if;
 select attempt_token into a from public.claim_background_job_by_id('${jobId}');
 begin perform public.publish_background_job_result('${jobId}',a,'unknown','${reference}');
 raise exception 'Invalid identity accepted' using errcode='55000'; exception when invalid_parameter_value then null; end;
 update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id='${jobId}';
 select * into r from public.publish_background_job_result('${jobId}',a,'artifact','${reference}');
 if r.outcome<>'ownership-lost' then raise exception 'Expired accepted'; end if;
 perform public.recover_stale_background_jobs();
 select attempt_token into b from public.claim_background_job_by_id('${jobId}');
 if a=b then raise exception 'Token reused'; end if;
 select * into r from public.publish_background_job_result('${jobId}',a,'artifact','${reference}');
 if r.outcome<>'ownership-lost' then raise exception 'Stale accepted'; end if;
 select * into r from public.publish_background_job_result('${jobId}',b,'artifact','${reference}');
 if r.outcome<>'applied' then raise exception 'New owner rejected'; end if;
 select * into r from public.mutate_background_job_attempt('${jobId}',b,'retry');
 if r.outcome<>'ownership-lost' then raise exception 'Completed retry'; end if;
end $$; select 'PASSED'; rollback;`);
    expect(output).toContain("PASSED");
  });
  it("denies direct writes for every application role and rejects privileged row mutation", async () => {
    const { fixture, jobId, reference } = publicationFixture();
    const output = await sql(`begin; ${fixture}
do $$ declare token uuid; role_name text; begin
 select attempt_token into token from public.claim_background_job_by_id('${jobId}');
 perform public.publish_background_job_result('${jobId}',token,'artifact','${reference}');
 foreach role_name in array array['anon','authenticated','service_role'] loop
  execute format('set local role %I',role_name);
  begin insert into public.background_job_results(job_id,attempt_token,result_kind,reference_id) values('${jobId}',token,'artifact','${reference}');
  raise exception 'Direct insert accepted'; exception when insufficient_privilege then null; end;
  begin update public.background_job_results set reference_id=gen_random_uuid() where job_id='${jobId}';
  raise exception 'Direct update accepted'; exception when insufficient_privilege then null; end;
  begin delete from public.background_job_results where job_id='${jobId}';
  raise exception 'Direct delete accepted'; exception when insufficient_privilege then null; end;
  if role_name<>'service_role' then
   begin perform public.publish_background_job_result('${jobId}',token,'artifact','${reference}');
   raise exception 'Unauthorized RPC'; exception when insufficient_privilege then null; end;
  end if;
  reset role;
 end loop;
 begin update public.background_job_results set reference_id=gen_random_uuid() where job_id='${jobId}';
 raise exception 'Immutable update accepted' using errcode='22023'; exception when object_not_in_prerequisite_state then null; end;
 begin delete from public.background_job_results where job_id='${jobId}';
 raise exception 'Immutable delete accepted' using errcode='22023'; exception when object_not_in_prerequisite_state then null; end;
end $$; select 'PASSED'; rollback;`);
    expect(output).toContain("PASSED");
  });
  it("rolls back when the lease expires during result insertion", async () => {
    const { fixture, jobId, reference } = publicationFixture();
    const output = await sql(`begin; ${fixture}
create function pg_temp.delay_publication() returns trigger language plpgsql as $$ begin perform pg_sleep(0.2); return new; end $$;
create trigger publication_test_delay before insert on public.background_job_results
for each row when (new.job_id='${jobId}') execute function pg_temp.delay_publication();
do $$ declare token uuid; begin
 select attempt_token into token from public.claim_background_job_by_id('${jobId}');
 update public.background_jobs set lease_expires_at=clock_timestamp()+interval '0.1 seconds' where id='${jobId}';
 begin perform public.publish_background_job_result('${jobId}',token,'artifact','${reference}');
 raise exception 'Expired insertion accepted' using errcode='22023'; exception when object_not_in_prerequisite_state then null; end;
 if exists(select 1 from public.background_job_results where job_id='${jobId}') or not exists(select 1 from public.background_jobs
 where id='${jobId}' and status='running') then raise exception 'Expired partial commit'; end if;
end $$; select 'PASSED'; rollback;`);
    expect(output).toContain("PASSED");
  });
  it("two real connections race to publish one stable logical result", async () => {
    const user = randomUUID(), job = randomUUID(), ref = randomUUID();
    await sql(`insert into auth.users(id) values('${user}');
insert into public.background_jobs(id,user_id,job_type) values('${job}','${user}','follow-up-delivery');`);
    let first: Promise<string> | undefined;
    try {
      const token = await sql(`select attempt_token from public.claim_background_job_by_id('${job}');`);
      let signal!: () => void;
      const locked = new Promise<void>(resolve => { signal = resolve; });
      first = sql(`begin; select outcome||'|'||result_id from public.publish_background_job_result('${job}','${token}','artifact','${ref}');
select 'PUBLICATION_LOCKED';
select pg_sleep(2); commit;`, signal);
      await Promise.race([locked, first.then(() => { throw new Error("Lock marker missing."); })]);
      // A separate connection sees neither uncommitted result nor completion.
      expect(await sql(`select (select count(*) from public.background_job_results where job_id='${job}')||'|'||status
from public.background_jobs where id='${job}';`)).toBe("0|running");
      const second = await sql(`select outcome||'|'||result_id from public.publish_background_job_result('${job}','${token}','artifact','${ref}');`);
      const firstOutput = await first;
      const id = firstOutput.match(/applied\|([0-9a-f-]{36})/)?.[1];
      expect(id).toBeDefined();
      expect(second).toBe("already-finalized|" + id);
      expect(await sql(`select count(*) from public.background_job_results where job_id='${job}';`)).toBe("1");
    } finally {
      await first?.catch(() => {});
      // Administrative fixture cleanup ONLY in guarded disposable database.
      // Re-enable within the same transaction; no production retention API.
      await sql(`begin; alter table public.background_job_results disable trigger background_job_results_immutable;
delete from public.background_job_results where job_id='${job}';
alter table public.background_job_results enable trigger background_job_results_immutable;
delete from auth.users where id='${user}'; commit;`);
    }
  }, 15000);
  it("uses database time after waiting for a job lock", async () => {
    const user = randomUUID(), job = randomUUID(), ref = randomUUID();
    await sql(`insert into auth.users(id) values('${user}');
insert into public.background_jobs(id,user_id,job_type) values('${job}','${user}','follow-up-delivery');`);
    let holder: Promise<string> | undefined;
    try {
      const token = await sql(`select attempt_token from public.claim_background_job_by_id('${job}');`);
      let signal!: () => void;
      const locked = new Promise<void>(resolve => { signal = resolve; });
      holder = sql(`begin; update public.background_jobs set lease_expires_at=clock_timestamp()+interval '0.2 seconds' where id='${job}';
select 'PUBLICATION_LOCKED';
select pg_sleep(1); commit;`, signal);
      await Promise.race([locked, holder.then(() => { throw new Error("Lock marker missing."); })]);
      expect(await sql(`select outcome from public.publish_background_job_result('${job}','${token}','artifact','${ref}');`)).toBe("ownership-lost");
      await holder;
      expect(await sql(`select count(*) from public.background_job_results where job_id='${job}';`)).toBe("0");
    } finally {
      await holder?.catch(() => {});
      await sql(`delete from auth.users where id='${user}';`);
    }
  }, 15000);
});
