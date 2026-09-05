-- OrganHeal AI Medical Report Evidence Events
-- Parser v2 raw structured evidence.
--
-- This table preserves every reliable laboratory result row
-- from a report, including repeated measurements of the same
-- marker. It intentionally does NOT replace medical_report_markers.
--
-- medical_report_markers:
--   canonical/current marker representation used by existing engines.
--
-- medical_report_evidence_events:
--   ordered report-level evidence preserving repeated values,
--   raw labels, units, ranges, and report flags.

create table if not exists public.medical_report_evidence_events (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  report_id bigint not null,

  sequence_index integer not null,

  raw_marker_name text not null,

  canonical_marker_name text not null,

  marker_value double precision not null,

  marker_unit text null,

  reference_low double precision null,

  reference_high double precision null,

  marker_status text not null default 'Detected',

  flag text null,

  raw_line text not null,

  normalization_confidence text not null default 'low',

  context_type text not null default 'result',

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint medical_report_evidence_events_sequence_check
    check (
      sequence_index >= 0
    ),

  constraint medical_report_evidence_events_marker_status_check
    check (
      marker_status in (
        'Low',
        'Normal',
        'High',
        'Detected'
      )
    ),

  constraint medical_report_evidence_events_confidence_check
    check (
      normalization_confidence in (
        'high',
        'medium',
        'low'
      )
    ),

  constraint medical_report_evidence_events_context_type_check
    check (
      context_type in (
        'result',
        'repeat',
        'specimen',
        'method',
        'note'
      )
    ),

  constraint medical_report_evidence_events_reference_check
    check (
      reference_low is null
      or reference_high is null
      or reference_low <= reference_high
    )
);

create unique index if not exists
  idx_medical_report_evidence_events_report_sequence
on public.medical_report_evidence_events (
  user_id,
  report_id,
  sequence_index
);

create index if not exists
  idx_medical_report_evidence_events_report
on public.medical_report_evidence_events (
  user_id,
  report_id,
  sequence_index
);

create index if not exists
  idx_medical_report_evidence_events_marker
on public.medical_report_evidence_events (
  user_id,
  canonical_marker_name,
  created_at desc
);

alter table public.medical_report_evidence_events
enable row level security;

drop policy if exists
  "Users can view their own medical report evidence events"
on public.medical_report_evidence_events;

create policy
  "Users can view their own medical report evidence events"
on public.medical_report_evidence_events
for select
to authenticated
using (
  auth.uid() = user_id
);

drop policy if exists
  "Users can create their own medical report evidence events"
on public.medical_report_evidence_events;

create policy
  "Users can create their own medical report evidence events"
on public.medical_report_evidence_events
for insert
to authenticated
with check (
  auth.uid() = user_id
);

drop policy if exists
  "Users can update their own medical report evidence events"
on public.medical_report_evidence_events;

create policy
  "Users can update their own medical report evidence events"
on public.medical_report_evidence_events
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

drop policy if exists
  "Users can delete their own medical report evidence events"
on public.medical_report_evidence_events;

create policy
  "Users can delete their own medical report evidence events"
on public.medical_report_evidence_events
for delete
to authenticated
using (
  auth.uid() = user_id
);