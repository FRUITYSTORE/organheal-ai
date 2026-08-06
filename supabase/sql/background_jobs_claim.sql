-- OrganHeal AI Background Job Claim Function
-- Run in Supabase SQL Editor after reviewing.

create or replace function public.claim_next_background_job()
returns setof public.background_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_job_id uuid;
begin
  select id
  into claimed_job_id
  from public.background_jobs
  where status in (
    'pending',
    'retrying'
  )
  and available_at <= now()
  order by
    available_at asc,
    created_at asc
  for update skip locked
  limit 1;

  if claimed_job_id is null then
    return;
  end if;

  return query
  update public.background_jobs
  set
    status = 'running',
    started_at = now(),
    finished_at = null,
    updated_at = now()
  where id = claimed_job_id
  returning *;
end;
$$;

revoke all
on function public.claim_next_background_job()
from public;

revoke all
on function public.claim_next_background_job()
from anon;

revoke all
on function public.claim_next_background_job()
from authenticated;

grant execute
on function public.claim_next_background_job()
to service_role;