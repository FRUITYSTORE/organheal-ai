begin;
create table public.product_entitlements (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete restrict,
 beneficiary_id uuid not null references auth.users(id) on delete restrict,
 capability text not null check(capability ~ '^[a-z][a-z0-9.-]{0,63}$'),
 kind text not null check(kind in ('free','subscription','one-time','credit','promotional','admin')),
 scope_kind text not null check(scope_kind in ('account','report','context')), scope_ref text,
 valid_from timestamptz not null, valid_until timestamptz check(valid_until>valid_from),
 allowance integer check(allowance between 1 and 1000000), source_ref uuid not null,
 offer text check(offer in ('one-time-analysis','plus-monthly','plus-annual')),
 purchase_amount_minor integer check(purchase_amount_minor between 0 and 1000000000), purchase_currency text,
 check((purchase_amount_minor is null and purchase_currency is null) or (purchase_amount_minor is not null and purchase_currency ~ '^[A-Z]{3}$' and purchase_currency is not null)),
 status text not null default 'active' check(status in ('active','revoked')), created_at timestamptz not null default clock_timestamp(),
 check(beneficiary_id=owner_id), -- V1 self only; future delegation requires an explicit membership adapter.
 check((scope_kind='account' and scope_ref is null) or (scope_kind in ('report','context') and scope_ref is not null and scope_ref ~ '^[a-zA-Z0-9-]{1,64}$')),
 check(kind<>'one-time' or scope_kind='report'), check(kind<>'credit' or allowance is not null),
 unique(id,owner_id), unique nulls not distinct(owner_id,source_ref,capability,scope_kind,scope_ref)
);
create index product_entitlements_owner on public.product_entitlements(owner_id,capability,valid_from,valid_until) where status='active';
alter table public.medical_motion_delivery_requests add constraint product_delivery_owner_identity unique(id,user_id);
create table public.product_usage_reservations (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete restrict,
 entitlement_id uuid not null, capability text not null, scope_kind text not null, scope_ref text, action_ref uuid not null,
 product_request_id uuid,
 state text not null default 'reserved' check(state in ('reserved','consumed','released')),
 reason text check(reason in ('success','cancelled','technical-failure','medical-unavailable','refund')),
 created_at timestamptz not null default clock_timestamp(), settled_at timestamptz,
 foreign key(entitlement_id,owner_id) references public.product_entitlements(id,owner_id) on delete restrict,
 foreign key(product_request_id,owner_id) references public.medical_motion_delivery_requests(id,user_id) on delete restrict,
 unique(owner_id,capability,action_ref), unique(id,owner_id), unique(product_request_id),
 check((state='reserved' and reason is null and settled_at is null) or (state<>'reserved' and reason is not null and settled_at is not null))
);
create index product_reservations_entitlement on public.product_usage_reservations(entitlement_id,state);
create table public.product_credit_ledger (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null, entitlement_id uuid not null,
 reservation_id uuid, event text not null check(event in ('grant','reserve','consume','release','refund')),
 units integer not null check(units between -1000000 and 1000000), created_at timestamptz not null default clock_timestamp(),
 foreign key(entitlement_id,owner_id) references public.product_entitlements(id,owner_id),
 foreign key(reservation_id,owner_id) references public.product_usage_reservations(id,owner_id),
 unique nulls not distinct(entitlement_id,reservation_id,event)
);
create table public.product_usage_events (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id), event_ref uuid not null,
 action_ref uuid not null, units jsonb not null, created_at timestamptz not null default clock_timestamp(),
 unique(owner_id,event_ref), check(jsonb_typeof(units)='object' and octet_length(units::text)<=512)
);
create index product_credit_history on public.product_credit_ledger(owner_id,created_at,id);
create index product_usage_events_action on public.product_usage_events(owner_id,action_ref);
create index motion_delivery_base_job on public.medical_motion_delivery_requests(base_job_id);
alter table public.product_entitlements enable row level security;
alter table public.product_usage_reservations enable row level security;
alter table public.product_credit_ledger enable row level security;
alter table public.product_usage_events enable row level security;
revoke all on public.product_entitlements,public.product_usage_reservations,public.product_credit_ledger,public.product_usage_events from public,anon,authenticated,service_role;

create function public.product_immutable() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' or tg_table_name in ('product_credit_ledger','product_usage_events') then raise exception 'PRODUCT_IMMUTABLE'; end if;
 if tg_table_name='product_entitlements' then
  if (to_jsonb(new)-'status') is distinct from (to_jsonb(old)-'status') or old.status='revoked' then raise exception 'PRODUCT_IMMUTABLE'; end if;
 else
  if (to_jsonb(new)-array['state','reason','settled_at']) is distinct from (to_jsonb(old)-array['state','reason','settled_at'])
   or old.state='released' or (old.state='consumed' and (new.state<>'released' or new.reason<>'refund')) then raise exception 'PRODUCT_IMMUTABLE'; end if;
 end if; return new;
end $$;
revoke all on function public.product_immutable() from public,anon,authenticated,service_role;
create trigger product_immutable before update or delete on public.product_entitlements for each row execute function public.product_immutable();
create trigger product_immutable before update or delete on public.product_usage_reservations for each row execute function public.product_immutable();
create trigger product_immutable before update or delete on public.product_credit_ledger for each row execute function public.product_immutable();
create trigger product_immutable before update or delete on public.product_usage_events for each row execute function public.product_immutable();

create function public.product_decision(p_owner uuid,p_cap text,p_scope text,p_ref text,p_action uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.product_entitlements%rowtype; r public.product_usage_reservations%rowtype; remaining integer; exhausted boolean:=false; code text;
begin
 if p_owner is null or p_cap is null or p_scope not in ('account','report','context') then raise exception 'PRODUCT_INVALID'; end if;
 if p_cap in ('safety.alerts','report.preview') then return jsonb_build_object('allowed',true,'code','ALLOWED_FREE','entitlementId',null,'remaining',null,'reservationId',null,'state',null); end if;
 if p_action is not null then
  select * into r from public.product_usage_reservations where owner_id=p_owner and capability=p_cap and action_ref=p_action;
  if found then
   if r.scope_kind is distinct from p_scope or r.scope_ref is distinct from p_ref then raise exception 'PRODUCT_INVALID'; end if;
   select * into e from public.product_entitlements where id=r.entitlement_id and owner_id=p_owner;
   if r.state='released' then return jsonb_build_object('allowed',false,'code','DENIED_PRODUCT_UNAVAILABLE','entitlementId',e.id,'remaining',null,'reservationId',r.id,'state','released'); end if;
   code:=case e.kind when 'subscription' then 'ALLOWED_SUBSCRIPTION' when 'one-time' then 'ALLOWED_ONE_TIME' when 'free' then 'ALLOWED_FREE' else 'ALLOWED_CREDIT' end;
   return jsonb_build_object('allowed',true,'code',code,'entitlementId',e.id,'remaining',null,'reservationId',r.id,'state',r.state);
  end if;
 end if;
 for e in select * from public.product_entitlements where owner_id=p_owner and beneficiary_id=p_owner and capability=p_cap and status='active'
  and valid_from<=clock_timestamp() and (valid_until is null or valid_until>clock_timestamp())
  and (scope_kind='account' or (scope_kind=p_scope and scope_ref is not distinct from p_ref))
  order by case kind when 'one-time' then 0 when 'subscription' then 1 else 2 end,valid_until nulls last,id loop
  select e.allowance-count(*)::integer into remaining from public.product_usage_reservations where entitlement_id=e.id and state in ('reserved','consumed');
  if e.allowance is null or remaining>0 then
   code:=case e.kind when 'subscription' then 'ALLOWED_SUBSCRIPTION' when 'one-time' then 'ALLOWED_ONE_TIME' when 'free' then 'ALLOWED_FREE' else 'ALLOWED_CREDIT' end;
   return jsonb_build_object('allowed',true,'code',code,'entitlementId',e.id,'remaining',remaining,'reservationId',null,'state',null);
  end if; exhausted:=true;
 end loop;
 return jsonb_build_object('allowed',false,'code',case when exhausted then 'DENIED_ALLOWANCE_EXHAUSTED' else 'DENIED_ENTITLEMENT_REQUIRED' end,
  'entitlementId',null,'remaining',0,'reservationId',null,'state',null);
end $$;
revoke all on function public.product_decision(uuid,text,text,text,uuid) from public,anon,authenticated,service_role;

create function public.product_operation(p_owner uuid,p_action text,p_id uuid default null,p_input jsonb default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.product_entitlements%rowtype; r public.product_usage_reservations%rowtype; d jsonb; item public.medical_motion_delivery_requests%rowtype;
 cap text; scope text; ref text; act uuid; out jsonb; existing jsonb; grant_item jsonb;
begin
 if p_owner is null or (p_input is not null and (jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>8192)) then raise exception 'PRODUCT_INVALID'; end if;
 if p_action='grant-bundle' then
  if jsonb_typeof(p_input->'grants')<>'array' or jsonb_array_length(p_input->'grants') not between 1 and 12 then raise exception 'PRODUCT_INVALID'; end if;
  out:='[]'::jsonb;
  for grant_item in select * from jsonb_array_elements(p_input->'grants') loop out:=out||jsonb_build_array(public.product_operation(p_owner,'grant',null,grant_item)); end loop;
  return out;
 end if;
 if p_action='authorize-motion' then
  select * into item from public.medical_motion_delivery_requests where user_id=p_owner and source_ref=(p_input->>'sourceRef')::uuid
   and scene_index=(p_input->>'sceneIndex')::integer and language=p_input->>'language' and aspect_ratio=p_input->>'aspectRatio';
  if found then
   if public.motion_delivery_snapshot(item)->>'status' in ('failed','cancelled') then
    return jsonb_build_object('allowed',true,'code','ALLOWED_FREE','entitlementId',null,'remaining',null,'reservationId',null,'state',null);
   end if;
   select * into r from public.product_usage_reservations where owner_id=p_owner and product_request_id=item.id;
   if found then return public.product_decision(p_owner,'medical-motion.personalized','context',item.source_ref::text,item.id); end if;
   return jsonb_build_object('allowed',true,'code','ALLOWED_FREE','entitlementId',null,'remaining',null,'reservationId',null,'state',null);
  end if;
  return public.product_decision(p_owner,'medical-motion.personalized','context',(p_input->>'sourceRef'),null);
 elsif p_action='read' then
  select coalesce(jsonb_agg(v),'[]'::jsonb) into out from (select capability,kind,scope_kind as "scopeKind",scope_ref as "scopeRef",valid_until as "validUntil",
   case when allowance is null then null else greatest(0,allowance-(select count(*) from public.product_usage_reservations r where r.entitlement_id=e.id and r.state in ('reserved','consumed'))) end as remaining
   from public.product_entitlements e where owner_id=p_owner and beneficiary_id=p_owner and status='active' and valid_from<=clock_timestamp()
    and (valid_until is null or valid_until>clock_timestamp()) order by created_at desc,id limit 100) v; return out;
 elsif p_action in ('authorize','reserve') then
  cap:=p_input->>'capability';scope:=p_input->>'scopeKind';ref:=p_input->>'scopeRef';act:=(p_input->>'actionRef')::uuid;
  if p_action='reserve' then
   if act is null then raise exception 'PRODUCT_INVALID'; end if;
   perform pg_advisory_xact_lock(hashtextextended('product:'||p_owner::text,0));
  end if;
  d:=public.product_decision(p_owner,cap,scope,ref,act);
  if p_action='authorize' or not (d->>'allowed')::boolean or d->>'reservationId' is not null or d->>'entitlementId' is null then return d; end if;
  insert into public.product_usage_reservations(owner_id,entitlement_id,capability,scope_kind,scope_ref,action_ref,product_request_id)
   values(p_owner,(d->>'entitlementId')::uuid,cap,scope,ref,act,case when cap='medical-motion.personalized' and exists(select 1 from public.medical_motion_delivery_requests where id=act and user_id=p_owner) then act else null end) returning * into r;
  select * into e from public.product_entitlements where id=r.entitlement_id;
  if e.kind='credit' then insert into public.product_credit_ledger(owner_id,entitlement_id,reservation_id,event,units) values(p_owner,e.id,r.id,'reserve',-1); end if;
  return d||jsonb_build_object('reservationId',r.id,'state','reserved','remaining',case when e.allowance is null then null else (d->>'remaining')::integer-1 end);
 elsif p_action='grant' then
  perform pg_advisory_xact_lock(hashtextextended('product:'||p_owner::text,0));
  insert into public.product_entitlements(owner_id,beneficiary_id,capability,kind,scope_kind,scope_ref,valid_from,valid_until,allowance,source_ref,offer,purchase_amount_minor,purchase_currency)
   values(p_owner,p_owner,p_input->>'capability',p_input->>'kind',p_input->>'scopeKind',p_input->>'scopeRef',(p_input->>'validFrom')::timestamptz,
    (p_input->>'validUntil')::timestamptz,(p_input->>'allowance')::integer,(p_input->>'sourceRef')::uuid,p_input->>'offer',(p_input->>'purchaseAmountMinor')::integer,p_input->>'purchaseCurrency')
   on conflict(owner_id,source_ref,capability,scope_kind,scope_ref) do nothing;
  select * into e from public.product_entitlements where owner_id=p_owner and source_ref=(p_input->>'sourceRef')::uuid and capability=p_input->>'capability'
   and scope_kind=p_input->>'scopeKind' and scope_ref is not distinct from p_input->>'scopeRef';
  if (e.kind,e.valid_from,e.valid_until,e.allowance,e.offer,e.purchase_amount_minor,e.purchase_currency) is distinct from
   (p_input->>'kind',(p_input->>'validFrom')::timestamptz,(p_input->>'validUntil')::timestamptz,(p_input->>'allowance')::integer,p_input->>'offer',(p_input->>'purchaseAmountMinor')::integer,p_input->>'purchaseCurrency') then raise exception 'PRODUCT_CONFLICT'; end if;
  if e.kind='credit' then insert into public.product_credit_ledger(owner_id,entitlement_id,event,units) values(p_owner,e.id,'grant',e.allowance) on conflict do nothing; end if;
  return jsonb_build_object('id',e.id);
 elsif p_action='revoke' then
  perform pg_advisory_xact_lock(hashtextextended('product:'||p_owner::text,0));
  update public.product_entitlements set status='revoked' where id=p_id and owner_id=p_owner and status='active';return 'true'::jsonb;
 elsif p_action='settle' then
  select * into r from public.product_usage_reservations where id=p_id and owner_id=p_owner for update;
  if not found then return null; end if;
  if r.state=p_input->>'state' or r.state='released' or (r.state='consumed' and p_input->>'reason'<>'refund') then return to_jsonb(r.state); end if;
  if p_input->>'state' not in ('consumed','released') or ((p_input->>'state'='consumed') is distinct from (p_input->>'reason'='success')) then raise exception 'PRODUCT_INVALID'; end if;
  update public.product_usage_reservations set state=p_input->>'state',reason=p_input->>'reason',settled_at=clock_timestamp() where id=r.id;
  select * into e from public.product_entitlements where id=r.entitlement_id;
  if e.kind='credit' then insert into public.product_credit_ledger(owner_id,entitlement_id,reservation_id,event,units)
   values(p_owner,e.id,r.id,case when p_input->>'state'='consumed' then 'consume' when p_input->>'reason'='refund' then 'refund' else 'release' end,case when p_input->>'state'='consumed' then 0 else 1 end) on conflict do nothing; end if;
  return to_jsonb(p_input->>'state');
 elsif p_action='record' then
  if not public.product_cost_units_valid(p_input->'units') then raise exception 'PRODUCT_INVALID'; end if;
  insert into public.product_usage_events(owner_id,event_ref,action_ref,units) values(p_owner,(p_input->>'eventRef')::uuid,(p_input->>'actionRef')::uuid,p_input->'units') on conflict do nothing;
  select units,action_ref into existing,act from public.product_usage_events where owner_id=p_owner and event_ref=(p_input->>'eventRef')::uuid;
  if existing is distinct from p_input->'units' or act is distinct from (p_input->>'actionRef')::uuid then raise exception 'PRODUCT_CONFLICT'; end if;
  return 'true'::jsonb;
 else raise exception 'PRODUCT_INVALID'; end if;
end $$;
revoke all on function public.product_operation(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.product_operation(uuid,text,uuid,jsonb) to service_role;

create function public.product_cost_units_valid(v jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text; item jsonb;
begin
 if v is null or jsonb_typeof(v)<>'object' or v='{}'::jsonb or octet_length(v::text)>512 then return false; end if;
 for k,item in select * from jsonb_each(v) loop
  if k in ('baseCacheHit','blenderAvoided','compositionExecuted') then if jsonb_typeof(item)<>'boolean' then return false; end if;
  elsif k in ('blenderExecutions','compositionExecutions','artifactBytes','aiUses') then
   if jsonb_typeof(item)<>'number' or not(item::text ~ '^[0-9]{1,10}$') or item::text::bigint>1000000000 then return false; end if;
  elsif k='durationBand' then if item#>>'{}' not in ('short','medium','long','unknown') or jsonb_typeof(item)<>'string' then return false; end if;
  elsif k='outputProfile' then if item#>>'{}' not in ('16:9','9:16','1:1') or jsonb_typeof(item)<>'string' then return false; end if;
  else return false; end if;
 end loop; return true;
end $$;
revoke all on function public.product_cost_units_valid(jsonb) from public,anon,authenticated,service_role;
alter table public.product_usage_events add constraint product_usage_safe_units check(public.product_cost_units_valid(units));

create function public.product_settle_motion(p_owner uuid,p_request uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.product_usage_reservations%rowtype; item public.medical_motion_delivery_requests%rowtype; d jsonb; art public.medical_motion_artifacts%rowtype; spec public.medical_motion_approved_specs%rowtype;
begin
 select * into r from public.product_usage_reservations where owner_id=p_owner and product_request_id=p_request;
 if not found or r.state<>'reserved' then return; end if;
 select * into item from public.medical_motion_delivery_requests where id=p_request and user_id=p_owner;
 d:=public.motion_delivery_snapshot(item);
 if d->>'status'='ready' then
  perform public.product_operation(p_owner,'settle',r.id,jsonb_build_object('state','consumed','reason','success'));
  select * into spec from public.medical_motion_approved_specs where id=item.spec_id and user_id=p_owner;
  select a.* into art from public.medical_motion_artifacts a join public.background_job_results b on b.reference_id=a.id where b.job_id=spec.job_id and a.user_id=p_owner;
  if found then perform public.product_operation(p_owner,'record',null,jsonb_build_object('eventRef',p_request,'actionRef',p_request,
   'units',jsonb_build_object('compositionExecuted',true,'artifactBytes',art.byte_size,'outputProfile',item.aspect_ratio,
    'durationBand',case when spec.content->>'duration' is null then 'unknown' when (spec.content->>'duration')::numeric<=10 then 'short' when (spec.content->>'duration')::numeric<=30 then 'medium' else 'long' end)
    ||case when d->'baseCacheHit'='null'::jsonb then '{}'::jsonb else jsonb_build_object('baseCacheHit',d->'baseCacheHit','blenderAvoided',d->'baseCacheHit') end)); end if;
 elsif d->>'status' in ('failed','cancelled') then
  perform public.product_operation(p_owner,'settle',r.id,jsonb_build_object('state','released','reason',case when d->>'status'='cancelled' then 'cancelled' when d->>'stage'='unavailable' then 'medical-unavailable' else 'technical-failure' end));
 end if;
end $$;
revoke all on function public.product_settle_motion(uuid,uuid) from public,anon,authenticated,service_role;

create function public.product_motion_job_settlement() returns trigger language plpgsql security definer set search_path='' as $$
declare item record; work_id uuid;
begin
 if tg_table_name='background_jobs' then
  if new.job_type not in ('medical-motion-render','medical-motion-compose') then return new; end if;
  work_id:=new.id;
 else
  work_id:=new.job_id;
  if not exists(select 1 from public.background_jobs where id=work_id and job_type in ('medical-motion-render','medical-motion-compose')) then return new; end if;
 end if;
 for item in select id,user_id from public.medical_motion_delivery_requests where base_job_id=work_id
  union select d.id,d.user_id from public.medical_motion_approved_specs s join public.medical_motion_delivery_requests d on d.spec_id=s.id
   where s.job_id=work_id loop perform public.product_settle_motion(item.user_id,item.id); end loop;
 return new;
end $$;
revoke all on function public.product_motion_job_settlement() from public,anon,authenticated,service_role;
create trigger product_motion_job_settlement after update of status on public.background_jobs for each row when(old.status is distinct from new.status) execute function public.product_motion_job_settlement();
create trigger product_motion_result_settlement after insert on public.background_job_results for each row execute function public.product_motion_job_settlement();

-- Wrap the accepted orchestration transaction, preserving its SQL and fencing.
alter function public.motion_delivery_operation(uuid,text,uuid,jsonb) rename to motion_delivery_operation_v1;
revoke all on function public.motion_delivery_operation_v1(uuid,text,uuid,jsonb) from public,anon,authenticated,service_role;
create function public.motion_delivery_operation(p_user_id uuid,p_action text,p_request_id uuid default null,p_input jsonb default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d jsonb; authz jsonb; r uuid;
begin
 if p_action='approve' and not exists(select 1 from public.product_usage_reservations where owner_id=p_user_id and product_request_id=p_request_id and state in ('reserved','consumed')) then
  -- A cancelled product still returns its accepted idempotent projection without minting work.
  d:=public.motion_delivery_operation_v1(p_user_id,'read',p_request_id,null);
  if d->>'status' in ('cancelled','failed') then return d; end if; raise exception 'PRODUCT_DENIED' using errcode='OB403';
 end if;
 d:=public.motion_delivery_operation_v1(p_user_id,p_action,p_request_id,p_input);
 if p_action='pending' then
  select coalesce(jsonb_agg(v),'[]'::jsonb) into d from jsonb_array_elements(d) v where exists(select 1 from public.product_usage_reservations u where u.owner_id=(v->>'userId')::uuid and u.product_request_id=(v->>'id')::uuid and u.state='reserved');
 end if;
 if p_action='create' and d is not null and (p_input->>'eligible')::boolean and d->>'status' not in ('failed','cancelled','ready') then
  authz:=public.product_operation(p_user_id,'reserve',null,jsonb_build_object('capability','medical-motion.personalized','scopeKind','context','scopeRef',p_input->>'sourceRef','actionRef',d->>'id'));
  if not (authz->>'allowed')::boolean then raise exception 'PRODUCT_DENIED' using errcode='OB403'; end if;
 elsif p_action='create' and d is not null and not (p_input->>'eligible')::boolean then
  select id into r from public.product_usage_reservations where owner_id=p_user_id and product_request_id=(d->>'id')::uuid and state='reserved';
  if found then perform public.product_operation(p_user_id,'settle',r,jsonb_build_object('state','released','reason','medical-unavailable')); end if;
 end if;
 if d is not null and p_action in ('create','read','cancel','ineligible','approve') then perform public.product_settle_motion(p_user_id,(d->>'id')::uuid); end if;
 return d;
end $$;
revoke all on function public.motion_delivery_operation(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.motion_delivery_operation(uuid,text,uuid,jsonb) to service_role;
commit;
