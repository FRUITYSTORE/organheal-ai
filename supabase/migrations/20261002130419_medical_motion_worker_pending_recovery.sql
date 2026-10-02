begin;

-- Bounded service-only scheduling around the existing artifact recovery transition.
create index background_jobs_motion_awaiting_idx
on public.background_jobs (updated_at, id)
where job_type = 'medical-motion-render' and status = 'awaiting-artifact-publication';

create function public.resume_motion_worker_pending(p_limit integer default 10)
returns table (resumed_count integer)
language plpgsql security definer set search_path = '' as $$
declare candidate record; processed integer := 0;
begin
  for candidate in
    select j.id, j.user_id from public.background_jobs j
    where j.job_type = 'medical-motion-render'
      and j.status = 'awaiting-artifact-publication'
    order by j.updated_at, j.id
    limit least(greatest(coalesce(p_limit, 10), 1), 100)
    for update skip locked
  loop
    if public.resume_motion_artifact_job(candidate.id, candidate.user_id) then
      processed := processed + 1;
    end if;
  end loop;
  return query select processed;
end $$;
revoke all on function public.resume_motion_worker_pending(integer) from public, anon, authenticated;
grant execute on function public.resume_motion_worker_pending(integer) to service_role;
commit;
