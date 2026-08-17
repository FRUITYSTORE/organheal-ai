-- OrganHeal AI
-- Background Jobs: Follow-up Delivery Job Type
--
-- Purpose:
-- Add the follow-up-delivery job type without changing
-- the existing durable worker, retry, lease, or recovery behavior.
--
-- Run this migration in the Supabase SQL Editor before
-- adding FOLLOW_UP_DELIVERY to the TypeScript JOB_TYPES contract.

begin;

alter table public.background_jobs
drop constraint if exists
  background_jobs_type_check;

alter table public.background_jobs
add constraint
  background_jobs_type_check
check (
  job_type in (
    'pdf-extraction',
    'report-analysis',
    'health-intelligence',
    'doctor-brief',
    'patient-report',
    'knowledge-recommendation',
    'follow-up-delivery'
  )
);

comment on constraint
  background_jobs_type_check
on public.background_jobs
is
  'Allowed durable background job types, including scheduled follow-up delivery.';

commit;