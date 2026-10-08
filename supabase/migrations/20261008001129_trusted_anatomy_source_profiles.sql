begin;
-- Nullable immutable provenance; legacy rows remain NULL without invented history.
create function public.motion_source_profile_bindings_valid(p_bindings jsonb,p_asset text,p_plan jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare scene jsonb; profile jsonb; k text; seen integer[] := '{}'; idx integer;
begin
  if p_bindings is null then return true; end if;
  if jsonb_typeof(p_bindings) is distinct from 'object' or
    p_bindings - array['bindingVersion','scenes'] <> '{}'::jsonb or
    jsonb_typeof(p_bindings->'bindingVersion') is distinct from 'string' or p_bindings->>'bindingVersion' is distinct from '1' or
    jsonb_typeof(p_bindings->'scenes') is distinct from 'array' or octet_length(p_bindings::text)>131072 then return false; end if;
  if jsonb_array_length(p_bindings->'scenes') not between 1 and 128 or
    jsonb_typeof(p_plan->'scenes') is distinct from 'array' then return false; end if;
  for scene in select value from jsonb_array_elements(p_bindings->'scenes') loop
    if jsonb_typeof(scene) is distinct from 'object' or scene - array['sceneIndex','profile'] <> '{}'::jsonb or
      jsonb_typeof(scene->'sceneIndex') is distinct from 'number' or coalesce(scene->>'sceneIndex','') !~ '^[0-9]{1,4}$' then return false; end if;
    idx := (scene->>'sceneIndex')::integer;
    if idx>=jsonb_array_length(p_plan->'scenes') or idx=any(seen) then return false; end if;
    seen := array_append(seen,idx); profile:=scene->'profile';
    if jsonb_typeof(profile) is distinct from 'object' or
      not (profile ?& array['profileId','profileVersion','organId','sourceId','sourceVersion','anatomyVersion','assetVersion','usage','fingerprint']) or
      profile - array['profileId','profileVersion','organId','sourceId','sourceVersion','anatomyVersion','assetVersion','usage','fingerprint'] <> '{}'::jsonb then return false; end if;
    foreach k in array array['profileId','profileVersion','organId','sourceId','sourceVersion','anatomyVersion','assetVersion'] loop
      if jsonb_typeof(profile->k) is distinct from 'string' or (profile->>k) !~ '^[A-Za-z0-9][A-Za-z0-9_.@-]{0,127}$' then return false; end if;
    end loop;
    if profile->>'assetVersion' is distinct from p_asset or profile->>'organId' is distinct from p_plan->>'organ' or
      jsonb_typeof(profile->'fingerprint') is distinct from 'string' or (profile->>'fingerprint') !~ '^[0-9a-f]{64}$' or
      profile->'usage' not in ('["internal-review"]'::jsonb,'["patient-facing"]'::jsonb,'["internal-review","patient-facing"]'::jsonb) then return false; end if;
  end loop;
  return true;
end $$;
revoke all on function public.motion_source_profile_bindings_valid(jsonb,text,jsonb) from public,anon,authenticated,service_role;

alter table public.medical_motion_execution_contexts add column source_profile_bindings jsonb;
alter table public.medical_motion_execution_contexts add constraint motion_context_profile_envelope
check(public.motion_source_profile_bindings_valid(source_profile_bindings,asset_version,candidate_plan));
-- Existing BEFORE UPDATE/DELETE trigger covers the new column too.
create function public.create_medical_motion_profile_context_v1(p_user_id uuid,p_schema_version text,p_execution_version text,
  p_asset_version text,p_clinical_message text,p_clinical_language text,p_candidate_plan jsonb,p_source_profile_bindings jsonb)
returns setof public.medical_motion_execution_contexts language plpgsql security definer set search_path='' as $$
begin
  if p_user_id is null or p_source_profile_bindings is null or
    not public.medical_motion_context_envelope(p_schema_version,p_execution_version,p_asset_version,p_clinical_message,p_clinical_language,p_candidate_plan) or
    not public.motion_source_profile_bindings_valid(p_source_profile_bindings,p_asset_version,p_candidate_plan) then
    raise exception 'Invalid Medical Motion profile context' using errcode='22023'; end if;
  return query insert into public.medical_motion_execution_contexts(user_id,schema_version,execution_version,asset_version,
    clinical_message,clinical_language,candidate_plan,source_profile_bindings)
  values(p_user_id,p_schema_version,p_execution_version,p_asset_version,p_clinical_message,p_clinical_language,p_candidate_plan,p_source_profile_bindings) returning *;
end $$;
revoke all on function public.create_medical_motion_profile_context_v1(uuid,text,text,text,text,text,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.create_medical_motion_profile_context_v1(uuid,text,text,text,text,text,jsonb,jsonb) to service_role;
-- Refresh the composite projection after the additive column, keeping the old RPC name.
create or replace function public.read_medical_motion_execution_context(p_context_id uuid,p_user_id uuid)
returns setof public.medical_motion_execution_contexts language sql stable security definer set search_path='' as $$
  select c.* from public.medical_motion_execution_contexts c where c.id=p_context_id and c.user_id=p_user_id;
$$;
revoke all on function public.read_medical_motion_execution_context(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.read_medical_motion_execution_context(uuid,uuid) to service_role;

create function public.motion_source_profile_identity_valid(p_identity jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
begin
  if p_identity is null or jsonb_typeof(p_identity) is distinct from 'object' then return false; end if;
  return p_identity ?& array['profileId','profileVersion','fingerprint'] and
    p_identity - array['profileId','profileVersion','fingerprint'] = '{}'::jsonb and
    jsonb_typeof(p_identity->'profileId')='string' and coalesce(p_identity->>'profileId','') ~ '^[A-Za-z0-9][A-Za-z0-9_.@-]{0,127}$' and
    jsonb_typeof(p_identity->'profileVersion')='string' and coalesce(p_identity->>'profileVersion','') ~ '^[A-Za-z0-9][A-Za-z0-9_.@-]{0,127}$' and
    jsonb_typeof(p_identity->'fingerprint')='string' and coalesce(p_identity->>'fingerprint','') ~ '^[0-9a-f]{64}$';
end $$;
revoke all on function public.motion_source_profile_identity_valid(jsonb) from public,anon,authenticated,service_role;

-- Only bounded identity validation changes; lease/epoch/publication guards remain intact.
create or replace function public.motion_reuse_operation(p_job_id uuid,p_user_id uuid,p_attempt_token uuid,
  p_action text,p_identity jsonb,p_epoch bigint default null,p_artifact_id uuid default null)
returns table(outcome text,epoch bigint,artifact_id uuid,media text,byte_size bigint,sha256 text,persisted boolean,deep_required boolean)
language plpgsql security definer set search_path='' as $$
declare owned public.background_jobs%rowtype; slot public.medical_motion_reuse_keys%rowtype;
  item public.medical_motion_artifacts%rowtype; producer public.background_jobs%rowtype; disposition text;
  key text := p_identity->>'key';
begin
  select j.* into owned from public.background_jobs j where j.id=p_job_id for update;
  if not found or owned.user_id is distinct from p_user_id or owned.job_type<>'medical-motion-render'
    or p_attempt_token is null or owned.attempt_token is distinct from p_attempt_token or owned.status<>'running'
    or owned.lease_expires_at<=clock_timestamp() then raise exception 'REUSE_OWNERSHIP_LOST' using errcode='OM403'; end if;
  if p_identity is null or jsonb_typeof(p_identity)<>'object' or
    not ((select count(*) from jsonb_object_keys(p_identity))=10 and not (p_identity ? 'sourceProfile') or
      (select count(*) from jsonb_object_keys(p_identity))=11 and p_identity ? 'sourceProfile' and
        public.motion_source_profile_identity_valid(p_identity->'sourceProfile')) or
    not (p_identity ?& array['key','baseFingerprint','outputFingerprint','renderSignature','scope','media','sceneDslVersion','compilerVersion','mechanismId','mechanismVersion']) or
    key is null or key !~ '^[0-9a-f]{64}$' or
    coalesce(p_identity->>'baseFingerprint','') !~ '^[0-9a-f]{64}$' or
    coalesce(p_identity->>'outputFingerprint','') !~ '^[0-9a-f]{64}$' or
    coalesce(p_identity->>'renderSignature','') !~ '^[0-9a-f]{64}$' or
    coalesce(p_identity->>'scope','') not in ('internal-review','patient-facing') or
    coalesce(p_identity->>'media','') not in ('still','video') or
    p_identity->>'sceneDslVersion' is distinct from '1' or p_identity->>'compilerVersion' is distinct from '1' or
    coalesce(p_identity->>'mechanismId','') !~ '^[A-Za-z][A-Za-z0-9_-]{0,127}$' or
    coalesce(p_identity->>'mechanismVersion','') !~ '^[A-Za-z0-9_.-]{1,64}$' then raise exception 'REUSE_INVALID' using errcode='22023'; end if;
  if p_action='reserve' then
    insert into public.medical_motion_reuse_keys(cache_key,identity,scope,state,producer_job_id,producer_attempt)
      values(key,p_identity,p_identity->>'scope','pending',owned.id,p_attempt_token) on conflict do nothing;
  end if;
  select c.* into slot from public.medical_motion_reuse_keys c where c.cache_key=key for update;
  if not found then raise exception 'REUSE_UNKNOWN' using errcode='OM409'; end if;
  if slot.identity<>p_identity or slot.scope<>p_identity->>'scope' then raise exception 'REUSE_IDENTITY_CONFLICT' using errcode='OM409'; end if;
  if p_action='reserve' then
    if slot.state='ready' then disposition:='CACHE_HIT';
    elsif slot.state='pending' and slot.producer_job_id=owned.id and slot.producer_attempt=p_attempt_token then disposition:='CACHE_MISS';
    else
      select j.* into producer from public.background_jobs j where j.id=slot.producer_job_id;
      if slot.state='pending' and producer.status='running' and producer.attempt_token=slot.producer_attempt
        and producer.lease_expires_at>clock_timestamp() then disposition:='CACHE_CONFLICT';
      else
        -- Only intents created after this reservation can be recovered. Never promote legacy bytes.
        if slot.state='pending' and slot.artifact_id is null then
          select a.* into item from public.medical_motion_artifacts a
            where a.job_id=slot.producer_job_id and a.origin_attempt=slot.producer_attempt and a.created_at>=slot.reserved_at;
        end if;
        update public.medical_motion_reuse_keys c set state='pending',epoch=c.epoch+1,
          producer_job_id=owned.id,producer_attempt=p_attempt_token,reserved_at=clock_timestamp(),
          artifact_id=case when slot.state='pending' then coalesce(slot.artifact_id,item.id) else null end
          where c.cache_key=key returning * into slot;
        disposition:='CACHE_MISS';
      end if;
    end if;
  else
    if slot.epoch is distinct from p_epoch then raise exception 'REUSE_EPOCH_LOST' using errcode='OM409'; end if;
    if p_action in ('ready','discard') and (slot.state<>'pending' or slot.producer_job_id<>owned.id or slot.producer_attempt<>p_attempt_token)
      then raise exception 'REUSE_RESERVATION_LOST' using errcode='OM403'; end if;
    if p_action='discard' then
      update public.medical_motion_reuse_keys c set artifact_id=null where c.cache_key=key returning * into slot;
      disposition:='CACHE_MISS';
    elsif p_action='invalidate' then
      if slot.state<>'ready' or slot.artifact_id is distinct from p_artifact_id then raise exception 'REUSE_CONFLICT' using errcode='OM409'; end if;
      update public.medical_motion_reuse_keys c set state='invalid' where c.cache_key=key returning * into slot;
      disposition:='CACHE_INVALID';
    elsif p_action='ready' then
      select a.* into item from public.medical_motion_artifacts a where a.id=p_artifact_id;
      if not found or item.media<>p_identity->>'media' or
        not (item.id=slot.artifact_id or (item.job_id=owned.id and item.user_id=owned.user_id
          and item.origin_attempt=p_attempt_token and item.created_at>=slot.reserved_at and item.persisted_at is not null))
        then raise exception 'REUSE_ARTIFACT_INVALID' using errcode='22023'; end if;
      if item.persisted_at is null then
        update public.medical_motion_artifacts a set persisted_at=clock_timestamp() where a.id=item.id returning * into item;
      end if;
      update public.medical_motion_reuse_keys c set state='ready',artifact_id=item.id,verified_at=clock_timestamp() where c.cache_key=key returning * into slot;
      disposition:='CACHE_HIT';
    elsif p_action='verified' then
      if slot.state<>'ready' or slot.artifact_id is distinct from p_artifact_id then raise exception 'REUSE_NOT_READY' using errcode='OM409'; end if;
      update public.medical_motion_reuse_keys c set verified_at=clock_timestamp() where c.cache_key=key returning * into slot;
      disposition:='CACHE_HIT';
    elsif p_action='link' then
      if slot.state<>'ready' or slot.artifact_id is distinct from p_artifact_id then raise exception 'REUSE_NOT_READY' using errcode='OM409'; end if;
      disposition:='CACHE_HIT';
    else raise exception 'REUSE_INVALID' using errcode='22023'; end if;
    if p_action in ('ready','link') then
      insert into public.medical_motion_reuse_links(job_id,attempt_token,cache_key,epoch,artifact_id,disposition,authorization_version)
        values(owned.id,p_attempt_token,key,slot.epoch,slot.artifact_id,case when p_action='ready' and item.job_id=owned.id and item.origin_attempt=p_attempt_token then 'render-created' else 'reused' end,'1') on conflict do nothing;
      if not exists(select 1 from public.medical_motion_reuse_links l where l.job_id=owned.id and l.attempt_token=p_attempt_token
        and l.cache_key=key and l.epoch=slot.epoch and l.artifact_id=slot.artifact_id)
        then raise exception 'REUSE_LINK_CONFLICT' using errcode='OM409'; end if;
    end if;
  end if;
  if owned.lease_expires_at<=clock_timestamp() then raise exception 'REUSE_OWNERSHIP_LOST' using errcode='OM403'; end if;
  if slot.artifact_id is not null then select a.* into item from public.medical_motion_artifacts a where a.id=slot.artifact_id; end if;
  return query select disposition,slot.epoch,slot.artifact_id,item.media,item.byte_size,item.sha256,
    case when slot.artifact_id is null then null else item.persisted_at is not null end,
    slot.verified_at is null or slot.verified_at<clock_timestamp()-interval '15 minutes';
end $$;
revoke all on function public.motion_reuse_operation(uuid,uuid,uuid,text,jsonb,bigint,uuid) from public,anon,authenticated,service_role;
grant execute on function public.motion_reuse_operation(uuid,uuid,uuid,text,jsonb,bigint,uuid) to service_role;


-- Unique name avoids PostgREST overload ambiguity; request/scene idempotency is preserved.
create function public.enqueue_medical_motion_profile_job_v1(p_user_id uuid,p_request_id uuid,
  p_schema_version text,p_execution_version text,p_asset_version text,p_clinical_message text,
  p_clinical_language text,p_candidate_plan jsonb,p_scene_index integer,p_source_profile_bindings jsonb)
returns table(job_id uuid,execution_context_id uuid,created boolean)
language plpgsql security definer set search_path='' as $$
declare context public.medical_motion_execution_contexts%rowtype; context_id uuid; work_id uuid;
begin
  if p_user_id is null or p_request_id is null or p_scene_index is null or p_scene_index not between 0 and 1023 or
    p_source_profile_bindings is null or not public.motion_source_profile_bindings_valid(p_source_profile_bindings,p_asset_version,p_candidate_plan) or
    not exists(select 1 from jsonb_array_elements(p_source_profile_bindings->'scenes') s where (s->>'sceneIndex')::integer=p_scene_index) or
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
      context.clinical_language is distinct from p_clinical_language or context.candidate_plan is distinct from p_candidate_plan or context.source_profile_bindings is distinct from p_source_profile_bindings then
      raise exception 'Conflicting Medical Motion request' using errcode='OM409';
    end if;
  else
    select c.* into context from public.create_medical_motion_profile_context_v1(p_user_id,p_schema_version,p_execution_version,
      p_asset_version,p_clinical_message,p_clinical_language,p_candidate_plan,p_source_profile_bindings) c;
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
revoke all on function public.enqueue_medical_motion_profile_job_v1(uuid,uuid,text,text,text,text,text,jsonb,integer,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.enqueue_medical_motion_profile_job_v1(uuid,uuid,text,text,text,text,text,jsonb,integer,jsonb) to service_role;


-- Legacy callers cannot accidentally adopt a profile-aware revision.
create or replace function public.enqueue_medical_motion_job(p_user_id uuid,p_request_id uuid,
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
      context.clinical_language is distinct from p_clinical_language or context.candidate_plan is distinct from p_candidate_plan or context.source_profile_bindings is not null then
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


commit;
