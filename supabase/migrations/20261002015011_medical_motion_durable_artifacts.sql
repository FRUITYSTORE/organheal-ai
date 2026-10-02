begin;
-- Refuse legacy unverifiable Medical Motion results rather than legitimizing
-- fake UUIDs. Accepted non-Medical-Motion Step 4 references are unaffected.
do $$ begin
  if exists(select 1 from public.background_job_results r join public.background_jobs j on j.id=r.job_id
    where j.job_type='medical-motion-render') then
    raise exception 'LEGACY_MOTION_RESULTS_REQUIRE_REVIEW' using errcode='55000';
  end if;
end $$;
-- Private buckets alone do not constrain an existing permissive object policy.
-- On Supabase, intersect all anon/authenticated policies with this bucket deny.
-- The isolated PostgreSQL acceptance database has no Storage schema/provider.
do $$ begin
  if to_regclass('storage.objects') is not null then
    execute 'create policy medical_motion_private_objects on storage.objects as restrictive for all to anon,authenticated
      using (bucket_id <> ''medical-motion-artifacts'') with check (bucket_id <> ''medical-motion-artifacts'')';
  end if;
end $$;
alter table public.background_jobs add constraint background_jobs_id_owner_unique unique(id,user_id);
create table public.medical_motion_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  job_id uuid not null,
  origin_attempt uuid not null,
  media text not null check(media in ('still','video')),
  byte_size bigint not null check(byte_size between 1 and 67108864),
  sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default clock_timestamp(),
  persisted_at timestamptz,
  foreign key(job_id,user_id) references public.background_jobs(id,user_id) on delete restrict,
  unique(job_id,origin_attempt)
);
alter table public.medical_motion_artifacts enable row level security;
revoke all on public.medical_motion_artifacts from public,anon,authenticated,service_role;

create function public.guard_motion_artifact() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' or (to_jsonb(new)-'persisted_at') is distinct from (to_jsonb(old)-'persisted_at')
    or old.persisted_at is not null or new.persisted_at is null then
    raise exception 'ARTIFACT_IMMUTABLE' using errcode='55000';
  end if;
  return new;
end $$;
create trigger medical_motion_artifacts_immutable before update or delete on public.medical_motion_artifacts
for each row execute function public.guard_motion_artifact();

create function public.motion_artifact_operation(p_job_id uuid,p_user_id uuid,p_attempt_token uuid,p_action text,
  p_artifact_id uuid default null,p_media text default null,p_byte_size bigint default null,p_sha256 text default null)
returns setof public.medical_motion_artifacts language plpgsql security definer set search_path='' as $$
declare owned public.background_jobs%rowtype; item public.medical_motion_artifacts%rowtype;
begin
  select j.* into owned from public.background_jobs j where j.id=p_job_id for update;
  if not found or owned.user_id is distinct from p_user_id or owned.job_type<>'medical-motion-render'
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

-- Conditional real FK preserves non-Medical-Motion Step 4 semantics.
alter table public.background_job_results add column medical_motion_artifact_id uuid
  references public.medical_motion_artifacts(id) on delete restrict;
alter table public.background_job_results add constraint background_results_artifact_identity check
  (medical_motion_artifact_id is null or medical_motion_artifact_id=reference_id);
create function public.bind_motion_artifact_result() returns trigger language plpgsql set search_path='' as $$
declare owned public.background_jobs%rowtype;
begin
  select j.* into owned from public.background_jobs j where j.id=new.job_id;
  if owned.job_type='medical-motion-render' then
    if not exists(select 1 from public.medical_motion_artifacts a where a.id=new.reference_id and a.job_id=owned.id
      and a.user_id=owned.user_id and a.persisted_at is not null) then
      raise exception 'ARTIFACT_NOT_PERSISTED' using errcode='OM404'; end if;
    new.medical_motion_artifact_id:=new.reference_id;
  elsif new.medical_motion_artifact_id is not null then raise exception 'ARTIFACT_INVALID' using errcode='22023'; end if;
  return new;
end $$;
create trigger background_results_motion_artifact before insert on public.background_job_results
for each row execute function public.bind_motion_artifact_result();
create function public.guard_motion_completion() returns trigger language plpgsql set search_path='' as $$
begin
  if new.job_type='medical-motion-render' and new.status='completed' and old.status is distinct from new.status
    and not exists(select 1 from public.background_job_results r where r.job_id=new.id
      and r.attempt_token=new.attempt_token and r.medical_motion_artifact_id=r.reference_id) then
    raise exception 'ARTIFACT_PUBLICATION_REQUIRED' using errcode='OM404';
  end if; return new;
end $$;
create trigger background_jobs_motion_completion before update on public.background_jobs
for each row execute function public.guard_motion_completion();

create function public.resume_motion_artifact_job(p_job_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare owned public.background_jobs%rowtype; db_time timestamptz;
begin
  select j.* into owned from public.background_jobs j where j.id=p_job_id for update;
  if not found or owned.user_id is distinct from p_user_id or owned.job_type<>'medical-motion-render'
    or owned.status<>'awaiting-artifact-publication' then return false; end if;
  db_time:=clock_timestamp();
  update public.background_jobs j set attempts=least(j.attempts+1,j.max_attempts),
    status=case when j.attempts+1>=j.max_attempts then 'failed' else 'retrying' end,
    attempt_token=null,available_at=db_time,started_at=null,
    finished_at=case when j.attempts+1>=j.max_attempts then db_time else null end,
    last_error='ARTIFACT_RECOVERY_REQUIRED',updated_at=db_time where j.id=owned.id;
  return true;
end $$;
create function public.read_published_motion_artifact(p_job_id uuid,p_user_id uuid)
returns setof public.medical_motion_artifacts language sql security definer set search_path='' as $$
  select a.* from public.medical_motion_artifacts a join public.background_job_results r on r.medical_motion_artifact_id=a.id
  join public.background_jobs j on j.id=r.job_id
  where j.id=p_job_id and j.user_id=p_user_id and a.user_id=p_user_id and a.job_id=j.id and j.status='completed'
    and a.persisted_at is not null;
$$;
revoke all on function public.guard_motion_artifact(),public.bind_motion_artifact_result(),public.guard_motion_completion() from public,anon,authenticated,service_role;
revoke all on function public.motion_artifact_operation(uuid,uuid,uuid,text,uuid,text,bigint,text),
  public.resume_motion_artifact_job(uuid,uuid),public.read_published_motion_artifact(uuid,uuid) from public,anon,authenticated;
grant execute on function public.motion_artifact_operation(uuid,uuid,uuid,text,uuid,text,bigint,text),
  public.resume_motion_artifact_job(uuid,uuid),public.read_published_motion_artifact(uuid,uuid) to service_role;
commit;
