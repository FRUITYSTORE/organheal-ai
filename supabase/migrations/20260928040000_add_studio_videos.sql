-- Tracks the video-studio pilot's renders (real footage + narration audio +
-- burned captions, composited via Shotstack — see lib/video-studio/). Not
-- linked to any member yet: this table is only for the admin-triggered
-- pilot in app/admin/studio-video. Written only through the admin API
-- (service role); RLS is enabled with no policies, so direct client access
-- is denied, same as public.articles.
create table if not exists public.studio_videos (
  id uuid primary key default gen_random_uuid(),
  topic text not null check (char_length(topic) between 1 and 200),
  title text,
  status text not null default 'queued'
    check (status in ('queued', 'fetching', 'rendering', 'saving', 'done', 'failed')),
  shotstack_render_id text,
  shotstack_environment text not null default 'sandbox'
    check (shotstack_environment in ('sandbox', 'production')),
  output_url text,
  error_message text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_videos_created_at_idx
  on public.studio_videos (created_at desc);

alter table public.studio_videos enable row level security;
