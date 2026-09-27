-- Trust details shown on an article page: who reviewed it medically, when,
-- and the sources it is based on. All optional; nothing is displayed unless
-- an editor fills them in.
alter table public.articles
  add column if not exists reviewed_by text
    check (reviewed_by is null or char_length(reviewed_by) between 1 and 120),
  add column if not exists reviewed_at date,
  add column if not exists sources text
    check (sources is null or char_length(sources) between 1 and 2000);
