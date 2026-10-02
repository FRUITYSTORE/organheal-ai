begin;

-- Database envelope/storage bounds only, NOT medical plan validation. The
-- server repository uses the existing bounded JSON snapshot and plan validator
-- both before storage and after retrieval. No clinical approval is persisted.
create function public.medical_motion_context_envelope(
  schema_version text, execution_version text, asset_version text,
  clinical_message text, clinical_language text, candidate_plan jsonb
) returns boolean language sql immutable set search_path = '' as $$
  select coalesce(
    schema_version = '1' and execution_version = '1'
    and asset_version ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$'
    and length(btrim(clinical_message)) > 0
    and octet_length(clinical_message) <= 262144
    and length(clinical_message) <= 65536
    and clinical_language in ('en','ar')
    and octet_length(candidate_plan::text) <= 2097152
    and jsonb_typeof(candidate_plan) = 'object'
    and candidate_plan ?& array['planVersion','organ','topic','safety','mechanism','anatomy','documentedFindings','scenes']
    and (candidate_plan - array['planVersion','organ','topic','safety','mechanism','anatomy','documentedFindings','scenes']) = '{}'::jsonb
    and candidate_plan->>'planVersion' = '1'
    and jsonb_typeof(candidate_plan->'organ') = 'string'
    and jsonb_typeof(candidate_plan->'topic') = 'string'
    and candidate_plan->'safety' = '{"level":"none"}'::jsonb
    and jsonb_typeof(candidate_plan->'mechanism') = 'object'
    and jsonb_typeof(candidate_plan->'anatomy') = 'object'
    and jsonb_typeof(candidate_plan->'documentedFindings') = 'array'
    and jsonb_typeof(candidate_plan->'scenes') = 'array'
    and candidate_plan->'scenes' <> '[]'::jsonb,
    false);
$$;
revoke all on function public.medical_motion_context_envelope(text,text,text,text,text,jsonb)
from public, anon, authenticated, service_role;

create table public.medical_motion_execution_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  schema_version text not null,
  execution_version text not null,
  asset_version text not null,
  clinical_message text not null,
  clinical_language text not null,
  candidate_plan jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint medical_motion_context_valid_envelope check (
    public.medical_motion_context_envelope(schema_version,execution_version,asset_version,
      clinical_message,clinical_language,candidate_plan))
);
create index medical_motion_execution_contexts_owner_idx
on public.medical_motion_execution_contexts(user_id);
alter table public.medical_motion_execution_contexts enable row level security;
-- No raw PHI table privileges, including for service_role (BYPASSRLS).
revoke all on public.medical_motion_execution_contexts from public, anon, authenticated, service_role;

create function public.reject_medical_motion_context_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Medical Motion context is immutable' using errcode = '55000';
end $$;
revoke all on function public.reject_medical_motion_context_mutation() from public, anon, authenticated, service_role;
create trigger medical_motion_execution_contexts_immutable
before update or delete on public.medical_motion_execution_contexts
for each row execute function public.reject_medical_motion_context_mutation();

create function public.create_medical_motion_execution_context(
  p_user_id uuid, p_schema_version text, p_execution_version text, p_asset_version text,
  p_clinical_message text, p_clinical_language text, p_candidate_plan jsonb
) returns setof public.medical_motion_execution_contexts
language plpgsql security definer set search_path = '' as $$
begin
  -- Identity is supplied by the trusted server, never by an authenticated
  -- browser RPC. No client role can call this function.
  if p_user_id is null or not public.medical_motion_context_envelope(
    p_schema_version,p_execution_version,p_asset_version,p_clinical_message,p_clinical_language,p_candidate_plan) then
    raise exception 'Invalid Medical Motion context' using errcode = '22023';
  end if;
  return query insert into public.medical_motion_execution_contexts(
    user_id,schema_version,execution_version,asset_version,clinical_message,clinical_language,candidate_plan
  ) values(p_user_id,p_schema_version,p_execution_version,p_asset_version,p_clinical_message,p_clinical_language,p_candidate_plan)
  returning *;
end $$;

create function public.read_medical_motion_execution_context(p_context_id uuid, p_user_id uuid)
returns setof public.medical_motion_execution_contexts
language sql stable security definer set search_path = '' as $$
  select c.* from public.medical_motion_execution_contexts c
  where c.id = p_context_id and c.user_id = p_user_id;
$$;
revoke all on function public.create_medical_motion_execution_context(uuid,text,text,text,text,text,jsonb)
from public, anon, authenticated, service_role;
revoke all on function public.read_medical_motion_execution_context(uuid,uuid)
from public, anon, authenticated, service_role;
grant execute on function public.create_medical_motion_execution_context(uuid,text,text,text,text,text,jsonb) to service_role;
grant execute on function public.read_medical_motion_execution_context(uuid,uuid) to service_role;

-- Intentionally no deletion API or cascade: account deletion requires a future
-- retention policy that handles queued/running/result-linked contexts safely.
commit;
