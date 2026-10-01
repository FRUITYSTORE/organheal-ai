begin;

-- One logical result per existing job; references are opaque server identities,
-- not storage locations or evidence that any artifact exists.
create table public.background_job_results (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.background_jobs(id) on delete restrict,
  attempt_token uuid not null,
  result_kind text not null check (result_kind = 'artifact'),
  reference_id uuid not null,
  created_at timestamptz not null default clock_timestamp()
);
alter table public.background_job_results enable row level security;
-- No client-facing SELECT policy until an authorized result resolver exists.
revoke all on public.background_job_results from public, anon, authenticated, service_role;
grant select on public.background_job_results to service_role;

create function public.reject_background_job_result_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'Published background job results are immutable' using errcode = '55000';
end $$;
revoke all on function public.reject_background_job_result_mutation() from public, anon, authenticated, service_role;
create trigger background_job_results_immutable
before update or delete on public.background_job_results
for each row execute function public.reject_background_job_result_mutation();

create function public.publish_background_job_result(
  p_job_id uuid, p_attempt_token uuid, p_result_kind text, p_reference_id uuid
)
returns table (outcome text, result_id uuid)
language plpgsql security definer set search_path = public as $$
declare owned public.background_jobs%rowtype;
  published public.background_job_results%rowtype;
  db_time timestamptz;
begin
  select j.* into owned from public.background_jobs j where j.id = p_job_id for update;
  if not found or p_attempt_token is null or owned.attempt_token is distinct from p_attempt_token then
    return query select 'ownership-lost'::text, null::uuid;
    return;
  end if;
  -- Terminal replay is read-only and does not resurrect an expired lease.
  if owned.status = 'completed' then
    select r.* into published from public.background_job_results r where r.job_id = owned.id;
    if found and published.attempt_token = p_attempt_token
      and published.result_kind = p_result_kind and published.reference_id = p_reference_id then
      return query select 'already-finalized'::text, published.id;
    else
      return query select 'conflict'::text, null::uuid;
    end if;
    return;
  end if;
  db_time := clock_timestamp(); -- after the row lock, never transaction-start time
  if owned.status <> 'running' or owned.lease_expires_at <= db_time then
    return query select 'ownership-lost'::text, null::uuid;
    return;
  end if;
  if p_result_kind is distinct from 'artifact' or p_reference_id is null then
    raise exception 'Invalid background job publication identity' using errcode = '22023';
  end if;
  if exists (select 1 from public.background_job_results r where r.job_id = owned.id) then
    return query select 'conflict'::text, null::uuid;
    return;
  end if;
  insert into public.background_job_results(job_id,attempt_token,result_kind,reference_id)
  values(owned.id,p_attempt_token,p_result_kind,p_reference_id) returning * into published;
  -- Recheck after INSERT as well: constraint/trigger work must not carry an
  -- expired lease across the publication boundary. An exception rolls back both.
  db_time := clock_timestamp();
  if owned.lease_expires_at <= db_time then
    raise exception 'Background job publication lease expired' using errcode = '55000';
  end if;
  update public.background_jobs j set status='completed', lease_expires_at=null,
    finished_at=db_time, updated_at=db_time, last_error=null where j.id=owned.id;
  return query select 'applied'::text, published.id;
end $$;
revoke all on function public.publish_background_job_result(uuid,uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.publish_background_job_result(uuid,uuid,text,uuid) to service_role;
commit;
