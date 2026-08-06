-- OrganHeal AI Stale Background Job Recovery
-- Atomically recovers jobs left in "running" after an interrupted worker.
-- Run in Supabase SQL Editor after reviewing.

create or replace function public.recover_stale_background_jobs(
  p_stale_after_seconds integer default 1800,
  p_maximum_jobs integer default 10
)
returns table (
  recovered_retrying integer,
  recovered_failed integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_stale_seconds integer;
  normalized_maximum_jobs integer;
  retrying_count integer := 0;
  failed_count integer := 0;
begin
  normalized_stale_seconds :=
    least(
      greatest(
        coalesce(
          p_stale_after_seconds,
          1800
        ),
        300
      ),
      86400
    );

  normalized_maximum_jobs :=
    least(
      greatest(
        coalesce(
          p_maximum_jobs,
          10
        ),
        1
      ),
      100
    );

  with stale_jobs as (
    select
      jobs.id,
      jobs.job_type,
      jobs.report_id,
      jobs.attempts + 1 as next_attempts,
      jobs.max_attempts
    from public.background_jobs as jobs
    where
      jobs.status = 'running'
      and jobs.finished_at is null
      and jobs.started_at is not null
      and jobs.started_at <=
        now() -
        make_interval(
          secs => normalized_stale_seconds
        )
    order by
      jobs.started_at asc,
      jobs.created_at asc
    for update skip locked
    limit normalized_maximum_jobs
  ),
  recovered_jobs as (
    update public.background_jobs as jobs
    set
      status =
        case
          when stale_jobs.next_attempts >=
            stale_jobs.max_attempts
          then 'failed'
          else 'retrying'
        end,

      attempts =
        stale_jobs.next_attempts,

      available_at =
        case
          when stale_jobs.next_attempts >=
            stale_jobs.max_attempts
          then jobs.available_at
          else now()
        end,

      started_at =
        null,

      finished_at =
        case
          when stale_jobs.next_attempts >=
            stale_jobs.max_attempts
          then now()
          else null
        end,

      last_error =
        case
          when stale_jobs.next_attempts >=
            stale_jobs.max_attempts
          then
            'Background job recovery failed the job after its execution lease expired.'
          else
            'Background job execution lease expired; job returned to retrying.'
        end,

      updated_at =
        now()
    from stale_jobs
    where jobs.id = stale_jobs.id
    returning
      jobs.id,
      jobs.job_type,
      jobs.report_id,
      jobs.status
  ),
  failed_reports as (
    update public.uploaded_lab_files as reports
    set
      extraction_status =
        'Failed'
    from recovered_jobs
    where
      recovered_jobs.status =
        'failed'
      and recovered_jobs.job_type =
        'pdf-extraction'
      and recovered_jobs.report_id is not null
      and reports.id =
        recovered_jobs.report_id
    returning reports.id
  )
  select
    count(*) filter (
      where recovered_jobs.status =
        'retrying'
    )::integer,

    count(*) filter (
      where recovered_jobs.status =
        'failed'
    )::integer
  into
    retrying_count,
    failed_count
  from recovered_jobs;

  return query
  select
    retrying_count,
    failed_count;
end;
$$;

revoke all
on function public.recover_stale_background_jobs(
  integer,
  integer
)
from public;

revoke all
on function public.recover_stale_background_jobs(
  integer,
  integer
)
from anon;

revoke all
on function public.recover_stale_background_jobs(
  integer,
  integer
)
from authenticated;

grant execute
on function public.recover_stale_background_jobs(
  integer,
  integer
)
to service_role;