-- Deploy with old workers drained. Handler side effects remain unfenced.
begin;
alter table public.background_jobs
  add column attempt_token uuid,
  add column lease_expires_at timestamptz;

-- Existing running rows receive ownership unavailable to old binaries; their
-- original start time determines recovery, including already stale rows.
update public.background_jobs
set attempt_token = gen_random_uuid(),
    lease_expires_at = coalesce(started_at, clock_timestamp()) + interval '30 minutes',
    finished_at = null
where status = 'running';

alter table public.background_jobs add constraint background_jobs_ownership_consistency
check ((status = 'running' and attempt_token is not null and lease_expires_at is not null and finished_at is null)
    or (status <> 'running' and lease_expires_at is null));
create index background_jobs_running_lease_idx
on public.background_jobs (lease_expires_at, created_at) where status = 'running';

create or replace function public.claim_next_background_job()
returns setof public.background_jobs
language plpgsql security definer set search_path = public as $$
declare claimed_id uuid; db_time timestamptz;
begin
  select j.id into claimed_id from public.background_jobs j
  where j.status in ('pending', 'retrying') and j.available_at <= clock_timestamp()
    and j.attempts < j.max_attempts
  order by j.available_at, j.created_at
  limit 1 for update skip locked;
  if claimed_id is null then return; end if;
  db_time := clock_timestamp();
  return query update public.background_jobs j set status = 'running',
    attempt_token = gen_random_uuid(), lease_expires_at = db_time + interval '30 minutes',
    started_at = db_time, finished_at = null, updated_at = db_time
  where j.id = claimed_id returning j.*;
end $$;

create or replace function public.claim_background_job_by_id(p_job_id uuid)
returns setof public.background_jobs
language plpgsql security definer set search_path = public as $$
declare claimed_id uuid; db_time timestamptz;
begin
  select j.id into claimed_id from public.background_jobs j
  where j.id = p_job_id and j.status in ('pending', 'retrying')
    and j.available_at <= clock_timestamp() and j.attempts < j.max_attempts
  for update skip locked;
  if claimed_id is null then return; end if;
  db_time := clock_timestamp();
  return query update public.background_jobs j set status = 'running',
    attempt_token = gen_random_uuid(), lease_expires_at = db_time + interval '30 minutes',
    started_at = db_time, finished_at = null, updated_at = db_time
  where j.id = claimed_id returning j.*;
end $$;

create or replace function public.mutate_background_job_attempt(
  p_job_id uuid, p_attempt_token uuid, p_action text,
  p_retry_delay_ms integer default 0, p_error_message text default null
)
returns table (outcome text, job_status text, lease_expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare owned public.background_jobs%rowtype; db_time timestamptz; next_count integer;
begin
  if p_action is null or p_action not in ('renew', 'complete', 'retry', 'fail') then
    raise exception 'Invalid background job ownership action';
  end if;
  select j.* into owned from public.background_jobs j where j.id = p_job_id for update;
  if not found or p_attempt_token is null or owned.attempt_token is distinct from p_attempt_token then
    return query select 'ownership-lost'::text, null::text, null::timestamptz;
    return;
  end if;
  if (p_action = 'complete' and owned.status = 'completed')
    or (p_action = 'retry' and owned.status = 'retrying')
    or (p_action = 'fail' and owned.status = 'failed') then
    return query select 'already-finalized'::text, owned.status, null::timestamptz;
    return;
  end if;
  -- Read time AFTER acquiring the lock; transaction-start time can be stale.
  db_time := clock_timestamp();
  if owned.status <> 'running' or owned.lease_expires_at <= db_time then
    return query select 'ownership-lost'::text, null::text, null::timestamptz;
    return;
  end if;
  next_count := least(owned.attempts + 1, owned.max_attempts);
  update public.background_jobs j set
    status = case when p_action = 'renew' then 'running'
      when p_action = 'complete' then 'completed'
      when p_action = 'fail' or next_count >= owned.max_attempts then 'failed'
      else 'retrying' end,
    attempts = case when p_action in ('retry', 'fail') then next_count else j.attempts end,
    lease_expires_at = case when p_action = 'renew' then db_time + interval '30 minutes' else null end,
    available_at = case when p_action = 'retry' and next_count < owned.max_attempts
      then db_time + make_interval(secs => least(greatest(coalesce(p_retry_delay_ms, 0), 0), 900000) / 1000.0)
      else j.available_at end,
    started_at = case when p_action = 'retry' then null else j.started_at end,
    finished_at = case when p_action = 'complete' or p_action = 'fail'
      or (p_action = 'retry' and next_count >= owned.max_attempts) then db_time else null end,
    last_error = case when p_action = 'complete' then null
      when p_action in ('retry', 'fail') then p_error_message else j.last_error end,
    updated_at = db_time
  where j.id = owned.id
  returning j.* into owned;
  return query select 'applied'::text, owned.status, owned.lease_expires_at;
end $$;

create or replace function public.recover_stale_background_jobs(
  p_stale_after_seconds integer default 1800, p_maximum_jobs integer default 10
)
returns table (recovered_retrying integer, recovered_failed integer)
language plpgsql security definer set search_path = public as $$
declare owned public.background_jobs%rowtype; db_time timestamptz;
  retrying_count integer := 0; failed_count integer := 0; next_count integer;
begin
  -- Legacy parameter retained for callers; lease expiry is authoritative.
  for owned in select j.* from public.background_jobs j
    where j.status = 'running' and j.lease_expires_at <= clock_timestamp()
    order by j.lease_expires_at, j.created_at
    limit least(greatest(coalesce(p_maximum_jobs, 10), 1), 100)
    for update skip locked
  loop
    db_time := clock_timestamp();
    next_count := least(owned.attempts + 1, owned.max_attempts);
    update public.background_jobs j set
      status = case when next_count >= owned.max_attempts then 'failed' else 'retrying' end,
      attempts = next_count, attempt_token = null, lease_expires_at = null,
      available_at = case when next_count < owned.max_attempts then db_time else j.available_at end,
      started_at = null,
      finished_at = case when next_count >= owned.max_attempts then db_time else null end,
      last_error = 'Background job execution lease expired.',
      updated_at = db_time
    where j.id = owned.id;
    if next_count >= owned.max_attempts then
      failed_count := failed_count + 1;
      -- Preserve existing PDF recovery behavior; report writes are not fenced
      -- against handler side effects and require a separate integration step.
      if owned.job_type = 'pdf-extraction' and owned.report_id is not null then
        update public.uploaded_lab_files set extraction_status = 'Failed' where id = owned.report_id;
      end if;
    else retrying_count := retrying_count + 1;
    end if;
  end loop;
  return query select retrying_count, failed_count;
end $$;

-- Prevent ID-only state updates by old service-role binaries.
revoke update on public.background_jobs from public, anon, authenticated, service_role;
revoke all on function public.claim_next_background_job() from public, anon, authenticated;
revoke all on function public.claim_background_job_by_id(uuid) from public, anon, authenticated;
revoke all on function public.mutate_background_job_attempt(uuid, uuid, text, integer, text) from public, anon, authenticated;
revoke all on function public.recover_stale_background_jobs(integer, integer) from public, anon, authenticated;
grant execute on function public.claim_next_background_job() to service_role;
grant execute on function public.claim_background_job_by_id(uuid) to service_role;
grant execute on function public.mutate_background_job_attempt(uuid, uuid, text, integer, text) to service_role;
grant execute on function public.recover_stale_background_jobs(integer, integer) to service_role;
commit;
