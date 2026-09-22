-- OrganHeal AI
-- Bilingual notifications
--
-- Notifications were persisted in whichever language the UI happened to be
-- set to at the moment they were created, with no Arabic/English pair
-- stored. A user who later switched language kept seeing old notifications
-- frozen in the other language. This adds the missing Arabic columns so a
-- notification can carry both languages and the UI can pick the one that
-- matches the viewer's current preference, the same way every other page
-- already behaves.
--
-- Existing rows keep whatever language they were created in: title_ar/
-- body_ar are left null for them, and the application falls back to the
-- English column when the Arabic one is missing (see
-- lib/repositories/notification.repository.ts). Nothing is backfilled or
-- translated retroactively.

begin;

alter table public.notifications
  add column if not exists title_ar text,
  add column if not exists body_ar text;

comment on column public.notifications.title is
  'English title. Always present.';

comment on column public.notifications.title_ar is
  'Arabic title. Null for notifications created before this column existed; the application falls back to title in that case.';

comment on column public.notifications.body is
  'English body. Always present.';

comment on column public.notifications.body_ar is
  'Arabic body. Null for notifications created before this column existed; the application falls back to body in that case.';

comment on column public.notifications.action is
  'jsonb {labelEn, labelAr, href} for notifications created after this migration. Older rows may still hold the single-language shape {label, href}; the application normalizes both when reading.';

comment on column public.notifications.safety is
  'jsonb {noteEn, noteAr, requiresProfessionalReview, requiresUrgentReview} for notifications created after this migration. Older rows may still hold the single-language shape {note, ...}; the application normalizes both when reading.';

commit;
