-- OrganHeal AI Durable Background Jobs
-- Run in Supabase SQL Editor after reviewing the script.

create table if not exists public.background_jobs (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  job_type text not null,

  status text not null default 'pending',

  payload jsonb not null default '{}'::jsonb,

  attempts integer not null default 0,

  max_attempts integer not null default 3,

  available_at timestamptz not null default now(),

  started_at timestamptz null,

  finished_at timestamptz null,

  last_error text null,

  request_id text null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint background_jobs_type_check
    check (
      job_type in (
        'pdf-extraction',
        'report-analysis',
        'health-intelligence',
        'doctor-brief',
        'patient-report',
        'knowledge-recommendation'
      )
    ),

  constraint background_jobs_status_check
    check (
      status in (
        'pending',
        'running',
        'completed',
        'failed',
        'retrying',
        'cancelled'
      )
    ),

  constraint background_jobs_attempts_check
    check (
      attempts >= 0
    ),

  constraint background_jobs_max_attempts_check
    check (
      max_attempts > 0
    ),

  constraint background_jobs_attempt_limit_check
    check (
      attempts <= max_attempts
    )
);

create index if not exists
  idx_background_jobs_pending_available
on public.background_jobs (
  status,
  available_at,
  created_at
)
where status in (
  'pending',
  'retrying'
);

create index if not exists
  idx_background_jobs_user_created
on public.background_jobs (
  user_id,
  created_at desc
);

create index if not exists
  idx_background_jobs_type_status
on public.background_jobs (
  job_type,
  status
);

create unique index if not exists
  idx_background_jobs_request_id
on public.background_jobs (
  request_id
)
where request_id is not null;

alter table public.background_jobs
enable row level security;

drop policy if exists
  "Users can view their own background jobs"
on public.background_jobs;

create policy
  "Users can view their own background jobs"
on public.background_jobs
for select
to authenticated
using (
  auth.uid() = user_id
);

drop policy if exists
  "Users can create their own background jobs"
on public.background_jobs;

create policy
  "Users can create their own background jobs"
on public.background_jobs
for insert
to authenticated
with check (
  auth.uid() = user_id
);