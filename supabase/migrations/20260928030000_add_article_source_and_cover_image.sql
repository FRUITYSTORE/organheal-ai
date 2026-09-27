-- Distinguishes AI-authored article drafts (pending human review, same
-- draft/published flow as staff-written ones) from staff-written articles,
-- and adds an optional cover image so article cards can show a picture
-- instead of text-only.
alter table public.articles
  add column if not exists source text not null default 'staff'
    check (source in ('staff', 'ai')),
  add column if not exists cover_image_url text
    check (cover_image_url is null or char_length(cover_image_url) <= 600),
  add column if not exists cover_image_alt text
    check (cover_image_alt is null or char_length(cover_image_alt) <= 200),
  add column if not exists cover_image_alt_ar text
    check (cover_image_alt_ar is null or char_length(cover_image_alt_ar) <= 200),
  add column if not exists topic_key text
    check (topic_key is null or char_length(topic_key) <= 80);

-- Lets the AI article-generation job find which curated topics (see
-- lib/content/knowledge-topics.ts) it has already covered.
create index if not exists articles_topic_key_idx
  on public.articles (topic_key)
  where topic_key is not null;
