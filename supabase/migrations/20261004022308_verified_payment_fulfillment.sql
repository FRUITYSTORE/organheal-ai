begin;
-- TEST-only commercial orchestration; accepted entitlement tables are reused.
create table public.payment_purchase_attempts (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 provider text not null default 'stripe' check(provider='stripe'), test_mode boolean not null default true check(test_mode),
 offer text not null check(offer in ('one-time-analysis','plus-monthly','plus-annual')), scope_ref text,
 price_id text not null check(price_id ~ '^price_[a-zA-Z0-9_]{1,100}$'), allowances jsonb not null,
 customer_id text, checkout_id text unique, subscription_id text unique, payment_id text unique,
 state text not null default 'created' check(state in ('created','checkout','paid','active','past_due','unpaid','trialing','canceled','expired','reversed')),
 last_event_created bigint not null default 0, period_start bigint, period_end bigint, cancel_at_period_end boolean not null default false,
 grant_refs uuid[] not null default '{}', created_at timestamptz not null default clock_timestamp(),
 unique nulls not distinct(owner_id,offer,scope_ref), unique(id,owner_id),
 check((offer='one-time-analysis' and scope_ref ~ '^[1-9][0-9]{0,15}$' and scope_ref is not null) or (offer<>'one-time-analysis' and scope_ref is null)),
 check(jsonb_typeof(allowances)='object' and octet_length(allowances::text)<=1024)
);
create index payment_purchase_customer on public.payment_purchase_attempts(customer_id,owner_id);
create index payment_purchase_reconcile on public.payment_purchase_attempts(state,created_at,id);
create table public.payment_provider_events (
 id text primary key check(id ~ '^(evt_|reconcile_)[a-zA-Z0-9_-]{1,120}$'),
 provider text not null default 'stripe' check(provider='stripe'), test_mode boolean not null default true check(test_mode),
 event_type text not null check(event_type ~ '^[a-z][a-z._]{0,80}$'), event_created bigint not null check(event_created>0),
 digest text not null check(digest ~ '^[a-f0-9]{64}$'), received_at timestamptz not null default clock_timestamp(),
 attempt_id uuid references public.payment_purchase_attempts(id),
 status text not null default 'received' check(status in ('received','completed','ignored','rejected')),
 result_code text check(result_code in ('fulfilled','replayed','stale','pending','unsupported','reversed','state-only','reference-rejected')),
 last_error_code text check(last_error_code in ('reference-rejected')), completed_at timestamptz
);
create index payment_provider_pending on public.payment_provider_events(status,received_at,id);
alter table public.payment_purchase_attempts enable row level security;
alter table public.payment_provider_events enable row level security;
revoke all on public.payment_purchase_attempts,public.payment_provider_events from public,anon,authenticated,service_role;

create function public.payment_operation(p_action text,p_owner uuid default null,p_id uuid default null,p_input jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.payment_purchase_attempts%rowtype; e public.payment_provider_events%rowtype;
 ref uuid; cap text; amount integer; currency text; desired text; grants jsonb; k text; v jsonb; start_at bigint; end_at bigint;
begin
 if p_input is not null and (jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>4096) then raise exception 'PAYMENT_INVALID'; end if;
 if p_action='attempt' then
  if p_owner is null or p_input->>'offer' not in ('one-time-analysis','plus-monthly','plus-annual') then raise exception 'PAYMENT_INVALID'; end if;
  if p_input->>'offer'='one-time-analysis' then
   if p_input->>'scopeRef' is null or not(p_input->>'scopeRef' ~ '^[1-9][0-9]{0,15}$') then raise exception 'PAYMENT_INVALID'; end if;
  elsif p_input->>'scopeRef' is not null then raise exception 'PAYMENT_INVALID'; end if;
  if jsonb_typeof(p_input->'allowances')<>'object' then raise exception 'PAYMENT_INVALID'; end if;
  for k,v in select * from jsonb_each(p_input->'allowances') loop
   if k not in ('report.full-analysis','assistant.advanced','health-intelligence.full','doctor-brief','patient-pdf','medical-motion.personalized','history.extended','trends','health-passport')
    or (v<>'null'::jsonb and (jsonb_typeof(v)<>'number' or not(v::text ~ '^[0-9]{1,7}$') or v::text::bigint not between 1 and 1000000)) then raise exception 'PAYMENT_INVALID'; end if;
  end loop;
  if (p_input->>'offer'='one-time-analysis' and p_input->'allowances'<>'{}'::jsonb) or (p_input->>'offer'<>'one-time-analysis' and p_input->'allowances'='{}'::jsonb) then raise exception 'PAYMENT_INVALID'; end if;
  perform pg_advisory_xact_lock(hashtextextended('purchase:'||p_owner::text,0));
  insert into public.payment_purchase_attempts(owner_id,offer,scope_ref,price_id,allowances)
   values(p_owner,p_input->>'offer',p_input->>'scopeRef',p_input->>'priceId',p_input->'allowances') on conflict do nothing;
  select * into a from public.payment_purchase_attempts where owner_id=p_owner and offer=p_input->>'offer' and scope_ref is not distinct from p_input->>'scopeRef';
  if (a.price_id,a.allowances) is distinct from (p_input->>'priceId',p_input->'allowances') then raise exception 'PAYMENT_CONFIG_CONFLICT'; end if;
  return to_jsonb(a);
 elsif p_action='customer' then
  if p_owner is null then raise exception 'PAYMENT_INVALID'; end if;
  select customer_id into k from public.payment_purchase_attempts where owner_id=p_owner and customer_id is not null order by created_at,id limit 1;
  return to_jsonb(k);
 elsif p_action='lookup' then
  select * into a from public.payment_purchase_attempts where id=p_id;
  return case when found then to_jsonb(a) else null end;
 elsif p_action='reference' then
  select * into a from public.payment_purchase_attempts where payment_id=p_input->>'paymentId';
  return case when found then to_jsonb(a) else null end;
 elsif p_action='bind' then
  select * into a from public.payment_purchase_attempts where id=p_id and owner_id=p_owner for update;
  if not found or p_input->>'customerId' is null or p_input->>'customerId' !~ '^cus_[a-zA-Z0-9_]{1,100}$' then raise exception 'PAYMENT_INVALID'; end if;
  perform pg_advisory_xact_lock(hashtextextended('stripe-test-customer:'||(p_input->>'customerId'),0));
  if a.customer_id is not null and a.customer_id is distinct from p_input->>'customerId' then raise exception 'PAYMENT_IDENTITY_CONFLICT'; end if;
  if exists(select 1 from public.payment_purchase_attempts where customer_id=p_input->>'customerId' and owner_id<>p_owner) then raise exception 'PAYMENT_IDENTITY_CONFLICT'; end if;
  if p_input->>'checkoutId' is not null and (p_input->>'checkoutId' !~ '^cs_test_[a-zA-Z0-9_]{1,100}$' or a.checkout_id is not null and a.checkout_id is distinct from p_input->>'checkoutId') then raise exception 'PAYMENT_IDENTITY_CONFLICT'; end if;
  update public.payment_purchase_attempts set customer_id=p_input->>'customerId',checkout_id=coalesce(checkout_id,p_input->>'checkoutId'),state=case when state='created' and p_input->>'checkoutId' is not null then 'checkout' else state end where id=a.id;
  return 'true'::jsonb;
 elsif p_action='receive' then
  insert into public.payment_provider_events(id,event_type,event_created,digest) values(p_input->>'eventId',p_input->>'eventType',(p_input->>'created')::bigint,p_input->>'digest') on conflict do nothing;
  select * into e from public.payment_provider_events where id=p_input->>'eventId';
  if (e.event_type,e.event_created,e.digest) is distinct from (p_input->>'eventType',(p_input->>'created')::bigint,p_input->>'digest') then raise exception 'PAYMENT_EVENT_CONFLICT'; end if;
  return jsonb_build_object('status',e.status);
 elsif p_action='reject' then
  update public.payment_provider_events set status='rejected',result_code='reference-rejected',last_error_code='reference-rejected',completed_at=clock_timestamp() where id=p_input->>'eventId' and status='received';
  return 'true'::jsonb;
 elsif p_action='fulfill' then
  select * into e from public.payment_provider_events where id=p_input->>'eventId' for update;
  if not found then raise exception 'PAYMENT_EVENT_UNKNOWN'; end if;
  if e.status<>'received' then return jsonb_build_object('result','replayed'); end if;
  if p_input->>'effect'='unsupported' then
   update public.payment_provider_events set status='ignored',result_code='unsupported',completed_at=clock_timestamp() where id=e.id;return jsonb_build_object('result','unsupported');
  end if;
  select * into a from public.payment_purchase_attempts where id=p_id for update;
  if not found or a.customer_id is null or a.customer_id is distinct from p_input->>'customerId' then raise exception 'PAYMENT_IDENTITY_CONFLICT'; end if;
  if p_input->>'effect'='reverse' then
   if not(coalesce(a.payment_id is not null and a.payment_id=p_input->>'paymentId',false)
    or coalesce(a.subscription_id is not null and a.subscription_id=p_input->>'subscriptionId',false)
    or coalesce(a.offer='one-time-analysis' and a.payment_id is null and a.checkout_id is not null and a.checkout_id=p_input->>'checkoutId' and p_input->>'paymentId' ~ '^pi_[a-zA-Z0-9_]{1,100}$',false)
    or coalesce(a.offer<>'one-time-analysis' and a.subscription_id is null and a.checkout_id is not null and a.checkout_id=p_input->>'checkoutId' and p_input->>'subscriptionId' ~ '^sub_[a-zA-Z0-9_]{1,100}$',false)) then raise exception 'PAYMENT_IDENTITY_CONFLICT'; end if;
   foreach ref in array a.grant_refs loop
    for cap in select capability from public.product_entitlements where owner_id=a.owner_id and source_ref=ref and status='active' loop
     perform public.product_operation(a.owner_id,'revoke',(select id from public.product_entitlements where owner_id=a.owner_id and source_ref=ref and capability=cap),null);
    end loop;
   end loop;
   update public.payment_purchase_attempts set state='reversed',payment_id=coalesce(payment_id,p_input->>'paymentId'),last_event_created=greatest(last_event_created,e.event_created) where id=a.id;
   update public.payment_provider_events set attempt_id=a.id,status='completed',result_code='reversed',completed_at=clock_timestamp() where id=e.id;
   return jsonb_build_object('result','reversed');
  end if;
  if p_input->>'priceId' is distinct from a.price_id or p_input->>'offer' is distinct from a.offer then raise exception 'PAYMENT_OFFER_CONFLICT'; end if;
  if a.state='reversed' or e.event_created<a.last_event_created then
   update public.payment_provider_events set attempt_id=a.id,status='ignored',result_code='stale',completed_at=clock_timestamp() where id=e.id;return jsonb_build_object('result','stale');
  end if;
  if a.offer='one-time-analysis' then
   if p_input->>'checkoutId' is distinct from a.checkout_id then raise exception 'PAYMENT_IDENTITY_CONFLICT'; end if;
   if p_input->>'effect'<>'paid' then
    update public.payment_provider_events set attempt_id=a.id,status='completed',result_code='pending',completed_at=clock_timestamp() where id=e.id;return jsonb_build_object('result','pending');
   end if;
   if p_input->>'paymentId' is null or p_input->>'paymentId' !~ '^pi_[a-zA-Z0-9_]{1,100}$' then raise exception 'PAYMENT_IDENTITY_CONFLICT'; end if;
   if a.state='paid' then
    if a.payment_id is distinct from p_input->>'paymentId' then raise exception 'PAYMENT_IDENTITY_CONFLICT'; end if;
    update public.payment_provider_events set attempt_id=a.id,status='completed',result_code='replayed',completed_at=clock_timestamp() where id=e.id;return jsonb_build_object('result','replayed');
   end if;
   amount:=(p_input->>'amountMinor')::integer;currency:=upper(p_input->>'currency');
   if amount is null or currency is null then raise exception 'PAYMENT_INVALID'; end if;
   ref:=a.id;
   perform public.product_operation(a.owner_id,'grant',null,jsonb_build_object('capability','report.full-analysis','kind','one-time','scopeKind','report','scopeRef',a.scope_ref,
    'validFrom',to_timestamp(e.event_created),'validUntil',null,'allowance',1,'sourceRef',ref,'offer',a.offer,'purchaseAmountMinor',amount,'purchaseCurrency',currency));
   update public.payment_purchase_attempts set state='paid',payment_id=p_input->>'paymentId',grant_refs=array[ref],last_event_created=e.event_created where id=a.id;
  else
   desired:=p_input->>'status';start_at:=(p_input->>'periodStart')::bigint;end_at:=(p_input->>'periodEnd')::bigint;
   if desired not in ('active','past_due','unpaid','trialing','canceled','expired') or start_at is null or end_at is null or end_at<=start_at or p_input->>'subscriptionId' !~ '^sub_[a-zA-Z0-9_]{1,100}$'
    or a.subscription_id is not null and a.subscription_id is distinct from p_input->>'subscriptionId' then raise exception 'PAYMENT_INVALID'; end if;
   if a.period_start is not null and start_at<a.period_start or a.state in ('canceled','expired') and start_at<=a.period_start and desired='active' then
    update public.payment_provider_events set attempt_id=a.id,status='ignored',result_code='stale',completed_at=clock_timestamp() where id=e.id;return jsonb_build_object('result','stale');
   end if;
   if desired='active' and p_input->>'effect'='paid' then
    -- A provider extension/proration within the same period must not mint a second allowance.
    ref:=md5('stripe-test:'||(p_input->>'subscriptionId')||':'||start_at::text)::uuid;
    grants:='[]'::jsonb;
    for k,v in select * from jsonb_each(a.allowances) loop
     grants:=grants||jsonb_build_array(jsonb_build_object('capability',k,'kind','subscription','scopeKind','account','scopeRef',null,'validFrom',to_timestamp(start_at),'validUntil',to_timestamp(end_at),
      'allowance',v,'sourceRef',ref,'offer',a.offer));
    end loop;
    if not(ref=any(a.grant_refs)) then perform public.product_operation(a.owner_id,'grant-bundle',null,jsonb_build_object('grants',grants)); end if;
    if not(ref=any(a.grant_refs)) then a.grant_refs:=array_append(a.grant_refs,ref); end if;
   elsif desired in ('canceled','expired') then
    for ref in select id from public.product_entitlements where owner_id=a.owner_id and source_ref=any(a.grant_refs) and status='active' loop perform public.product_operation(a.owner_id,'revoke',ref,null); end loop;
   end if;
   update public.payment_purchase_attempts set state=desired,subscription_id=p_input->>'subscriptionId',period_start=start_at,period_end=end_at,
    cancel_at_period_end=coalesce((p_input->>'cancelAtPeriodEnd')::boolean,false),grant_refs=a.grant_refs,last_event_created=e.event_created where id=a.id;
  end if;
  update public.payment_provider_events set attempt_id=a.id,status='completed',result_code=case when p_input->>'effect'='paid' then 'fulfilled' else 'state-only' end,completed_at=clock_timestamp() where id=e.id;
  return jsonb_build_object('result',case when p_input->>'effect'='paid' then 'fulfilled' else 'state-only' end);
 else raise exception 'PAYMENT_INVALID'; end if;
end $$;
revoke all on function public.payment_operation(text,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.payment_operation(text,uuid,uuid,jsonb) to service_role;
commit;
