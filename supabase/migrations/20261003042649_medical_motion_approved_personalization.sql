begin;
-- Owner-private approved snapshots share the existing context/job/artifact pipeline.
alter table public.background_jobs drop constraint background_jobs_type_check;
alter table public.background_jobs add constraint background_jobs_type_check check(job_type in ('pdf-extraction','report-analysis','health-intelligence','doctor-brief','patient-report','knowledge-recommendation','follow-up-delivery','medical-motion-render','medical-motion-compose'));
alter table public.background_jobs drop constraint background_job_motion_context_kind;
alter table public.background_jobs add constraint background_job_motion_context_kind check((job_type in ('medical-motion-render','medical-motion-compose') and execution_context_id is not null) or (job_type not in ('medical-motion-render','medical-motion-compose') and execution_context_id is null));
create table public.medical_motion_approved_specs (
 id uuid primary key, user_id uuid not null, context_id uuid not null, job_id uuid not null unique,
 logical_identity text not null check(logical_identity ~ '^[a-f0-9]{64}$'), content jsonb not null,
 created_at timestamptz not null default clock_timestamp(),
 foreign key(context_id,user_id) references public.medical_motion_execution_contexts(id,user_id) on delete restrict,
 foreign key(job_id,user_id) references public.background_jobs(id,user_id) on delete no action deferrable initially deferred,
 unique(user_id,context_id,logical_identity)
);
create index medical_motion_approved_specs_context on public.medical_motion_approved_specs(context_id);
alter table public.medical_motion_approved_specs enable row level security;
revoke all on public.medical_motion_approved_specs from public,anon,authenticated,service_role;
create trigger medical_motion_approved_specs_immutable before update or delete on public.medical_motion_approved_specs for each row execute function public.reject_medical_motion_context_mutation();
alter table public.background_jobs add column approved_personalization_spec_id uuid references public.medical_motion_approved_specs(id) on delete restrict;
alter table public.background_jobs add constraint background_jobs_composition_spec_kind check((job_type='medical-motion-compose') = (approved_personalization_spec_id is not null));
create unique index background_jobs_composition_spec_identity on public.background_jobs(approved_personalization_spec_id) where job_type='medical-motion-compose';
create index background_jobs_composition_active on public.background_jobs(lease_expires_at) where job_type='medical-motion-compose' and status='running';

create or replace function public.motion_artifact_operation(p_job_id uuid,p_user_id uuid,p_attempt_token uuid,p_action text,
  p_artifact_id uuid default null,p_media text default null,p_byte_size bigint default null,p_sha256 text default null)
returns setof public.medical_motion_artifacts language plpgsql security definer set search_path='' as $$
declare owned public.background_jobs%rowtype; item public.medical_motion_artifacts%rowtype;
begin
  select j.* into owned from public.background_jobs j where j.id=p_job_id for update;
  if not found or owned.user_id is distinct from p_user_id or owned.job_type not in ('medical-motion-render','medical-motion-compose')
    or owned.attempt_token is distinct from p_attempt_token or p_attempt_token is null
    or owned.status<>'running' or owned.lease_expires_at<=clock_timestamp() then
    raise exception 'ARTIFACT_OWNERSHIP_LOST' using errcode='OM403';
  end if;
  if p_action='list' then
    return query select a.* from public.medical_motion_artifacts a where a.job_id=owned.id and a.user_id=owned.user_id
      order by a.persisted_at desc nulls last,a.created_at desc; return;
  elsif p_action='reserve' then
    if p_media is null or p_media not in ('still','video') or p_byte_size is null or p_byte_size not between 1 and 67108864
      or p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'ARTIFACT_INVALID' using errcode='22023'; end if;
    select a.* into item from public.medical_motion_artifacts a where a.job_id=owned.id and a.origin_attempt=p_attempt_token;
    if found then
      if item.media<>p_media or item.byte_size<>p_byte_size or item.sha256<>p_sha256 then
        raise exception 'ARTIFACT_CONFLICT' using errcode='OM409'; end if;
    else
      insert into public.medical_motion_artifacts(user_id,job_id,origin_attempt,media,byte_size,sha256)
      values(p_user_id,p_job_id,p_attempt_token,p_media,p_byte_size,p_sha256) returning * into item;
    end if;
  elsif p_action='persist' then
    select a.* into item from public.medical_motion_artifacts a where a.id=p_artifact_id and a.job_id=owned.id and a.user_id=owned.user_id;
    if not found then raise exception 'ARTIFACT_INVALID' using errcode='22023'; end if;
    if item.persisted_at is null then
      update public.medical_motion_artifacts a set persisted_at=clock_timestamp() where a.id=item.id returning * into item;
    end if;
  else raise exception 'ARTIFACT_INVALID' using errcode='22023'; end if;
  -- Constraint work must not extend an expired attempt into registration.
  if owned.lease_expires_at<=clock_timestamp() then raise exception 'ARTIFACT_OWNERSHIP_LOST' using errcode='OM403'; end if;
  return next item;
end $$;

create or replace function public.guard_motion_completion() returns trigger language plpgsql set search_path='' as $$
begin
  if new.job_type in ('medical-motion-render','medical-motion-compose') and new.status='completed' and old.status is distinct from new.status
    and not exists(select 1 from public.background_job_results r where r.job_id=new.id
      and r.attempt_token=new.attempt_token and r.medical_motion_artifact_id=r.reference_id) then
    raise exception 'ARTIFACT_PUBLICATION_REQUIRED' using errcode='OM404';
  end if; return new;
end $$;

create or replace function public.check_motion_composition_base(p_job_id uuid,p_user_id uuid,p_attempt_token uuid,
  p_base_job_id uuid,p_base_artifact_id uuid,p_base_fingerprint text,p_output_fingerprint text,p_render_signature text)
returns boolean language plpgsql security definer set search_path='' as $$
declare owned public.background_jobs%rowtype;
begin
  select j.* into owned from public.background_jobs j where j.id=p_job_id for update;
  if not found or owned.user_id is distinct from p_user_id or owned.job_type not in ('medical-motion-render','medical-motion-compose') or
    p_attempt_token is null or owned.attempt_token is distinct from p_attempt_token or owned.status<>'running' or
    owned.lease_expires_at<=clock_timestamp() then raise exception 'COMPOSITION_OWNERSHIP_LOST' using errcode='OM403'; end if;
  return p_base_job_id<>p_job_id and coalesce(p_base_fingerprint,'') ~ '^[a-f0-9]{64}$' and
    exists(select 1 from public.read_published_motion_artifact(p_base_job_id,p_user_id) a where a.id=p_base_artifact_id) and
    not exists(select 1 from public.medical_motion_compositions c where c.artifact_id=p_base_artifact_id) and
    not exists(select 1 from public.medical_motion_reuse_links l where l.job_id=owned.id) and
    exists(select 1 from public.medical_motion_reuse_links l join public.medical_motion_reuse_keys k on k.cache_key=l.cache_key
      join public.background_job_results r on r.job_id=l.job_id and r.attempt_token=l.attempt_token
      where l.job_id=p_base_job_id and l.artifact_id=p_base_artifact_id and k.state='ready' and k.epoch=l.epoch
      and k.artifact_id=p_base_artifact_id and k.identity->>'baseFingerprint'=p_base_fingerprint
      and k.identity->>'outputFingerprint'=p_output_fingerprint and k.identity->>'renderSignature'=p_render_signature);
end $$;

create or replace function public.motion_composition_provenance(p_job_id uuid,p_user_id uuid,p_attempt_token uuid,
  p_artifact_id uuid,p_base_job_id uuid,p_base_artifact_id uuid,p_context_id uuid,p_provenance jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare owned public.background_jobs%rowtype; item public.medical_motion_compositions%rowtype;
begin
  select j.* into owned from public.background_jobs j where j.id=p_job_id for update;
  if not found or owned.user_id is distinct from p_user_id or owned.job_type not in ('medical-motion-render','medical-motion-compose')
    or owned.attempt_token is distinct from p_attempt_token or p_attempt_token is null or owned.status<>'running'
    or owned.lease_expires_at<=clock_timestamp() then raise exception 'COMPOSITION_OWNERSHIP_LOST' using errcode='OM403'; end if;
  if owned.execution_context_id is distinct from p_context_id or
    exists(select 1 from public.medical_motion_reuse_links l where l.job_id=owned.id or l.artifact_id=p_artifact_id) or
    exists(select 1 from public.medical_motion_reuse_keys k where k.artifact_id=p_artifact_id or k.producer_job_id=owned.id) or
    not exists(select 1 from public.medical_motion_artifacts a where a.id=p_artifact_id and a.job_id=owned.id
      and a.user_id=p_user_id and a.origin_attempt=p_attempt_token) or
    not exists(select 1 from public.read_published_motion_artifact(p_base_job_id,p_user_id) a where a.id=p_base_artifact_id) or
    exists(select 1 from public.medical_motion_compositions c where c.artifact_id=p_base_artifact_id) then
    raise exception 'COMPOSITION_INVALID' using errcode='22023'; end if;
  if p_provenance is null or jsonb_typeof(p_provenance)<>'object' or
    (select count(*) from jsonb_object_keys(p_provenance))<>11 or not(p_provenance ?& array[
      'compositionVersion','fingerprint','overlaySpecFingerprint','baseSha256','baseFingerprint','baseOutputFingerprint','baseRenderSignature','outputProfile','language','audioComponents','disposition']) or
    p_provenance->>'compositionVersion' is distinct from '1' or p_provenance->>'disposition' is distinct from 'private-composed' or
    coalesce(p_provenance->>'fingerprint','') !~ '^[a-f0-9]{64}$' or
    coalesce(p_provenance->>'overlaySpecFingerprint','') !~ '^[a-f0-9]{64}$' or
    coalesce(p_provenance->>'baseSha256','') !~ '^[a-f0-9]{64}$' or
    coalesce(p_provenance->>'baseFingerprint','') !~ '^[a-f0-9]{64}$' or
    coalesce(p_provenance->>'baseOutputFingerprint','') !~ '^[a-f0-9]{64}$' or
    coalesce(p_provenance->>'baseRenderSignature','') !~ '^[a-f0-9]{64}$' or
    coalesce(p_provenance->>'outputProfile','') not in ('16:9','9:16','1:1') or
    coalesce(p_provenance->>'language','') not in ('ar','en') or
    jsonb_typeof(p_provenance->'audioComponents') is distinct from 'array' or
    jsonb_array_length(p_provenance->'audioComponents')>40 or octet_length(p_provenance::text)>8192 or
    not exists(select 1 from public.medical_motion_artifacts a where a.id=p_base_artifact_id and a.sha256=p_provenance->>'baseSha256') or
    not exists(select 1 from public.medical_motion_reuse_links l join public.medical_motion_reuse_keys k on k.cache_key=l.cache_key
      join public.background_job_results r on r.job_id=l.job_id and r.attempt_token=l.attempt_token
      where l.job_id=p_base_job_id and l.artifact_id=p_base_artifact_id and k.state='ready' and k.epoch=l.epoch
        and k.artifact_id=p_base_artifact_id and k.identity->>'baseFingerprint'=p_provenance->>'baseFingerprint'
        and k.identity->>'outputFingerprint'=p_provenance->>'baseOutputFingerprint'
        and k.identity->>'renderSignature'=p_provenance->>'baseRenderSignature') then
    raise exception 'COMPOSITION_INVALID' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_provenance->'audioComponents') v where
    jsonb_typeof(v)<>'object' or (select count(*) from jsonb_object_keys(v))<>2 or not(v ?& array['id','version']) or
    coalesce(v->>'id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' or coalesce(v->>'version','') !~ '^[A-Za-z0-9_.-]{1,32}$') then
    raise exception 'COMPOSITION_INVALID' using errcode='22023'; end if;
  insert into public.medical_motion_compositions(artifact_id,base_artifact_id,base_job_id,user_id,job_id,context_id,origin_attempt,provenance)
    values(p_artifact_id,p_base_artifact_id,p_base_job_id,p_user_id,p_job_id,p_context_id,p_attempt_token,p_provenance) on conflict do nothing;
  select c.* into item from public.medical_motion_compositions c where c.artifact_id=p_artifact_id;
  if not found or item.provenance<>p_provenance or item.base_artifact_id<>p_base_artifact_id or item.base_job_id<>p_base_job_id or
    item.user_id<>p_user_id or item.job_id<>p_job_id or item.context_id<>p_context_id or item.origin_attempt<>p_attempt_token then
    raise exception 'COMPOSITION_CONFLICT' using errcode='OM409'; end if;
  if owned.lease_expires_at<=clock_timestamp() then raise exception 'COMPOSITION_OWNERSHIP_LOST' using errcode='OM403'; end if;
  return true;
end $$;

create or replace function public.read_motion_composition_intent(p_job_id uuid,p_user_id uuid,p_attempt_token uuid,p_fingerprint text)
returns uuid language plpgsql security definer set search_path='' as $$
declare owned public.background_jobs%rowtype; item public.medical_motion_compositions%rowtype;
begin
  select j.* into owned from public.background_jobs j where j.id=p_job_id for update;
  if not found or owned.user_id is distinct from p_user_id or owned.job_type not in ('medical-motion-render','medical-motion-compose') or
    p_attempt_token is null or owned.attempt_token is distinct from p_attempt_token or owned.status<>'running' or
    owned.lease_expires_at<=clock_timestamp() then raise exception 'COMPOSITION_OWNERSHIP_LOST' using errcode='OM403'; end if;
  select c.* into item from public.medical_motion_compositions c where c.job_id=p_job_id and c.user_id=p_user_id;
  if not found then return null; end if;
  if item.provenance->>'fingerprint' is distinct from p_fingerprint or
    not exists(select 1 from public.read_published_motion_artifact(item.base_job_id,p_user_id) a where a.id=item.base_artifact_id)
    then raise exception 'COMPOSITION_CONFLICT' using errcode='OM409'; end if;
  return item.artifact_id;
end $$;

create or replace function public.bind_motion_artifact_result() returns trigger language plpgsql set search_path='' as $$
declare owned public.background_jobs%rowtype; link public.medical_motion_reuse_links%rowtype; slot public.medical_motion_reuse_keys%rowtype;
begin
  select j.* into owned from public.background_jobs j where j.id=new.job_id;
  if owned.job_type='medical-motion-compose' then
    if not exists(select 1 from public.medical_motion_artifacts a join public.medical_motion_compositions c on c.artifact_id=a.id
      join public.medical_motion_approved_specs s on s.id=owned.approved_personalization_spec_id
      where a.id=new.reference_id and a.job_id=owned.id and a.user_id=owned.user_id and a.persisted_at is not null
      and c.job_id=owned.id and c.context_id=s.context_id and c.provenance->>'fingerprint'=s.content->>'fingerprint') then
      raise exception 'COMPOSITION_NOT_PERSISTED' using errcode='OM404'; end if;
    new.medical_motion_artifact_id:=new.reference_id;
  elsif owned.job_type='medical-motion-render' then
    select l.* into link from public.medical_motion_reuse_links l where l.job_id=owned.id and l.attempt_token=new.attempt_token;
    if found then
      select c.* into slot from public.medical_motion_reuse_keys c where c.cache_key=link.cache_key for update;
      if slot.state<>'ready' or slot.epoch<>link.epoch or slot.artifact_id is distinct from new.reference_id
        or link.artifact_id<>new.reference_id then raise exception 'REUSE_STALE_PUBLICATION' using errcode='OM409'; end if;
    elsif exists(select 1 from public.medical_motion_reuse_links l where l.artifact_id=new.reference_id) then
      raise exception 'REUSE_CURRENT_LINK_REQUIRED' using errcode='OM409';
    elsif not exists(select 1 from public.medical_motion_artifacts a where a.id=new.reference_id and a.job_id=owned.id
      and a.user_id=owned.user_id and a.persisted_at is not null) then raise exception 'ARTIFACT_NOT_PERSISTED' using errcode='OM404'; end if;
    if not exists(select 1 from public.medical_motion_artifacts a where a.id=new.reference_id and a.persisted_at is not null)
      then raise exception 'ARTIFACT_NOT_PERSISTED' using errcode='OM404'; end if;
    new.medical_motion_artifact_id:=new.reference_id;
  elsif new.medical_motion_artifact_id is not null then raise exception 'ARTIFACT_INVALID' using errcode='22023'; end if;
  return new;
end $$;

create or replace function public.claim_background_job_allowed(p_job_id uuid,p_allowed_job_types text[])
returns setof public.background_jobs language plpgsql security definer set search_path='' as $$
declare claimed_id uuid; db_time timestamptz;
begin
  if p_allowed_job_types is null or cardinality(p_allowed_job_types) not between 1 and 9 or
    array_position(p_allowed_job_types,null) is not null or not p_allowed_job_types <@ array[
    'pdf-extraction','report-analysis','health-intelligence','doctor-brief','patient-report','knowledge-recommendation','follow-up-delivery','medical-motion-render','medical-motion-compose']::text[] then
    raise exception 'Invalid server worker capabilities' using errcode='22023';
  end if;
  if 'medical-motion-compose'=any(p_allowed_job_types) then
    perform pg_advisory_xact_lock(71403042649);
    if (select count(*) from public.background_jobs where job_type='medical-motion-compose' and status='running'
      and lease_expires_at>clock_timestamp())>=4 then
      p_allowed_job_types:=array_remove(p_allowed_job_types,'medical-motion-compose');
    end if;
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

create function public.guard_approved_composition_job() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then
  if old.job_type='medical-motion-compose' then raise exception 'COMPOSITION_JOB_IMMUTABLE' using errcode='55000'; end if;
  return old;
 end if;
 if tg_op='UPDATE' and old.job_type='medical-motion-compose' and
   (new.id,new.user_id,new.job_type,new.payload,new.execution_context_id,new.approved_personalization_spec_id,new.request_id)
   is distinct from (old.id,old.user_id,old.job_type,old.payload,old.execution_context_id,old.approved_personalization_spec_id,old.request_id)
   then raise exception 'COMPOSITION_JOB_IMMUTABLE' using errcode='55000'; end if;
 if new.job_type='medical-motion-compose' then
  if tg_op='INSERT' and current_user <> pg_get_userbyid((select relowner from pg_class where oid='public.background_jobs'::regclass))
   then raise exception 'COMPOSITION_ATOMIC_APPROVAL_REQUIRED' using errcode='42501'; end if;
  if new.payload is distinct from jsonb_build_object('approvedPersonalizationSpecId',new.approved_personalization_spec_id::text,'compositionVersion','1')
   or not exists(select 1 from public.medical_motion_approved_specs s where s.id=new.approved_personalization_spec_id
    and s.user_id=new.user_id and s.context_id=new.execution_context_id and s.job_id=new.id)
   then raise exception 'COMPOSITION_JOB_INVALID' using errcode='22023'; end if;
 end if;
 return new;
end $$;
revoke all on function public.guard_approved_composition_job() from public,anon,authenticated,service_role;
create trigger background_jobs_approved_composition before insert or update or delete on public.background_jobs
 for each row execute function public.guard_approved_composition_job();

create function public.approve_motion_personalization(p_user_id uuid,p_content jsonb)
returns table(id uuid,job_id uuid,user_id uuid,content jsonb,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare item public.medical_motion_approved_specs%rowtype; v_context_id uuid; spec_id uuid; work_id uuid;
begin
 if p_user_id is null or p_content is null or jsonb_typeof(p_content)<>'object' or
  octet_length(p_content::text)>32768 or (select count(*) from jsonb_object_keys(p_content))<>18 or
  not(p_content ?& array['schemaVersion','producerVersion','compositionVersion','userId','contextId','sceneIndex','baseJobId','baseArtifactId','baseFingerprint','baseOutputFingerprint','renderSignature','baseSha256','duration','fingerprint','logicalIdentity','approvalDisposition','source','specification']) or
  p_content->>'userId' is distinct from p_user_id::text or p_content->>'schemaVersion' is distinct from '1' or
  p_content->>'producerVersion' is distinct from '1' or p_content->>'compositionVersion' is distinct from '1' or
  p_content->>'approvalDisposition' is distinct from 'structured-source' or
  coalesce(p_content->>'logicalIdentity','') !~ '^[a-f0-9]{64}$' or coalesce(p_content->>'fingerprint','') !~ '^[a-f0-9]{64}$' or
  jsonb_typeof(p_content->'source') is distinct from 'object' or p_content->'source'->>'kind' is distinct from 'health-check-in' or
  (select count(*) from jsonb_object_keys(p_content->'source'))<>4 or
  not(p_content->'source' ?& array['kind','id','field','fingerprint']) or
  coalesce(p_content->'source'->>'id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' or
  coalesce(p_content->'source'->>'fingerprint','') !~ '^[a-f0-9]{64}$' or
  p_content->'source'->>'field' is distinct from 'wellnessScore' or
  jsonb_typeof(p_content->'specification') is distinct from 'object' or
  p_content->'specification'->>'baseArtifactId' is distinct from p_content->>'baseArtifactId' or
  p_content->'specification'->>'compositionVersion' is distinct from '1' then
  raise exception 'APPROVED_SPEC_INVALID' using errcode='22023'; end if;
 v_context_id:=(p_content->>'contextId')::uuid;
 if not exists(select 1 from public.medical_motion_execution_contexts c where c.id=v_context_id and c.user_id=p_user_id) or
  not exists(select 1 from public.read_published_motion_artifact((p_content->>'baseJobId')::uuid,p_user_id) a
    join public.medical_motion_reuse_links l on l.job_id=(p_content->>'baseJobId')::uuid and l.artifact_id=a.id
    join public.medical_motion_reuse_keys k on k.cache_key=l.cache_key
    where a.id=(p_content->>'baseArtifactId')::uuid and a.sha256=p_content->>'baseSha256'
      and k.state='ready' and k.epoch=l.epoch and k.artifact_id=a.id
      and k.identity->>'baseFingerprint'=p_content->>'baseFingerprint'
      and k.identity->>'outputFingerprint'=p_content->>'baseOutputFingerprint'
      and k.identity->>'renderSignature'=p_content->>'renderSignature') then
  raise exception 'APPROVED_SPEC_SOURCE_UNAVAILABLE' using errcode='OM403'; end if;
 -- Full identity equality remains authoritative; hash collision only serializes.
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text||':'||v_context_id::text||':'||(p_content->>'logicalIdentity'),0));
 select s.* into item from public.medical_motion_approved_specs s where s.user_id=p_user_id and s.context_id=v_context_id
   and s.logical_identity=p_content->>'logicalIdentity';
 if found then
  if item.content is distinct from p_content then raise exception 'APPROVED_SPEC_CONFLICT' using errcode='OM409'; end if;
 else
  spec_id:=gen_random_uuid(); work_id:=gen_random_uuid();
  insert into public.medical_motion_approved_specs(id,user_id,context_id,job_id,logical_identity,content)
   values(spec_id,p_user_id,v_context_id,work_id,p_content->>'logicalIdentity',p_content) returning * into item;
  insert into public.background_jobs(id,user_id,request_id,job_type,payload,execution_context_id,approved_personalization_spec_id,available_at)
   values(work_id,p_user_id,work_id::text,'medical-motion-compose',jsonb_build_object('approvedPersonalizationSpecId',spec_id::text,'compositionVersion','1'),v_context_id,spec_id,clock_timestamp());
 end if;
 return query select item.id,item.job_id,item.user_id,item.content,item.created_at;
end $$;
revoke all on function public.approve_motion_personalization(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.approve_motion_personalization(uuid,jsonb) to service_role;

create function public.read_approved_motion_personalization(p_spec_id uuid,p_user_id uuid)
returns table(id uuid,job_id uuid,user_id uuid,content jsonb,created_at timestamptz)
language sql security definer set search_path='' as $$
 select s.id,s.job_id,s.user_id,s.content,s.created_at from public.medical_motion_approved_specs s
 where s.id=p_spec_id and s.user_id=p_user_id;
$$;
revoke all on function public.read_approved_motion_personalization(uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_approved_motion_personalization(uuid,uuid) to service_role;
create function public.cancel_motion_personalization(p_spec_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare work_id uuid; owned public.background_jobs%rowtype;
begin
 select s.job_id into work_id from public.medical_motion_approved_specs s where s.id=p_spec_id and s.user_id=p_user_id;
 if not found then return false; end if;
 select j.* into owned from public.background_jobs j where j.id=work_id for update;
 if owned.status='cancelled' then return true; end if;
 if owned.status not in ('pending','retrying','running') then return false; end if;
 update public.background_jobs j set status='cancelled',lease_expires_at=null,finished_at=clock_timestamp(),updated_at=clock_timestamp()
 where j.id=work_id; return true;
end $$;
revoke all on function public.cancel_motion_personalization(uuid,uuid) from public,anon,authenticated;
grant execute on function public.cancel_motion_personalization(uuid,uuid) to service_role;
create function public.motion_composition_attempt_current(p_spec_id uuid,p_user_id uuid,p_attempt_token uuid)
returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from public.medical_motion_approved_specs s join public.background_jobs j on j.id=s.job_id
 where s.id=p_spec_id and s.user_id=p_user_id and j.user_id=p_user_id and j.job_type='medical-motion-compose'
 and j.status='running' and j.attempt_token=p_attempt_token and j.lease_expires_at>clock_timestamp());
$$;
revoke all on function public.motion_composition_attempt_current(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.motion_composition_attempt_current(uuid,uuid,uuid) to service_role;
commit;
