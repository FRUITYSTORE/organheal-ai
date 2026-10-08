begin;
create table public.medical_motion_orchestrations (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete restrict,
 context_id uuid not null, revision_id uuid not null, sequence jsonb not null,
 sequence_fingerprint text not null check(sequence_fingerprint ~ '^[a-f0-9]{64}$'),
 language text not null check(language in ('ar','en')), aspect_ratio text not null check(aspect_ratio in ('16:9','9:16','1:1')),
 base_job_ids uuid[] not null default '{}', spec_id uuid references public.medical_motion_approved_specs(id) on delete restrict,
 compose_job_id uuid references public.background_jobs(id) on delete restrict,
 final_artifact_id uuid references public.medical_motion_artifacts(id) on delete restrict,
 status text not null default 'queued' check(status in ('queued','preparing','rendering','waiting-for-bases','approving-timeline','composing','ready','failed','cancelled')),
 failure_code text check(failure_code in ('sequence-unavailable','base-unavailable','composition-failed')),
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
 foreign key(context_id,user_id) references public.medical_motion_execution_contexts(id,user_id) on delete restrict
);
alter table public.medical_motion_orchestrations enable row level security;
revoke all on public.medical_motion_orchestrations from public,anon,authenticated,service_role;
create index medical_motion_orchestrations_pending on public.medical_motion_orchestrations(created_at) where status not in ('ready','failed','cancelled');
create function public.guard_motion_orchestration_v1() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'ORCHESTRATION_IMMUTABLE' using errcode='55000';end if;
 if (new.id,new.user_id,new.context_id,new.revision_id,new.sequence,new.sequence_fingerprint,new.language,new.aspect_ratio,new.created_at)
  is distinct from (old.id,old.user_id,old.context_id,old.revision_id,old.sequence,old.sequence_fingerprint,old.language,old.aspect_ratio,old.created_at) or
  cardinality(old.base_job_ids)>0 and new.base_job_ids is distinct from old.base_job_ids or
  old.spec_id is not null and (new.spec_id,new.compose_job_id) is distinct from (old.spec_id,old.compose_job_id) or
  old.status in ('ready','failed','cancelled') and new.status is distinct from old.status
  then raise exception 'ORCHESTRATION_IMMUTABLE' using errcode='55000';end if;
 return new;
end $$;
revoke all on function public.guard_motion_orchestration_v1() from public,anon,authenticated,service_role;
create trigger motion_orchestration_identity before update or delete on public.medical_motion_orchestrations for each row execute function public.guard_motion_orchestration_v1();

create function public.motion_orchestration_operation_v1(p_user_id uuid,p_action text,p_id uuid default null,p_input jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.medical_motion_orchestrations%rowtype; ctx public.medical_motion_execution_contexts%rowtype;
 rev uuid; idx integer; scene integer; n integer; boundary jsonb; approved_id uuid; timeline public.medical_motion_approved_specs%rowtype; final_id uuid; state text;
begin
 if p_action='pending' then
  return (select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (select * from public.medical_motion_orchestrations where status not in ('ready','failed','cancelled') order by created_at,id limit 10) r);
 end if;
 if p_user_id is null or p_id is null then raise exception 'ORCHESTRATION_INVALID' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('motion-orchestration:'||p_id::text,0));
 select o.* into item from public.medical_motion_orchestrations o where o.id=p_id for update;
 if found and item.user_id<>p_user_id then return null;end if;
 if p_action='create' then
  if p_input is null or jsonb_typeof(p_input)<>'object' or (select count(*) from jsonb_object_keys(p_input))<>5 or
   not(p_input ?& array['contextId','sequence','fingerprint','language','aspectRatio']) or
   coalesce(p_input->>'fingerprint','') !~ '^[a-f0-9]{64}$' or coalesce(p_input->>'language','') not in ('ar','en') then raise exception 'ORCHESTRATION_INVALID' using errcode='22023';end if;
  select c.* into ctx from public.medical_motion_execution_contexts c where c.id=(p_input->>'contextId')::uuid and c.user_id=p_user_id;
  if not found or ctx.source_profile_bindings is null then raise exception 'ORCHESTRATION_INVALID' using errcode='22023';end if;
  select r.request_id into rev from public.medical_motion_requests r where r.execution_context_id=ctx.id and r.user_id=p_user_id;
  if rev is null then raise exception 'ORCHESTRATION_REVISION_REQUIRED' using errcode='22023';end if;
  if jsonb_typeof(p_input->'sequence') is distinct from 'object' or (select count(*) from jsonb_object_keys(p_input->'sequence'))<>6 or
   not(p_input->'sequence' ?& array['sequenceId','sequenceVersion','sceneIndices','transitions','usage','aspectRatios']) or
   coalesce(p_input->'sequence'->>'sequenceId','') !~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$' or
   coalesce(p_input->'sequence'->>'sequenceVersion','') !~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$' or
   p_input->'sequence'->>'usage' is distinct from 'internal-review' or
   jsonb_typeof(p_input->'sequence'->'sceneIndices') is distinct from 'array' or
   jsonb_typeof(p_input->'sequence'->'transitions') is distinct from 'array' or
   jsonb_typeof(p_input->'sequence'->'aspectRatios') is distinct from 'array' then raise exception 'ORCHESTRATION_INVALID' using errcode='22023';end if;
  n:=jsonb_array_length(p_input->'sequence'->'sceneIndices');
  if n not between 2 and 8 or jsonb_array_length(p_input->'sequence'->'transitions')<>n-1 or
   not(p_input->'sequence'->'aspectRatios' @> to_jsonb(array[p_input->>'aspectRatio'])) or
   (select count(distinct v) from jsonb_array_elements(p_input->'sequence'->'sceneIndices') v)<>n then raise exception 'ORCHESTRATION_INVALID' using errcode='22023';end if;
  if jsonb_array_length(p_input->'sequence'->'aspectRatios') not between 1 and 3 or exists(select 1 from jsonb_array_elements_text(p_input->'sequence'->'aspectRatios') v where v not in ('16:9','9:16','1:1')) then raise exception 'ORCHESTRATION_INVALID' using errcode='22023';end if;
  for idx in 0..n-2 loop
   boundary:=p_input->'sequence'->'transitions'->idx;
   if jsonb_typeof(boundary) is distinct from 'object' or (select count(*) from jsonb_object_keys(boundary))<>3 or
    not(boundary ?& array['boundaryIndex','kind','duration']) or boundary->'boundaryIndex' is distinct from to_jsonb(idx) or
    jsonb_typeof(boundary->'duration') is distinct from 'number' or
    not(coalesce(boundary->>'kind','')='cut' and (boundary->>'duration')::numeric=0 or coalesce(boundary->>'kind','')='fade-through-neutral' and (boundary->>'duration')::numeric between .15 and .75)
    then raise exception 'ORCHESTRATION_INVALID' using errcode='22023';end if;
  end loop;
  for idx in 0..n-1 loop
   if coalesce(p_input->'sequence'->'sceneIndices'->>idx,'') !~ '^[0-9]{1,4}$' then raise exception 'ORCHESTRATION_INVALID' using errcode='22023';end if;
   scene:=(p_input->'sequence'->'sceneIndices'->>idx)::integer;
   if scene>=jsonb_array_length(ctx.candidate_plan->'scenes') or not exists(select 1 from jsonb_array_elements(ctx.source_profile_bindings->'scenes') b where b->'sceneIndex'=to_jsonb(scene) and b->'profile'->'usage' @> '["internal-review"]') then raise exception 'ORCHESTRATION_INVALID' using errcode='22023';end if;
  end loop;
  if item.id is not null then
   if (item.context_id,item.sequence,item.sequence_fingerprint,item.language,item.aspect_ratio) is distinct from
    (ctx.id,p_input->'sequence',p_input->>'fingerprint',p_input->>'language',p_input->>'aspectRatio') then raise exception 'ORCHESTRATION_CONFLICT' using errcode='OM409';end if;
  else
   insert into public.medical_motion_orchestrations(id,user_id,context_id,revision_id,sequence,sequence_fingerprint,language,aspect_ratio)
    values(p_id,p_user_id,ctx.id,rev,p_input->'sequence',p_input->>'fingerprint',p_input->>'language',p_input->>'aspectRatio') returning * into item;
  end if;
  return to_jsonb(item);
 end if;
 if item.id is null then return null;end if;
 if p_action='read' and item.status='ready' then
  select a.* into timeline from public.medical_motion_approved_specs a where a.id=item.spec_id;
  if not public.validate_motion_timeline_v2(p_user_id,timeline.content) or exists(select 1 from public.medical_motion_timeline_segments ts join public.medical_motion_reuse_keys rk on rk.cache_key=ts.cache_key where ts.artifact_id=item.final_artifact_id and ts.reuse_epoch<>rk.epoch)
   then raise exception 'ORCHESTRATION_STALE' using errcode='OM409';end if;
 end if;
 if p_action='cancel' then
  if item.status not in ('failed','cancelled','ready') then
   if item.spec_id is not null and not exists(select 1 from public.medical_motion_orchestrations other where other.id<>item.id and other.spec_id=item.spec_id and other.status not in ('failed','cancelled')) then perform public.cancel_motion_personalization(item.spec_id,p_user_id);end if;
   update public.medical_motion_orchestrations set status='cancelled',updated_at=clock_timestamp() where id=item.id returning * into item;
  end if;return to_jsonb(item);
 end if;
 if p_action='fail' then
  if item.status not in ('failed','cancelled','ready') then
   if item.spec_id is not null and not exists(select 1 from public.medical_motion_orchestrations other where other.id<>item.id and other.spec_id=item.spec_id and other.status not in ('failed','cancelled')) then perform public.cancel_motion_personalization(item.spec_id,p_user_id);end if;
   update public.medical_motion_orchestrations set status='failed',failure_code='sequence-unavailable',updated_at=clock_timestamp() where id=item.id returning * into item;
  end if;return to_jsonb(item);
 end if;
 if p_action='bind' and item.status not in ('failed','cancelled','ready') then
  if jsonb_typeof(p_input) is distinct from 'array' or jsonb_array_length(p_input)<>jsonb_array_length(item.sequence->'sceneIndices') then raise exception 'ORCHESTRATION_INVALID' using errcode='22023';end if;
  for idx in 0..jsonb_array_length(p_input)-1 loop
   if not exists(select 1 from public.background_jobs j where j.id=(p_input->>idx)::uuid and j.user_id=p_user_id and j.execution_context_id=item.context_id and j.job_type='medical-motion-render' and j.payload->'sceneIndex'=item.sequence->'sceneIndices'->idx) then raise exception 'ORCHESTRATION_INVALID' using errcode='22023';end if;
  end loop;
  update public.medical_motion_orchestrations set base_job_ids=array(select v::uuid from jsonb_array_elements_text(p_input) v),status='rendering',updated_at=clock_timestamp() where id=item.id returning * into item;
 elsif p_action='approve' then
  -- Same row lock as cancellation: no orphan approval or compose job can race past cancellation.
  if item.status in ('failed','cancelled','ready') then raise exception 'ORCHESTRATION_TERMINAL' using errcode='OM409';end if;
  if not public.validate_motion_timeline_v2(p_user_id,p_input) or p_input->>'contextId' is distinct from item.context_id::text or
   p_input->'transitions' is distinct from item.sequence->'transitions' or p_input->'specification'->>'language' is distinct from item.language or
   p_input->'specification'->'outputProfile'->>'aspectRatio' is distinct from item.aspect_ratio or
   jsonb_array_length(p_input->'segments')<>cardinality(item.base_job_ids) then raise exception 'ORCHESTRATION_INVALID' using errcode='22023';end if;
  for idx in 0..cardinality(item.base_job_ids)-1 loop
   if p_input->'segments'->idx->>'baseJobId' is distinct from item.base_job_ids[idx+1]::text or p_input->'segments'->idx->'sceneIndex' is distinct from item.sequence->'sceneIndices'->idx then raise exception 'ORCHESTRATION_INVALID' using errcode='22023';end if;
  end loop;
  select a.id into approved_id from public.approve_motion_timeline_v2(p_user_id,p_input) a;
  select a.* into timeline from public.medical_motion_approved_specs a where a.id=approved_id;
  if item.spec_id is not null and item.spec_id<>timeline.id then raise exception 'ORCHESTRATION_SPEC_CONFLICT' using errcode='OM409';end if;
  update public.medical_motion_orchestrations set spec_id=timeline.id,compose_job_id=timeline.job_id,status='composing',updated_at=clock_timestamp() where id=item.id;
  return jsonb_build_array(jsonb_build_object('id',timeline.id,'job_id',timeline.job_id,'user_id',timeline.user_id,'content',timeline.content,'created_at',timeline.created_at));
 elsif p_action not in ('read','refresh','bind') then raise exception 'ORCHESTRATION_INVALID' using errcode='22023';end if;
 if p_action='refresh' and item.status not in ('ready','failed','cancelled') then
  state:='preparing';
  if cardinality(item.base_job_ids)>0 then
   state:='waiting-for-bases';
   if exists(select 1 from public.background_jobs j where j.id=any(item.base_job_ids) and j.status in ('failed','cancelled')) then state:='failed';end if;
   if exists(select 1 from public.background_jobs j where j.id=any(item.base_job_ids) and j.status='completed'
    and not exists(select 1 from public.read_published_motion_artifact(j.id,p_user_id))) then state:='failed';end if;
   -- A required-base failure outranks any pending/running/retrying composition.
   if state<>'failed' and item.spec_id is not null then
    select j.status into state from public.background_jobs j where j.id=item.compose_job_id;
    if state in ('failed','cancelled') then state:='failed';
    else state:='composing';end if;
    select a.id into final_id from public.read_published_motion_artifact(item.compose_job_id,p_user_id) a;
    if final_id is not null then
     select a.* into timeline from public.medical_motion_approved_specs a where a.id=item.spec_id;
     if public.validate_motion_timeline_v2(p_user_id,timeline.content) and not exists(select 1 from public.medical_motion_timeline_segments ts join public.medical_motion_reuse_keys rk on rk.cache_key=ts.cache_key where ts.artifact_id=final_id and ts.reuse_epoch<>rk.epoch) and exists(select 1 from public.medical_motion_timeline_compositions c where c.artifact_id=final_id and c.spec_id=item.spec_id and c.job_id=item.compose_job_id) then state:='ready';else state:='failed';final_id:=null;end if;
    end if;
   end if;
  end if;
  update public.medical_motion_orchestrations set status=state,final_artifact_id=final_id,failure_code=case when state='failed' then 'composition-failed' else null end,updated_at=clock_timestamp() where id=item.id returning * into item;
 end if;
 return to_jsonb(item);
end $$;
revoke all on function public.motion_orchestration_operation_v1(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.motion_orchestration_operation_v1(uuid,text,uuid,jsonb) to service_role;
commit;
