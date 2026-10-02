-- Local execution success is not durable publication. No artifact/path/reference
-- is stored here. Deploy before explicitly registering a render-capable handler.
begin;
alter table public.background_jobs drop constraint background_jobs_status_check;
alter table public.background_jobs add constraint background_jobs_status_check check
  (status in ('pending','running','completed','failed','retrying','cancelled','awaiting-artifact-publication'));
alter table public.background_jobs add constraint background_jobs_publication_pending_check check
  (status <> 'awaiting-artifact-publication' or
    (job_type = 'medical-motion-render' and attempt_token is not null and lease_expires_at is null
      and finished_at is null and last_error is null));

create function public.defer_background_job_completion(p_job_id uuid, p_attempt_token uuid)
returns table(outcome text, job_status text, lease_expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare owned public.background_jobs%rowtype; db_time timestamptz;
begin
  select j.* into owned from public.background_jobs j where j.id=p_job_id for update;
  if not found or p_attempt_token is null or owned.attempt_token is distinct from p_attempt_token
      or owned.job_type <> 'medical-motion-render' then
    return query select 'ownership-lost'::text,null::text,null::timestamptz; return;
  end if;
  if owned.status = 'awaiting-artifact-publication' then
    return query select 'already-finalized'::text,owned.status,null::timestamptz; return;
  end if;
  db_time := clock_timestamp(); -- after lock; never transaction-start time
  if owned.status <> 'running' or owned.lease_expires_at <= db_time then
    return query select 'ownership-lost'::text,null::text,null::timestamptz; return;
  end if;
  update public.background_jobs j set status='awaiting-artifact-publication',
    lease_expires_at=null,finished_at=null,last_error=null,updated_at=db_time where j.id=owned.id;
  return query select 'applied'::text,'awaiting-artifact-publication'::text,null::timestamptz;
end $$;
revoke all on function public.defer_background_job_completion(uuid,uuid) from public,anon,authenticated;
grant execute on function public.defer_background_job_completion(uuid,uuid) to service_role;
-- Existing claims select pending/retrying, recovery selects running, and all
-- accepted mutation/publication RPCs require running+unexpired ownership.
-- No exit from this state is introduced; a future durable publication flow
-- must deliberately reconcile it. Administrators remain trusted operators.
commit;
