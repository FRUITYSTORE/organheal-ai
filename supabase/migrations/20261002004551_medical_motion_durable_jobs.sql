begin;
alter table public.background_jobs drop constraint background_jobs_type_check;
alter table public.background_jobs add constraint background_jobs_type_check check(job_type in (
  'pdf-extraction','report-analysis','health-intelligence','doctor-brief','patient-report',
  'knowledge-recommendation','follow-up-delivery','medical-motion-render'));

alter table public.medical_motion_execution_contexts add constraint medical_motion_context_owner_identity unique(id,user_id);
alter table public.background_jobs add column execution_context_id uuid;
alter table public.background_jobs add constraint background_job_motion_context_owner_fk
foreign key(execution_context_id,user_id) references public.medical_motion_execution_contexts(id,user_id) on delete restrict;
alter table public.background_jobs add constraint background_job_motion_context_kind check(
  (job_type='medical-motion-render' and execution_context_id is not null) or
  (job_type<>'medical-motion-render' and execution_context_id is null));

create function public.medical_motion_job_payload_valid(p_payload jsonb,p_context_id uuid)
returns boolean language sql immutable set search_path='' as $$
  select coalesce(jsonb_typeof(p_payload)='object' and p_context_id is not null
    and p_payload->>'schemaVersion'='1' and p_payload->>'executionVersion'='1'
    and jsonb_typeof(p_payload->'sceneIndex')='number'
    and (p_payload->>'sceneIndex') ~ '^[0-9]{1,4}$'
    and p_payload->>'executionContextId'=p_context_id::text
    and p_payload = jsonb_build_object('schemaVersion','1','executionVersion','1',
      'executionContextId',p_context_id::text,'sceneIndex',p_payload->'sceneIndex')
    and case when (p_payload->>'sceneIndex') ~ '^[0-9]{1,4}$'
      then (p_payload->>'sceneIndex')::integer between 0 and 1023 else false end,false);
$$;
revoke all on function public.medical_motion_job_payload_valid(jsonb,uuid) from public,anon,authenticated,service_role;

create function public.guard_medical_motion_job_link()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' then
    if old.job_type='medical-motion-render' then raise exception 'Immutable Medical Motion work identity' using errcode='55000'; end if;
    return old;
  end if;
  if tg_op='UPDATE' and old.job_type='medical-motion-render' and
    (new.job_type is distinct from old.job_type or new.user_id is distinct from old.user_id or
      new.execution_context_id is distinct from old.execution_context_id or new.payload is distinct from old.payload or
      new.id is distinct from old.id or new.request_id is distinct from old.request_id) then
    raise exception 'Immutable Medical Motion work identity' using errcode='55000';
  end if;
  if new.job_type='medical-motion-render' then
    -- Service-role direct INSERT is not the atomic creation boundary. Existing
    -- unrelated enqueue RPCs cannot supply the required relational context link.
    if tg_op='INSERT' and current_user <> pg_get_userbyid((select relowner from pg_class where oid='public.background_jobs'::regclass)) then
      raise exception 'Medical Motion jobs require atomic enqueue' using errcode='42501';
    end if;
    if not public.medical_motion_job_payload_valid(new.payload,new.execution_context_id) or not exists(
      select 1 from public.medical_motion_execution_contexts c where c.id=new.execution_context_id and c.user_id=new.user_id
        and c.execution_version=new.payload->>'executionVersion') then
      raise exception 'Invalid Medical Motion job link' using errcode='22023';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_medical_motion_job_link() from public,anon,authenticated,service_role;
create trigger background_jobs_medical_motion_link before insert or update or delete on public.background_jobs
for each row execute function public.guard_medical_motion_job_link();
create unique index background_jobs_motion_work_identity on public.background_jobs(
  execution_context_id,(payload->>'executionVersion'),((payload->>'sceneIndex')::integer)) where job_type='medical-motion-render';

create table public.medical_motion_requests (
  user_id uuid not null references auth.users(id) on delete restrict,
  request_id uuid not null,
  execution_context_id uuid not null unique,
  primary key(user_id,request_id),
  foreign key(execution_context_id,user_id) references public.medical_motion_execution_contexts(id,user_id) on delete restrict
);
alter table public.medical_motion_requests enable row level security;
revoke all on public.medical_motion_requests from public,anon,authenticated,service_role;
create trigger medical_motion_requests_immutable before update or delete on public.medical_motion_requests
for each row execute function public.reject_medical_motion_context_mutation();

create function public.enqueue_medical_motion_job(p_user_id uuid,p_request_id uuid,
  p_schema_version text,p_execution_version text,p_asset_version text,p_clinical_message text,
  p_clinical_language text,p_candidate_plan jsonb,p_scene_index integer)
returns table(job_id uuid,execution_context_id uuid,created boolean)
language plpgsql security definer set search_path='' as $$
declare context public.medical_motion_execution_contexts%rowtype; context_id uuid; work_id uuid;
begin
  if p_user_id is null or p_request_id is null or p_scene_index is null or p_scene_index not between 0 and 1023 or
    not public.medical_motion_context_envelope(p_schema_version,p_execution_version,p_asset_version,p_clinical_message,p_clinical_language,p_candidate_plan) then
    raise exception 'Invalid Medical Motion enqueue' using errcode='22023';
  end if;
  -- Lock an opaque server request identity, never clinical text or a PHI hash.
  -- Hash collisions only serialize unrelated requests; equality uses full keys.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text||':'||p_request_id::text,0));
  select r.execution_context_id into context_id from public.medical_motion_requests r where r.user_id=p_user_id and r.request_id=p_request_id;
  if found then
    select c.* into context from public.medical_motion_execution_contexts c where c.id=context_id and c.user_id=p_user_id;
    if not found or context.schema_version is distinct from p_schema_version or context.execution_version is distinct from p_execution_version or
      context.asset_version is distinct from p_asset_version or context.clinical_message is distinct from p_clinical_message or
      context.clinical_language is distinct from p_clinical_language or context.candidate_plan is distinct from p_candidate_plan then
      raise exception 'Conflicting Medical Motion request' using errcode='OM409';
    end if;
  else
    select c.* into context from public.create_medical_motion_execution_context(p_user_id,p_schema_version,p_execution_version,
      p_asset_version,p_clinical_message,p_clinical_language,p_candidate_plan) c;
    context_id:=context.id;
    insert into public.medical_motion_requests(user_id,request_id,execution_context_id) values(p_user_id,p_request_id,context_id);
  end if;
  select j.id into work_id from public.background_jobs j where j.execution_context_id=context_id
    and j.job_type='medical-motion-render' and j.payload->>'executionVersion'=p_execution_version
    and (j.payload->>'sceneIndex')::integer=p_scene_index;
  if found then return query select work_id,context_id,false; return; end if;
  work_id:=gen_random_uuid();
  insert into public.background_jobs(id,user_id,request_id,job_type,payload,execution_context_id,available_at)
  values(work_id,p_user_id,work_id::text,'medical-motion-render',jsonb_build_object('schemaVersion','1',
    'executionContextId',context_id::text,'executionVersion',p_execution_version,'sceneIndex',p_scene_index),context_id,clock_timestamp());
  return query select work_id,context_id,true;
end $$;
revoke all on function public.enqueue_medical_motion_job(uuid,uuid,text,text,text,text,text,jsonb,integer) from public,anon,authenticated,service_role;
grant execute on function public.enqueue_medical_motion_job(uuid,uuid,text,text,text,text,text,jsonb,integer) to service_role;

create function public.claim_background_job_allowed(p_job_id uuid,p_allowed_job_types text[])
returns setof public.background_jobs language plpgsql security definer set search_path='' as $$
declare claimed_id uuid; db_time timestamptz;
begin
  if p_allowed_job_types is null or cardinality(p_allowed_job_types) not between 1 and 8 or
    array_position(p_allowed_job_types,null) is not null or not p_allowed_job_types <@ array[
    'pdf-extraction','report-analysis','health-intelligence','doctor-brief','patient-report','knowledge-recommendation','follow-up-delivery','medical-motion-render']::text[] then
    raise exception 'Invalid server worker capabilities' using errcode='22023';
  end if;
  select j.id into claimed_id from public.background_jobs j
  where (p_job_id is null or j.id=p_job_id) and j.job_type=any(p_allowed_job_types)
    and j.status in ('pending','retrying') and j.available_at<=clock_timestamp() and j.attempts<j.max_attempts
  order by j.available_at,j.created_at limit 1 for update skip locked;
  if claimed_id is null then return; end if;
  db_time:=clock_timestamp();
  return query update public.background_jobs j set status='running',attempt_token=gen_random_uuid(),
    lease_expires_at=db_time+interval '30 minutes',started_at=db_time,finished_at=null,updated_at=db_time
    where j.id=claimed_id returning j.*;
end $$;
revoke all on function public.claim_background_job_allowed(uuid,text[]) from public,anon,authenticated,service_role;

create function public.claim_next_background_job(p_allowed_job_types text[])
returns setof public.background_jobs language sql security definer set search_path='' as $$
  select * from public.claim_background_job_allowed(null,p_allowed_job_types);
$$;
create function public.claim_background_job_by_id(p_job_id uuid,p_allowed_job_types text[])
returns setof public.background_jobs language plpgsql security definer set search_path='' as $$
begin
  if p_job_id is null then return; end if;
  return query select * from public.claim_background_job_allowed(p_job_id,p_allowed_job_types);
end;
$$;
-- Legacy entry points fail closed to only the actual request-runtime handlers.
create or replace function public.claim_next_background_job()
returns setof public.background_jobs language sql security definer set search_path='' as $$
  select * from public.claim_background_job_allowed(null,array['pdf-extraction','follow-up-delivery']);
$$;
create or replace function public.claim_background_job_by_id(p_job_id uuid)
returns setof public.background_jobs language plpgsql security definer set search_path='' as $$
begin
  if p_job_id is null then return; end if;
  return query select * from public.claim_background_job_allowed(p_job_id,array['pdf-extraction','follow-up-delivery']);
end;
$$;
revoke all on function public.claim_next_background_job(text[]) from public,anon,authenticated,service_role;
revoke all on function public.claim_background_job_by_id(uuid,text[]) from public,anon,authenticated,service_role;
grant execute on function public.claim_next_background_job(text[]) to service_role;
grant execute on function public.claim_background_job_by_id(uuid,text[]) to service_role;
commit;
