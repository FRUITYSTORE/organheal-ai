-- OrganHeal AI
-- Communication Preferences V1
--
-- Purpose:
-- Store user-controlled communication preferences and consent
-- separately from the core account profile.
--
-- Supported channels:
-- - Dashboard / in-app
-- - Email
-- - WhatsApp
-- - Push
--
-- External providers are NOT configured here.
-- This table only defines trusted user preferences,
-- consent state, contact metadata, and verification state.

create table if not exists public.communication_preferences (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  preferred_language text not null
    default 'en'
    check (
      preferred_language in (
        'en',
        'ar'
      )
    ),

  timezone text not null
    default 'UTC',

  dashboard_enabled boolean not null
    default true,

  email_enabled boolean not null
    default false,

  whatsapp_enabled boolean not null
    default false,

  push_enabled boolean not null
    default false,

  whatsapp_phone_e164 text null,

  whatsapp_phone_verified_at timestamptz null,

  email_consent_granted_at timestamptz null,

  email_consent_revoked_at timestamptz null,

  whatsapp_consent_granted_at timestamptz null,

  whatsapp_consent_revoked_at timestamptz null,

  push_consent_granted_at timestamptz null,

  push_consent_revoked_at timestamptz null,

  consent_source text null,

  consent_version text null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint communication_preferences_whatsapp_phone_check
    check (
      whatsapp_phone_e164 is null
      or whatsapp_phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
    ),

  constraint communication_preferences_whatsapp_enabled_check
    check (
      whatsapp_enabled = false
      or (
        whatsapp_phone_e164 is not null
        and whatsapp_consent_granted_at is not null
        and (
          whatsapp_consent_revoked_at is null
          or whatsapp_consent_granted_at >
             whatsapp_consent_revoked_at
        )
      )
    ),

  constraint communication_preferences_email_enabled_check
    check (
      email_enabled = false
      or (
        email_consent_granted_at is not null
        and (
          email_consent_revoked_at is null
          or email_consent_granted_at >
             email_consent_revoked_at
        )
      )
    ),

  constraint communication_preferences_push_enabled_check
    check (
      push_enabled = false
      or (
        push_consent_granted_at is not null
        and (
          push_consent_revoked_at is null
          or push_consent_granted_at >
             push_consent_revoked_at
        )
      )
    )
);

create index if not exists
  idx_communication_preferences_whatsapp_enabled
on public.communication_preferences (
  whatsapp_enabled
)
where whatsapp_enabled = true;

create index if not exists
  idx_communication_preferences_email_enabled
on public.communication_preferences (
  email_enabled
)
where email_enabled = true;

create index if not exists
  idx_communication_preferences_push_enabled
on public.communication_preferences (
  push_enabled
)
where push_enabled = true;

alter table
  public.communication_preferences
enable row level security;

drop policy if exists
  "communication_preferences_select_own"
on public.communication_preferences;

create policy
  "communication_preferences_select_own"
on public.communication_preferences
for select
to authenticated
using (
  auth.uid() = user_id
);

drop policy if exists
  "communication_preferences_insert_own"
on public.communication_preferences;

create policy
  "communication_preferences_insert_own"
on public.communication_preferences
for insert
to authenticated
with check (
  auth.uid() = user_id
);

drop policy if exists
  "communication_preferences_update_own"
on public.communication_preferences;

create policy
  "communication_preferences_update_own"
on public.communication_preferences
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

create or replace function
  public.set_communication_preferences_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();

  return new;
end;
$$;

drop trigger if exists
  communication_preferences_set_updated_at
on public.communication_preferences;

create trigger
  communication_preferences_set_updated_at
before update
on public.communication_preferences
for each row
execute function
  public.set_communication_preferences_updated_at();

comment on table
  public.communication_preferences
is
  'User-controlled communication preferences, channel consent, and WhatsApp contact metadata for OrganHeal follow-up delivery.';

comment on column
  public.communication_preferences.whatsapp_phone_e164
is
  'WhatsApp destination number in E.164 format, for example +971501234567.';

comment on column
  public.communication_preferences.whatsapp_phone_verified_at
is
  'Timestamp indicating when the WhatsApp destination was verified. Provider delivery must not treat an unverified number as trusted.';

comment on column
  public.communication_preferences.consent_source
is
  'Where the latest communication consent was collected, such as profile-settings or onboarding.';

comment on column
  public.communication_preferences.consent_version
is
  'Version identifier for the communication consent wording accepted by the user.';