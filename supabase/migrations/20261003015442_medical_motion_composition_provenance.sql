begin;
-- Provenance only; bytes, ownership and publication remain in the existing registry.
create table public.medical_motion_compositions (
  artifact_id uuid primary key references public.medical_motion_artifacts(id) on delete restrict,
  base_artifact_id uuid not null references public.medical_motion_artifacts(id) on delete restrict,
  base_job_id uuid not null references public.background_jobs(id) on delete restrict,
  user_id uuid not null,
  job_id uuid not null,
  context_id uuid not null references public.medical_motion_execution_contexts(id) on delete restrict,
  origin_attempt uuid not null,
  provenance jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  foreign key(job_id,user_id) references public.background_jobs(id,user_id) on delete restrict,
  check(artifact_id <> base_artifact_id),
  unique(job_id)
);
create index medical_motion_composition_base on public.medical_motion_compositions(base_artifact_id);
create index medical_motion_composition_base_job on public.medical_motion_compositions(base_job_id);
create index medical_motion_composition_context on public.medical_motion_compositions(context_id);
alter table public.medical_motion_compositions enable row level security;
revoke all on public.medical_motion_compositions from public,anon,authenticated,service_role;
create trigger medical_motion_compositions_immutable before update or delete on public.medical_motion_compositions
  for each row execute function public.reject_background_job_result_mutation();

create function public.check_motion_composition_base(p_job_id uuid,p_user_id uuid,p_attempt_token uuid,
  p_base_job_id uuid,p_base_artifact_id uuid,p_base_fingerprint text,p_output_fingerprint text,p_render_signature text)
returns boolean language plpgsql security definer set search_path='' as $$
declare owned public.background_jobs%rowtype;
begin
  select j.* into owned from public.background_jobs j where j.id=p_job_id for update;
  if not found or owned.user_id is distinct from p_user_id or owned.job_type<>'medical-motion-render' or
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
revoke all on function public.check_motion_composition_base(uuid,uuid,uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.check_motion_composition_base(uuid,uuid,uuid,uuid,uuid,text,text,text) to service_role;

create function public.motion_composition_provenance(p_job_id uuid,p_user_id uuid,p_attempt_token uuid,
  p_artifact_id uuid,p_base_job_id uuid,p_base_artifact_id uuid,p_context_id uuid,p_provenance jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare owned public.background_jobs%rowtype; item public.medical_motion_compositions%rowtype;
begin
  select j.* into owned from public.background_jobs j where j.id=p_job_id for update;
  if not found or owned.user_id is distinct from p_user_id or owned.job_type<>'medical-motion-render'
    or owned.attempt_token is distinct from p_attempt_token or p_attempt_token is null or owned.status<>'running'
    or owned.lease_expires_at<=clock_timestamp() then raise exception 'COMPOSITION_OWNERSHIP_LOST' using errcode='OM403'; end if;
  if owned.payload->>'executionContextId' is distinct from p_context_id::text or
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
revoke all on function public.motion_composition_provenance(uuid,uuid,uuid,uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.motion_composition_provenance(uuid,uuid,uuid,uuid,uuid,uuid,uuid,jsonb) to service_role;

create function public.read_motion_composition_intent(p_job_id uuid,p_user_id uuid,p_attempt_token uuid,p_fingerprint text)
returns uuid language plpgsql security definer set search_path='' as $$
declare owned public.background_jobs%rowtype; item public.medical_motion_compositions%rowtype;
begin
  select j.* into owned from public.background_jobs j where j.id=p_job_id for update;
  if not found or owned.user_id is distinct from p_user_id or owned.job_type<>'medical-motion-render' or
    p_attempt_token is null or owned.attempt_token is distinct from p_attempt_token or owned.status<>'running' or
    owned.lease_expires_at<=clock_timestamp() then raise exception 'COMPOSITION_OWNERSHIP_LOST' using errcode='OM403'; end if;
  select c.* into item from public.medical_motion_compositions c where c.job_id=p_job_id and c.user_id=p_user_id;
  if not found then return null; end if;
  if item.provenance->>'fingerprint' is distinct from p_fingerprint or
    not exists(select 1 from public.read_published_motion_artifact(item.base_job_id,p_user_id) a where a.id=item.base_artifact_id)
    then raise exception 'COMPOSITION_CONFLICT' using errcode='OM409'; end if;
  return item.artifact_id;
end $$;
revoke all on function public.read_motion_composition_intent(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.read_motion_composition_intent(uuid,uuid,uuid,text) to service_role;

create function public.reject_personalized_reuse() returns trigger language plpgsql set search_path='' as $$
begin
  if exists(select 1 from public.medical_motion_compositions c where c.artifact_id=new.artifact_id or c.job_id=new.producer_job_id) then
    raise exception 'PRIVATE_COMPOSITION_NOT_REUSABLE' using errcode='OM409'; end if;
  return new;
end $$;
create trigger medical_motion_reuse_no_composition before insert or update on public.medical_motion_reuse_keys
  for each row execute function public.reject_personalized_reuse();
create function public.reject_composition_reuse_link() returns trigger language plpgsql set search_path='' as $$
begin
  if exists(select 1 from public.medical_motion_compositions c where c.artifact_id=new.artifact_id or c.job_id=new.job_id) then
    raise exception 'PRIVATE_COMPOSITION_NOT_REUSABLE' using errcode='OM409'; end if;
  return new;
end $$;
create trigger medical_motion_link_no_composition before insert on public.medical_motion_reuse_links
  for each row execute function public.reject_composition_reuse_link();
create function public.guard_composition_publication() returns trigger language plpgsql set search_path='' as $$
declare item public.medical_motion_compositions%rowtype;
begin
  select c.* into item from public.medical_motion_compositions c where c.artifact_id=new.reference_id;
  if found and (item.job_id<>new.job_id or
    not exists(select 1 from public.read_published_motion_artifact(item.base_job_id,item.user_id) a where a.id=item.base_artifact_id)) then
    raise exception 'COMPOSITION_BASE_STALE' using errcode='OM409'; end if;
  return new;
end $$;
create trigger background_results_composition_guard before insert on public.background_job_results
  for each row execute function public.guard_composition_publication();
commit;
