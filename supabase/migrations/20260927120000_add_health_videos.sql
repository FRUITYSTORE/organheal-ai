-- Owner-added health videos shown in the homepage "Watch & understand"
-- section alongside the built-in vetted catalog. Written only through the
-- admin API (service role); the public API reads active rows. RLS is enabled
-- with no policies, so direct client access is denied.
create table if not exists public.health_videos (
  id uuid primary key default gen_random_uuid(),
  youtube_id text not null unique
    check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  topic text not null
    check (topic in ('diabetes', 'cholesterol', 'blood-pressure', 'kidney', 'liver', 'vitamin-d')),
  title text not null check (char_length(title) between 1 and 140),
  title_ar text check (title_ar is null or char_length(title_ar) between 1 and 140),
  source text not null check (char_length(source) between 1 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists health_videos_active_idx
  on public.health_videos (is_active, topic, created_at desc);

alter table public.health_videos enable row level security;
