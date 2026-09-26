-- Owner-authored health notes shown in the homepage "Health updates" strip.
-- Written only through the admin API (service role); the public API reads
-- active, unexpired rows. RLS is enabled with no policies, so direct client
-- access is denied.
create table if not exists public.health_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 600),
  title_ar text check (title_ar is null or char_length(title_ar) between 1 and 120),
  body_ar text check (body_ar is null or char_length(body_ar) between 1 and 600),
  link_url text check (link_url is null or link_url ~ '^https?://'),
  tone text not null default 'teal'
    check (tone in ('teal', 'blue', 'amber', 'rose', 'violet', 'slate')),
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists health_announcements_active_idx
  on public.health_announcements (is_active, created_at desc);

alter table public.health_announcements enable row level security;
