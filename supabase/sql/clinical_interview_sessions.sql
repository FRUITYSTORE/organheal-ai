create table if not exists public.clinical_interview_sessions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  status text not null
    default 'active'
    check (
      status in (
        'active',
        'completed',
        'abandoned'
      )
    ),

  reasoning_state jsonb not null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);

create index if not exists
  idx_clinical_interview_sessions_user_updated
on public.clinical_interview_sessions (
  user_id,
  updated_at desc
);

alter table
  public.clinical_interview_sessions
enable row level security;

drop policy if exists
  "Users can read own clinical interview sessions"
on public.clinical_interview_sessions;

create policy
  "Users can read own clinical interview sessions"
on public.clinical_interview_sessions
for select
to authenticated
using (
  auth.uid() = user_id
);

drop policy if exists
  "Users can create own clinical interview sessions"
on public.clinical_interview_sessions;

create policy
  "Users can create own clinical interview sessions"
on public.clinical_interview_sessions
for insert
to authenticated
with check (
  auth.uid() = user_id
);

drop policy if exists
  "Users can update own clinical interview sessions"
on public.clinical_interview_sessions;

create policy
  "Users can update own clinical interview sessions"
on public.clinical_interview_sessions
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);