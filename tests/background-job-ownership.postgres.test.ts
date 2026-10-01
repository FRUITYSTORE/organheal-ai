import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

// Opt in only against a dedicated, empty LOCAL database with the existing
// schema and the ownership migration already applied. Never auto-deploy.
// Set ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL and optionally ORGANHEAL_TEST_PSQL.
const databaseUrl = process.env.ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL;
function runSql(sql: string, onLocked?: () => void): Promise<string> {
  const url = new URL(databaseUrl!);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !/^\/organheal_ownership_test[a-z0-9_]*$/.test(url.pathname)) {
    throw new Error("Ownership integration tests require a dedicated local test database.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.ORGANHEAL_TEST_PSQL ?? "psql", [
      "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1",
      "-h", url.hostname, "-p", url.port || "5432",
      "-U", decodeURIComponent(url.username), "-d", url.pathname.slice(1),
    ], { env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password), PGOPTIONS: "-c statement_timeout=5000" }, windowsHide: true });
    let output = "";
    let diagnostics = "";
    let notified = false;
    child.stdout.on("data", chunk => {
      output += String(chunk);
      if (onLocked && !notified && output.includes("OWNERSHIP_LOCK_HELD")) {
        notified = true;
        onLocked();
      }
    });
    child.stderr.on("data", chunk => { diagnostics += String(chunk); });
    child.on("error", () => reject(new Error("Cannot start local PostgreSQL test client.")));
    child.on("close", code => code === 0 ? resolve(output) : reject(new Error("PostgreSQL ownership assertion failed: " + diagnostics)));
    child.stdin.end(sql);
  });
}
describe.skipIf(!databaseUrl)("PostgreSQL ownership integration (requires isolated local database)", () => {
  it("proves database claim/recovery/fencing, lease and attempt invariants", async () => {
    const output = await runSql(`
begin;
do $test$
declare user_id uuid := gen_random_uuid(); job_id uuid := gen_random_uuid();
  first_claim public.background_jobs%rowtype; second_claim public.background_jobs%rowtype;
  result record; action text; current_lease timestamptz;
begin
  if exists (select 1 from public.background_jobs) then raise exception 'Test database must be empty'; end if;
  insert into auth.users(id) values (user_id);
  insert into public.background_jobs(id,user_id,job_type,payload) values(job_id,user_id,'follow-up-delivery','{}');
  select * into first_claim from public.claim_next_background_job();
  if first_claim.id is distinct from job_id or first_claim.attempt_token is null
    or first_claim.lease_expires_at <= clock_timestamp() or first_claim.attempts <> 0 then raise exception 'Invalid initial claim'; end if;
  if exists(select 1 from public.claim_background_job_by_id(job_id)) then raise exception 'Double claim'; end if;
  select * into result from public.mutate_background_job_attempt(job_id,first_claim.attempt_token,'renew');
  if result.outcome <> 'applied' then raise exception 'Current renewal rejected'; end if;
  select lease_expires_at into current_lease from public.background_jobs where id=job_id;
  if current_lease < first_claim.lease_expires_at then raise exception 'Lease shortened'; end if;
  update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id=job_id;
  foreach action in array array['renew','complete','retry','fail'] loop
    select * into result from public.mutate_background_job_attempt(job_id,first_claim.attempt_token,action);
    if result.outcome <> 'ownership-lost' then raise exception 'Expired ownership accepted'; end if;
  end loop;
  perform public.recover_stale_background_jobs();
  if not exists(select 1 from public.background_jobs where id=job_id and status='retrying'
    and attempts=1 and attempt_token is null and lease_expires_at is null) then raise exception 'Recovery invariant'; end if;
  select * into second_claim from public.claim_background_job_by_id(job_id);
  if second_claim.attempt_token is null or second_claim.attempt_token=first_claim.attempt_token then raise exception 'Token reused'; end if;
  foreach action in array array['renew','complete','retry','fail'] loop
    select * into result from public.mutate_background_job_attempt(job_id,first_claim.attempt_token,action);
    if result.outcome <> 'ownership-lost' then raise exception 'Stale owner accepted'; end if;
  end loop;
  select * into result from public.mutate_background_job_attempt(job_id,second_claim.attempt_token,'complete');
  if result.outcome <> 'applied' or result.job_status <> 'completed' then raise exception 'Current completion rejected'; end if;
  select * into result from public.mutate_background_job_attempt(job_id,second_claim.attempt_token,'complete');
  if result.outcome <> 'already-finalized' then raise exception 'Completion replay'; end if;
  foreach action in array array['renew','retry','fail'] loop
    select * into result from public.mutate_background_job_attempt(job_id,second_claim.attempt_token,action);
    if result.outcome <> 'ownership-lost' then raise exception 'Finalized job mutated'; end if;
  end loop;
  delete from public.background_jobs where id=job_id;
  insert into public.background_jobs(id,user_id,job_type,payload,attempts,max_attempts)
    values(job_id,user_id,'follow-up-delivery','{}',2,3);
  select * into first_claim from public.claim_background_job_by_id(job_id);
  select * into result from public.mutate_background_job_attempt(job_id,first_claim.attempt_token,'retry');
  if result.job_status <> 'failed' or not exists(select 1 from public.background_jobs where id=job_id and attempts=3) then raise exception 'Retry max attempts'; end if;
  if exists(select 1 from public.claim_background_job_by_id(job_id)) then raise exception 'Exhausted claim'; end if;
  delete from public.background_jobs where id=job_id;
  insert into public.background_jobs(id,user_id,job_type,payload,attempts,max_attempts)
    values(job_id,user_id,'follow-up-delivery','{}',3,3);
  if exists(select 1 from public.claim_next_background_job())
    or exists(select 1 from public.claim_background_job_by_id(job_id)) then raise exception 'Exhausted pending claim'; end if;
  delete from public.background_jobs where id=job_id;
  insert into public.background_jobs(id,user_id,job_type,payload) values(job_id,user_id,'follow-up-delivery','{}');
  select * into first_claim from public.claim_background_job_by_id(job_id);
  select * into result from public.mutate_background_job_attempt(job_id,first_claim.attempt_token,'retry',30000);
  if result.outcome <> 'applied' or result.job_status <> 'retrying'
    or not exists(select 1 from public.background_jobs where id=job_id and attempts=1
      and lease_expires_at is null and available_at > clock_timestamp()+interval '25 seconds') then raise exception 'Retry counter/delay'; end if;
  select * into result from public.mutate_background_job_attempt(job_id,first_claim.attempt_token,'retry',30000);
  if result.outcome <> 'already-finalized'
    or not exists(select 1 from public.background_jobs where id=job_id and attempts=1) then raise exception 'Retry replay incremented attempts'; end if;
  update public.background_jobs set available_at=clock_timestamp()-interval '1 second' where id=job_id;
  select * into second_claim from public.claim_next_background_job();
  select * into result from public.mutate_background_job_attempt(job_id,second_claim.attempt_token,'fail');
  if result.outcome <> 'applied' or result.job_status <> 'failed'
    or not exists(select 1 from public.background_jobs where id=job_id and attempts=2) then raise exception 'Current failure rejected'; end if;
  delete from public.background_jobs where id=job_id;
  insert into public.background_jobs(id,user_id,job_type,payload,attempts,max_attempts)
    values(job_id,user_id,'follow-up-delivery','{}',2,3);
  select * into first_claim from public.claim_next_background_job();
  update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id=job_id;
  perform public.recover_stale_background_jobs();
  if not exists(select 1 from public.background_jobs where id=job_id and status='failed' and attempts=3 and attempt_token is null) then raise exception 'Recovery max attempts'; end if;
  if has_table_privilege('service_role','public.background_jobs','UPDATE') then raise exception 'Direct update bypass'; end if;
  if has_function_privilege('anon','public.mutate_background_job_attempt(uuid,uuid,text,integer,text)','EXECUTE')
    or has_function_privilege('authenticated','public.mutate_background_job_attempt(uuid,uuid,text,integer,text)','EXECUTE')
    or not has_function_privilege('service_role','public.mutate_background_job_attempt(uuid,uuid,text,integer,text)','EXECUTE')
    then raise exception 'Ownership RPC permissions'; end if;
end $test$;
select 'OWNERSHIP_INVARIANTS_PASSED';
rollback;
`);
    expect(output).toContain("OWNERSHIP_INVARIANTS_PASSED");
  }, 15000);

  it("proves competing PostgreSQL connections cannot claim the same locked row", async () => {
    const userId = randomUUID(), jobId = randomUUID();
    await runSql(`do $$ begin if exists(select 1 from public.background_jobs) then raise exception 'Test database must be empty'; end if; end $$;
insert into auth.users(id) values('${userId}');
insert into public.background_jobs(id,user_id,job_type,payload) values('${jobId}','${userId}','follow-up-delivery','{}');`);
    try {
      let resolveLocked!: () => void;
      const locked = new Promise<void>(resolve => { resolveLocked = resolve; });
      const first = runSql(`begin;
select attempt_token from public.claim_background_job_by_id('${jobId}');
\\echo OWNERSHIP_LOCK_HELD
select pg_sleep(2);
commit;`, resolveLocked);
      await Promise.race([locked, first.then(() => { throw new Error("Lock marker missing"); })]);
      const competing = await runSql(`select count(*) from public.claim_background_job_by_id('${jobId}');`);
      expect(competing.trim()).toBe("0");
      const output = await first;
      expect(output).toMatch(/[a-f0-9]{8}-[a-f0-9-]{27,}/);
      expect((await runSql(`select count(*) from public.claim_background_job_by_id('${jobId}');`)).trim()).toBe("0");
    } finally {
      await runSql(`delete from public.background_jobs where id='${jobId}'; delete from auth.users where id='${userId}';`);
    }
  }, 15000);
});
