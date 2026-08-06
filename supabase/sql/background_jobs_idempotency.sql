-- OrganHeal AI Background Job Idempotency
-- Adds atomic duplicate prevention for report-scoped active jobs.
-- Run in Supabase SQL Editor after reviewing the script.

alter table public.background_jobs
add column if not exists report_id bigint null;

-- Backfill report_id from existing JSON payloads where possible.
update public.background_jobs
set report_id =
  case
    when
      payload ? 'reportId'
      and payload ->> 'reportId' ~ '^[0-9]+$'
    then
      (payload ->> 'reportId')::bigint
    else
      null
  end
where report_id is null;

-- Preserve only the oldest active job when historical duplicates exist.
-- Superseded rows remain available for audit rather than being deleted.
with ranked_active_jobs as (
  select
    id,
    row_number() over (
      partition by
        user_id,
        job_type,
        report_id
      order by
        created_at asc,
        id asc
    ) as active_job_rank
  from public.background_jobs
  where
    report_id is not null
    and status in (
      'pending',
      'running',
      'retrying'
    )
)
update public.background_jobs as jobs
set
  status = 'cancelled',
  finished_at = coalesce(
    jobs.finished_at,
    now()
  ),
  last_error = coalesce(
    jobs.last_error,
    'Superseded by active-job idempotency migration.'
  ),
  updated_at = now()
from ranked_active_jobs
where
  jobs.id = ranked_active_jobs.id
  and ranked_active_jobs.active_job_rank > 1;

create unique index if not exists
  idx_background_jobs_active_report_unique
on public.background_jobs (
  user_id,
  job_type,
  report_id
)
where
  report_id is not null
  and status in (
    'pending',
    'running',
    'retrying'
  );

create index if not exists
  idx_background_jobs_report_created
on public.background_jobs (
  user_id,
  report_id,
  created_at desc
)
where report_id is not null;

create or replace function public.enqueue_background_job_once(
  p_job_id uuid,
  p_user_id uuid,
  p_request_id text,
  p_job_type text,
  p_payload jsonb,
  p_report_id bigint,
  p_max_attempts integer,
  p_created_at timestamptz
)
returns table (
  job_id uuid,
  created boolean
)
language plpgsql
set search_path = public
as $$
declare
  inserted_job_id uuid;
  existing_job_id uuid;
begin
  if p_job_id is null then
    raise exception
      'p_job_id is required';
  end if;

  if p_user_id is null then
    raise exception
      'p_user_id is required';
  end if;

  if p_job_type is null or btrim(p_job_type) = '' then
    raise exception
      'p_job_type is required';
  end if;

  if p_report_id is null then
    raise exception
      'p_report_id is required for idempotent report jobs';
  end if;

  if p_max_attempts is null or p_max_attempts <= 0 then
    raise exception
      'p_max_attempts must be greater than zero';
  end if;

  loop
    inserted_job_id := null;
    existing_job_id := null;

    insert into public.background_jobs (
      id,
      user_id,
      request_id,
      job_type,
      status,
      payload,
      report_id,
      attempts,
      max_attempts,
      created_at,
      available_at,
      updated_at
    )
    values (
      p_job_id,
      p_user_id,
      p_request_id,
      p_job_type,
      'pending',
      coalesce(
        p_payload,
        '{}'::jsonb
      ),
      p_report_id,
      0,
      p_max_attempts,
      coalesce(
        p_created_at,
        now()
      ),
      now(),
      now()
    )
    on conflict (
      user_id,
      job_type,
      report_id
    )
    where
      report_id is not null
      and status in (
        'pending',
        'running',
        'retrying'
      )
    do nothing
    returning id
    into inserted_job_id;

    if inserted_job_id is not null then
      return query
      select
        inserted_job_id,
        true;

      return;
    end if;

    select jobs.id
    into existing_job_id
    from public.background_jobs as jobs
    where
      jobs.user_id = p_user_id
      and jobs.job_type = p_job_type
      and jobs.report_id = p_report_id
      and jobs.status in (
        'pending',
        'running',
        'retrying'
      )
    order by
      jobs.created_at asc,
      jobs.id asc
    limit 1;

    if existing_job_id is not null then
      return query
      select
        existing_job_id,
        false;

      return;
    end if;

    -- The conflicting job may have completed between the INSERT
    -- and SELECT. Retry so a new pending job can be created safely.
  end loop;
end;
$$;

revoke all
on function public.enqueue_background_job_once(
  uuid,
  uuid,
  text,
  text,
  jsonb,
  bigint,
  integer,
  timestamptz
)
from public;

revoke all
on function public.enqueue_background_job_once(
  uuid,
  uuid,
  text,
  text,
  jsonb,
  bigint,
  integer,
  timestamptz
)
from anon;

revoke all
on function public.enqueue_background_job_once(
  uuid,
  uuid,
  text,
  text,
  jsonb,
  bigint,
  integer,
  timestamptz
)
from authenticated;

grant execute
on function public.enqueue_background_job_once(
  uuid,
  uuid,
  text,
  text,
  jsonb,
  bigint,
  integer,
  timestamptz
)
to service_role;