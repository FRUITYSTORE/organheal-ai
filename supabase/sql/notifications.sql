-- OrganHeal AI
-- Unified Notification Persistence
--
-- Notifications are retained as historical records.
-- Reading, dismissal, or expiration changes lifecycle state
-- without deleting the notification.

begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  purpose text not null,

  priority text not null,

  status text not null default 'unread',

  channels text[] not null,

  title text not null,

  body text not null,

  action jsonb null,

  safety jsonb null,

  source text not null,

  source_reference_id text null,

  idempotency_key text not null,

  read_at timestamptz null,

  dismissed_at timestamptz null,

  expires_at timestamptz null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint notifications_purpose_check
    check (
      purpose in (
        'routine-continuity',
        'complete-health-data',
        'complete-report-analysis',
        'repeat-checkin',
        'review-health-plan',
        'professional-review',
        'urgent-review',
        'report-ready',
        'doctor-brief-ready',
        'health-intelligence-updated'
      )
    ),

  constraint notifications_priority_check
    check (
      priority in (
        'low',
        'medium',
        'high',
        'critical'
      )
    ),

  constraint notifications_status_check
    check (
      status in (
        'unread',
        'read',
        'dismissed',
        'expired'
      )
    ),

  constraint notifications_channels_check
    check (
      cardinality(
        channels
      ) > 0
      and channels <@ array[
        'dashboard',
        'email',
        'whatsapp',
        'push'
      ]::text[]
    ),

  constraint notifications_title_check
    check (
      length(
        btrim(
          title
        )
      ) > 0
    ),

  constraint notifications_body_check
    check (
      length(
        btrim(
          body
        )
      ) > 0
    ),

  constraint notifications_source_check
    check (
      length(
        btrim(
          source
        )
      ) > 0
    ),

  constraint notifications_idempotency_key_check
    check (
      length(
        btrim(
          idempotency_key
        )
      ) > 0
    ),

  constraint notifications_expiration_check
    check (
      expires_at is null
      or expires_at > created_at
    ),

  constraint notifications_read_state_check
    check (
      (
        status = 'read'
        and read_at is not null
      )
      or (
        status <> 'read'
      )
    ),

  constraint notifications_dismissed_state_check
    check (
      (
        status = 'dismissed'
        and dismissed_at is not null
      )
      or (
        status <> 'dismissed'
      )
    )
);

create unique index if not exists
  idx_notifications_user_idempotency_unique
on public.notifications (
  user_id,
  idempotency_key
);

create index if not exists
  idx_notifications_user_status_created
on public.notifications (
  user_id,
  status,
  created_at desc
);

create index if not exists
  idx_notifications_user_created
on public.notifications (
  user_id,
  created_at desc
);

create index if not exists
  idx_notifications_unread_dashboard
on public.notifications (
  user_id,
  created_at desc
)
where
  status = 'unread'
  and channels @> array[
    'dashboard'
  ]::text[];

create index if not exists
  idx_notifications_expiration
on public.notifications (
  expires_at
)
where
  expires_at is not null
  and status in (
    'unread',
    'read'
  );

alter table public.notifications
enable row level security;

drop policy if exists
  "Users can view their own notifications"
on public.notifications;

create policy
  "Users can view their own notifications"
on public.notifications
for select
to authenticated
using (
  auth.uid() = user_id
);

drop policy if exists
  "Users can update their own notifications"
on public.notifications;

create policy
  "Users can update their own notifications"
on public.notifications
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

comment on table public.notifications
is
  'Persistent user notification history for dashboard and external delivery channels.';

comment on column public.notifications.idempotency_key
is
  'Deterministic per-user key preventing duplicate notification records.';

comment on column public.notifications.action
is
  'Optional patient action metadata such as label and internal application path.';

comment on column public.notifications.safety
is
  'Optional safety boundary metadata for professional or urgent clinical review.';

commit;