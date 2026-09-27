-- Articles written through /admin/articles and shown next to the built-in
-- posts in the blog. Written only through the admin API (service role); the
-- public API and pages read published rows. RLS is enabled with no policies,
-- so direct client access is denied.
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 90),
  title text not null check (char_length(title) between 1 and 140),
  title_ar text check (title_ar is null or char_length(title_ar) between 1 and 140),
  excerpt text not null check (char_length(excerpt) between 1 and 300),
  excerpt_ar text check (excerpt_ar is null or char_length(excerpt_ar) between 1 and 300),
  category text not null check (char_length(category) between 1 and 60),
  category_ar text check (category_ar is null or char_length(category_ar) between 1 and 60),
  lab_markers text[] not null default '{}',
  content text not null check (char_length(content) between 1 and 20000),
  content_ar text check (content_ar is null or char_length(content_ar) between 1 and 20000),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_status_idx
  on public.articles (status, published_at desc);

alter table public.articles enable row level security;
