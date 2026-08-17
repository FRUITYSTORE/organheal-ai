-- OrganHeal AI
-- Follow-up Delivery Background Job Idempotency
--
-- Prevent duplicate active follow-up delivery jobs that share
-- the same user, job type, and deterministic idempotency key.

begin;

alter table public.background_jobs
add column if not exists
  idempotency_key text null;

-- Preserve the oldest active follow-up job if historical
-- duplicates already exist.
with ranked_active_follow_up_jobs as (
  select
    id,
    row_number() over (
      partition by
        user_id,
        job_type,
        idempotency_key
      order by
        created_at asc,
        id asc
    ) as active_job_rank
  from public.background_jobs
  where
    job_type = 'follow-up-delivery'
    and idempotency_key is not null
    and status in (
      'pending',
      'running',
      'retrying'
    )
)
update public.background_jobs as jobs
set
  status =
    'cancelled',

  finished_at =
    coalesce(
      jobs.finished_at,
      now()
    ),

  last_error =
    coalesce(
      jobs.last_error,
      'Superseded by follow-up delivery idempotency migration.'
    ),

  updated_at =
    now()
from ranked_active_follow_up_jobs
where
  jobs.id =
    ranked_active_follow_up_jobs.id
  and ranked_active_follow_up_jobs.active_job_rank >
    1;

create unique index if not exists
  idx_background_jobs_active_follow_up_unique
on public.background_jobs (
  user_id,
  job_type,
  idempotency_key
)
where
  job_type = 'follow-up-delivery'
  and idempotency_key is not null
  and status in (
    'pending',
    'running',
    'retrying'
  );

create index if not exists
  idx_background_jobs_follow_up_created
on public.background_jobs (
  user_id,
  idempotency_key,
  created_at desc
)
where
  job_type = 'follow-up-delivery'
  and idempotency_key is not null;

create or replace function public.enqueue_follow_up_delivery_once(
  p_job_id uuid,
  p_user_id uuid,
  p_request_id text,
  p_payload jsonb,
  p_idempotency_key text,
  p_max_attempts integer,
  p_available_at timestamptz,
  p_created_at timestamptz
)
returns table (
  job_id uuid,
  created boolean
)
language plpgsql
security definer
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

  if (
    p_idempotency_key is null
    or btrim(
      p_idempotency_key
    ) = ''
  ) then
    raise exception
      'p_idempotency_key is required';
  end if;

  if (
    p_max_attempts is null
    or p_max_attempts <= 0
  ) then
    raise exception
      'p_max_attempts must be greater than zero';
  end if;

  loop
    inserted_job_id :=
      null;

    existing_job_id :=
      null;

    insert into public.background_jobs (
      id,
      user_id,
      request_id,
      job_type,
      status,
      payload,
      idempotency_key,
      attempts,
      max_attempts,
      available_at,
      created_at,
      updated_at
    )
    values (
      p_job_id,
      p_user_id,
      p_request_id,
      'follow-up-delivery',
      'pending',
      coalesce(
        p_payload,
        '{}'::jsonb
      ),
      btrim(
        p_idempotency_key
      ),
      0,
      p_max_attempts,
      coalesce(
        p_available_at,
        now()
      ),
      coalesce(
        p_created_at,
        now()
      ),
      now()
    )
    on conflict (
      user_id,
      job_type,
      idempotency_key
    )
    where
      job_type = 'follow-up-delivery'
      and idempotency_key is not null
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
      jobs.user_id =
        p_user_id
      and jobs.job_type =
        'follow-up-delivery'
      and jobs.idempotency_key =
        btrim(
          p_idempotency_key
        )
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

    -- The conflicting job may have completed between the
    -- INSERT and SELECT. Retry safely.
  end loop;
end;
$$;

revoke all
on function public.enqueue_follow_up_delivery_once(
  uuid,
  uuid,
  text,
  jsonb,
  text,
  integer,
  timestamptz,
  timestamptz
)
from public;

revoke all
on function public.enqueue_follow_up_delivery_once(
  uuid,
  uuid,
  text,
  jsonb,
  text,
  integer,
  timestamptz,
  timestamptz
)
from anon;

revoke all
on function public.enqueue_follow_up_delivery_once(
  uuid,
  uuid,
  text,
  jsonb,
  text,
  integer,
  timestamptz,
  timestamptz
)
from authenticated;

grant execute
on function public.enqueue_follow_up_delivery_once(
  uuid,
  uuid,
  text,
  jsonb,
  text,
  integer,
  timestamptz,
  timestamptz
)
to service_role;

commit;