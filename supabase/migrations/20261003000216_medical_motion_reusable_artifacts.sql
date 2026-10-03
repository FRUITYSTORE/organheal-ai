begin;
-- Coordination and per-job provenance only: bytes remain in the existing registry.
create table public.medical_motion_reuse_keys (
  cache_key text primary key check(cache_key ~ '^[0-9a-f]{64}$'),
  identity jsonb not null,
  scope text not null check(scope in ('internal-review','patient-facing')),
  state text not null check(state in ('pending','ready','invalid')),
  epoch bigint not null default 1 check(epoch > 0),
  producer_job_id uuid not null references public.background_jobs(id) on delete restrict,
  producer_attempt uuid not null,
  reserved_at timestamptz not null default clock_timestamp(),
  verified_at timestamptz,
  artifact_id uuid references public.medical_motion_artifacts(id) on delete restrict,
  check(state <> 'ready' or artifact_id is not null)
);
create index motion_reuse_producer on public.medical_motion_reuse_keys(producer_job_id);
create index motion_reuse_artifact on public.medical_motion_reuse_keys(artifact_id);
create table public.medical_motion_reuse_links (
  job_id uuid not null references public.background_jobs(id) on delete restrict,
  attempt_token uuid not null,
  cache_key text not null references public.medical_motion_reuse_keys(cache_key) on delete restrict,
  epoch bigint not null,
  artifact_id uuid not null references public.medical_motion_artifacts(id) on delete restrict,
  disposition text not null check(disposition in ('render-created','reused')),
  authorization_version text not null check(authorization_version = '1'),
  primary key(job_id,attempt_token)
);
create index motion_reuse_link_key on public.medical_motion_reuse_links(cache_key);
create index motion_reuse_link_artifact on public.medical_motion_reuse_links(artifact_id);
alter table public.medical_motion_reuse_keys enable row level security;
alter table public.medical_motion_reuse_links enable row level security;
revoke all on public.medical_motion_reuse_keys,public.medical_motion_reuse_links from public,anon,authenticated,service_role;
create trigger medical_motion_reuse_links_immutable before update or delete on public.medical_motion_reuse_links
for each row execute function public.reject_background_job_result_mutation();

create function public.motion_reuse_operation(p_job_id uuid,p_user_id uuid,p_attempt_token uuid,
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
    (select count(*) from jsonb_object_keys(p_identity))<>10 or
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
revoke all on function public.motion_reuse_operation(uuid,uuid,uuid,text,jsonb,bigint,uuid) from public,anon,authenticated;
grant execute on function public.motion_reuse_operation(uuid,uuid,uuid,text,jsonb,bigint,uuid) to service_role;

create or replace function public.bind_motion_artifact_result() returns trigger language plpgsql set search_path='' as $$
declare owned public.background_jobs%rowtype; link public.medical_motion_reuse_links%rowtype; slot public.medical_motion_reuse_keys%rowtype;
begin
  select j.* into owned from public.background_jobs j where j.id=new.job_id;
  if owned.job_type='medical-motion-render' then
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
-- Project consumer ownership only; never expose producer's private job/user metadata.
create or replace function public.read_published_motion_artifact(p_job_id uuid,p_user_id uuid)
returns setof public.medical_motion_artifacts language sql security definer set search_path='' as $$
  select a.id,j.user_id,j.id,case when l.job_id is null then a.origin_attempt else r.attempt_token end,a.media,a.byte_size,a.sha256,a.created_at,a.persisted_at
  from public.background_jobs j join public.background_job_results r on r.job_id=j.id
  join public.medical_motion_artifacts a on a.id=r.medical_motion_artifact_id
  left join public.medical_motion_reuse_links l on l.job_id=j.id and l.attempt_token=r.attempt_token
  left join public.medical_motion_reuse_keys c on c.cache_key=l.cache_key
  where j.id=p_job_id and j.user_id=p_user_id and j.status='completed' and a.persisted_at is not null
    and ((l.job_id is null and a.job_id=j.id and a.user_id=j.user_id) or
      (l.artifact_id=a.id and c.state='ready' and c.epoch=l.epoch and c.artifact_id=a.id));
$$;
commit;
