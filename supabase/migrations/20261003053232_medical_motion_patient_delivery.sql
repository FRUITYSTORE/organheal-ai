begin;
create table public.medical_motion_delivery_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete restrict,
 source_ref uuid not null, scene_index integer not null check(scene_index between 0 and 1023),
 language text not null check(language in ('ar','en')), aspect_ratio text not null check(aspect_ratio in ('16:9','9:16','1:1')),
 context_id uuid not null, base_job_id uuid not null, spec_id uuid unique references public.medical_motion_approved_specs(id) on delete restrict,
 unavailable boolean not null, failure_code text check(failure_code='source-no-longer-eligible'), cancelled_at timestamptz, created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 foreign key(context_id,user_id) references public.medical_motion_execution_contexts(id,user_id) on delete restrict,
 foreign key(base_job_id,user_id) references public.background_jobs(id,user_id) on delete restrict,
 foreign key(user_id,source_ref) references public.medical_motion_requests(user_id,request_id) on delete restrict,
 unique(user_id,source_ref,scene_index,language,aspect_ratio)
);
create index motion_delivery_history on public.medical_motion_delivery_requests(user_id,created_at desc,id desc);
create index motion_delivery_pending on public.medical_motion_delivery_requests(created_at,id) where spec_id is null and not unavailable and cancelled_at is null;
alter table public.medical_motion_delivery_requests enable row level security;
revoke all on public.medical_motion_delivery_requests from public,anon,authenticated,service_role;

create function public.guard_motion_delivery_identity() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'DELIVERY_IMMUTABLE' using errcode='55000'; end if;
 if (new.id,new.user_id,new.source_ref,new.scene_index,new.language,new.aspect_ratio,new.context_id,new.base_job_id,new.unavailable,new.created_at)
 is distinct from (old.id,old.user_id,old.source_ref,old.scene_index,old.language,old.aspect_ratio,old.context_id,old.base_job_id,old.unavailable,old.created_at)
 or (old.spec_id is not null and new.spec_id is distinct from old.spec_id)
 or (old.cancelled_at is not null and new.cancelled_at is distinct from old.cancelled_at) then
 raise exception 'DELIVERY_IMMUTABLE' using errcode='55000'; end if;
 return new;
end $$;
revoke all on function public.guard_motion_delivery_identity() from public,anon,authenticated,service_role;
create trigger motion_delivery_identity before update or delete on public.medical_motion_delivery_requests for each row execute function public.guard_motion_delivery_identity();

-- Internal projection only. Never grant this helper to application roles.
create function public.motion_delivery_snapshot(p public.medical_motion_delivery_requests) returns jsonb
language sql security definer set search_path='' as $$
 select jsonb_build_object('id',p.id,'userId',p.user_id,'sourceRef',p.source_ref,'sceneIndex',p.scene_index,
 'language',p.language,'aspectRatio',p.aspect_ratio,'contextId',p.context_id,'baseJobId',p.base_job_id,'specId',p.spec_id,
 'createdAt',p.created_at,'updatedAt',greatest(p.updated_at,b.updated_at,c.updated_at),
 'baseCacheHit',case when not exists(select 1 from public.medical_motion_reuse_links l where l.job_id=p.base_job_id) then null
   else exists(select 1 from public.medical_motion_reuse_links l join public.medical_motion_reuse_keys k on k.cache_key=l.cache_key
    where l.job_id=p.base_job_id and k.producer_job_id<>p.base_job_id) end,
 'status',case when p.cancelled_at is not null then 'cancelled' when p.unavailable or p.failure_code is not null then 'failed'
 when c.status='completed' and exists(select 1 from public.background_job_results r where r.job_id=c.id and r.attempt_token=c.attempt_token) then 'ready'
 when c.status='cancelled' then 'cancelled' when b.status in ('failed','cancelled') or c.status='failed' then 'failed'
 when c.status='running' or c.status='pending' then 'personalizing'
 when c.status in ('retrying','awaiting-artifact-publication') or b.status in ('retrying','awaiting-artifact-publication','completed') then 'preparing'
 when b.status='running' then 'rendering' else 'queued' end,
 'stage',case when p.cancelled_at is not null then 'cancelled' when p.unavailable or p.failure_code is not null then 'unavailable'
 when c.status='completed' then 'ready' when c.status='cancelled' then 'cancelled'
 when b.status in ('failed','cancelled') or c.status='failed' then 'failed'
 when c.status='awaiting-artifact-publication' or b.status='awaiting-artifact-publication' then 'finalizing'
 when c.status in ('running','pending') then 'personalization' when b.status='running' then 'visualization' else 'preparation' end,
 'failureCode',case when p.unavailable then 'medical-visualization-not-available' when p.failure_code is not null then p.failure_code
 when b.last_error in ('ANATOMY_NOT_READY','COMPOSITION_INVALID','UNSAFE_FOR_VIDEO_FIRST') or c.last_error in ('COMPOSITION_INVALID','COMPOSITION_APPROVED_SPEC_UNAVAILABLE') then 'source-no-longer-eligible'
 when b.status='failed' or c.status='failed' then 'unable-to-create-video' else null end)
 from public.background_jobs b left join public.medical_motion_approved_specs s on s.id=p.spec_id and s.user_id=p.user_id
 left join public.background_jobs c on c.id=s.job_id and c.user_id=p.user_id where b.id=p.base_job_id and b.user_id=p.user_id;
$$;
revoke all on function public.motion_delivery_snapshot(public.medical_motion_delivery_requests) from public,anon,authenticated,service_role;

create function public.motion_delivery_operation(p_user_id uuid,p_action text,p_request_id uuid default null,p_input jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.medical_motion_delivery_requests%rowtype; ctx uuid; base uuid; approved public.medical_motion_approved_specs%rowtype;
 work public.background_jobs%rowtype; result jsonb; off integer;
begin
 if p_action='pending' then
  if p_user_id is not null or p_request_id is not null or p_input is not null then raise exception 'DELIVERY_INVALID' using errcode='22023'; end if;
  select coalesce(jsonb_agg(public.motion_delivery_snapshot(r::public.medical_motion_delivery_requests)),'[]'::jsonb) into result from
   (select d.* from public.medical_motion_delivery_requests d join public.background_jobs j on j.id=d.base_job_id
    where d.spec_id is null and not d.unavailable and d.failure_code is null and d.cancelled_at is null and j.status='completed'
    order by d.created_at,d.id limit 10) r; return result;
 end if;
 if p_user_id is null then raise exception 'DELIVERY_INVALID' using errcode='22023'; end if;
 if p_action in ('source','create') then
  if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>512 or
   not(p_input ?& array['sourceRef','sceneIndex']) then raise exception 'DELIVERY_INVALID' using errcode='22023'; end if;
  select r.execution_context_id,j.id into ctx,base from public.medical_motion_requests r join public.background_jobs j
   on j.execution_context_id=r.execution_context_id and j.user_id=r.user_id and j.job_type='medical-motion-render'
   and (j.payload->>'sceneIndex')::integer=(p_input->>'sceneIndex')::integer
   where r.user_id=p_user_id and r.request_id=(p_input->>'sourceRef')::uuid;
  if not found then return null; end if;
  if p_action='source' then return jsonb_build_object('contextId',ctx,'baseJobId',base); end if;
  if (select count(*) from jsonb_object_keys(p_input))<>5 or not(p_input ?& array['language','aspectRatio','eligible'])
   or jsonb_typeof(p_input->'eligible')<>'boolean' then raise exception 'DELIVERY_INVALID' using errcode='22023'; end if;
  insert into public.medical_motion_delivery_requests(user_id,source_ref,scene_index,language,aspect_ratio,context_id,base_job_id,unavailable)
   values(p_user_id,(p_input->>'sourceRef')::uuid,(p_input->>'sceneIndex')::integer,p_input->>'language',p_input->>'aspectRatio',ctx,base,not (p_input->>'eligible')::boolean)
   on conflict(user_id,source_ref,scene_index,language,aspect_ratio) do nothing;
  select * into item from public.medical_motion_delivery_requests d where d.user_id=p_user_id and d.source_ref=(p_input->>'sourceRef')::uuid
   and d.scene_index=(p_input->>'sceneIndex')::integer and d.language=p_input->>'language' and d.aspect_ratio=p_input->>'aspectRatio';
  return public.motion_delivery_snapshot(item);
 elsif p_action='list' then
  off:=coalesce((p_input->>'offset')::integer,0); if off not between 0 and 1000 then raise exception 'DELIVERY_INVALID' using errcode='22023'; end if;
  select coalesce(jsonb_agg(public.motion_delivery_snapshot(r::public.medical_motion_delivery_requests)),'[]'::jsonb) into result from
   (select * from public.medical_motion_delivery_requests d where d.user_id=p_user_id order by d.created_at desc,d.id desc limit 20 offset off) r;
  return result;
 end if;
 select * into item from public.medical_motion_delivery_requests d where d.id=p_request_id and d.user_id=p_user_id for update;
 if not found then return null; end if;
 if p_action='ineligible' then
  update public.medical_motion_delivery_requests d set failure_code='source-no-longer-eligible',updated_at=clock_timestamp()
   where d.id=item.id and d.cancelled_at is null and d.spec_id is null returning * into item;
 elsif p_action='approve' then
  if item.spec_id is not null or item.cancelled_at is not null then return public.motion_delivery_snapshot(item); end if;
  if item.unavailable or item.failure_code is not null then raise exception 'DELIVERY_INVALID' using errcode='22023'; end if;
  perform public.approve_motion_personalization(p_user_id,p_input);
  select s.* into approved from public.medical_motion_approved_specs s where s.user_id=p_user_id and s.context_id=item.context_id
    and s.logical_identity=p_input->>'logicalIdentity';
  if not found then raise exception 'DELIVERY_INVALID' using errcode='22023'; end if;
  if approved.context_id<>item.context_id or (approved.content->>'baseJobId')::uuid<>item.base_job_id
   or (approved.content->>'sceneIndex')::integer<>item.scene_index or approved.content->'specification'->>'language'<>item.language
   or approved.content->'specification'->'outputProfile'->>'aspectRatio'<>item.aspect_ratio then raise exception 'DELIVERY_INVALID' using errcode='22023'; end if;
  update public.medical_motion_delivery_requests d set spec_id=approved.id,updated_at=clock_timestamp() where d.id=item.id returning * into item;
 elsif p_action='cancel' then
  if public.motion_delivery_snapshot(item)->>'status' in ('ready','failed','cancelled') then return public.motion_delivery_snapshot(item); end if;
  if item.cancelled_at is not null or item.unavailable or item.failure_code is not null then return public.motion_delivery_snapshot(item); end if;
  if item.spec_id is not null then
   select j.* into work from public.background_jobs j join public.medical_motion_approved_specs s on s.job_id=j.id
    where s.id=item.spec_id and s.user_id=p_user_id for update of j;
   if work.status='completed' then return public.motion_delivery_snapshot(item); end if;
   perform public.cancel_motion_personalization(item.spec_id,p_user_id);
  end if;
  update public.medical_motion_delivery_requests d set cancelled_at=coalesce(d.cancelled_at,clock_timestamp()),updated_at=clock_timestamp()
   where d.id=item.id returning * into item;
 elsif p_action<>'read' then raise exception 'DELIVERY_INVALID' using errcode='22023'; end if;
 return public.motion_delivery_snapshot(item);
end $$;
revoke all on function public.motion_delivery_operation(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.motion_delivery_operation(uuid,text,uuid,jsonb) to service_role;
commit;
