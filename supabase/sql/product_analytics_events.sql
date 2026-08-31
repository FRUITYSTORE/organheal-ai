-- OrganHeal AI
-- First-Party Product Analytics
--
-- Stores privacy-safe product funnel events only.
--
-- No clinical content, prompts, transcripts, report identifiers,
-- email addresses, usernames, patient identifiers, diagnoses,
-- laboratory values, or other health data belong here.
--
-- Writes are server-side only.

begin;

create table if not exists public.product_analytics_events (
  id uuid primary key default gen_random_uuid(),

  event_name text not null,

  user_id uuid null
    references auth.users(id)
    on delete set null,

  anonymous_session_id uuid null,

  language text null,

  source text null,

  authenticated boolean not null default false,

  created_at timestamptz not null default now(),

  constraint product_analytics_event_name_check
    check (
      event_name in (
        'homepage_viewed',
        'signup_started',
        'signup_completed',
        'login_completed',
        'report_upload_started',
        'report_upload_completed',
        'intelligence_viewed',
        'health_plan_viewed',
        'assistant_used',
        'voice_used',
        'return_session',
        'pricing_viewed',
        'paid_access_requested'
      )
    ),

  constraint product_analytics_language_check
    check (
      language is null
      or language in (
        'en',
        'ar'
      )
    ),

  constraint product_analytics_source_check
    check (
      source is null
      or source in (
        'homepage',
        'signup',
        'login',
        'reports',
        'lab-upload',
        'intelligence',
        'health-plan',
        'assistant',
        'dashboard',
        'pricing',
        'contact',
        'unknown'
      )
    ),

  constraint product_analytics_identity_check
    check (
      (
        authenticated = true
        and user_id is not null
      )
      or (
        authenticated = false
        and user_id is null
      )
    )
);

create index if not exists
  idx_product_analytics_event_created
on public.product_analytics_events (
  event_name,
  created_at desc
);

create index if not exists
  idx_product_analytics_user_created
on public.product_analytics_events (
  user_id,
  created_at desc
)
where
  user_id is not null;

create index if not exists
  idx_product_analytics_anonymous_session_created
on public.product_analytics_events (
  anonymous_session_id,
  created_at desc
)
where
  anonymous_session_id is not null;

create index if not exists
  idx_product_analytics_created
on public.product_analytics_events (
  created_at desc
);

alter table public.product_analytics_events
enable row level security;

revoke all
on table public.product_analytics_events
from anon, authenticated;

comment on table public.product_analytics_events
is
  'Privacy-safe first-party product funnel events. Server-write only; clinical content and direct identifiers are prohibited.';

comment on column public.product_analytics_events.user_id
is
  'Authenticated OrganHeal user identity derived server-side. Must never be accepted from the browser analytics payload.';

comment on column public.product_analytics_events.anonymous_session_id
is
  'Random analytics session UUID for unauthenticated funnel continuity. Must not encode identity, IP address, email, or health information.';

comment on column public.product_analytics_events.event_name
is
  'Product funnel event only. paid_access_requested represents purchase interest, not a completed paid subscription.';

commit;