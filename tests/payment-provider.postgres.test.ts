import { randomUUID,createHmac,createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeAll,beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
import { productSchema } from './helpers/product-entitlements';
import { configuration,sql } from './helpers/medical-motion-postgres';
import { literal,client as motionClient } from './helpers/medical-motion-rpc';
import { cleanupArtifactOwner } from './helpers/medical-motion-artifacts';
const mocks=vi.hoisted(()=>({stripe:undefined as unknown,admin:vi.fn(),auth:vi.fn()}));
vi.mock('@/lib/supabase-admin',()=>({getSupabaseAdminClient:mocks.admin}));
vi.mock('@/lib/api/api-auth',()=>({authenticateApiRequest:mocks.auth}));
vi.mock('@/lib/billing/stripe.service',async original=>({...await original<typeof import('../lib/billing/stripe.service')>(),stripeTestClient:()=>mocks.stripe,
 createStripeCustomer:async({userId}:{userId:string})=>'cus_'+userId.replaceAll('-',''),
 createBillingPortalSession:async(input:any)=>(mocks.stripe as any).billingPortal.sessions.create({customer:input.customerId,return_url:input.returnUrl})}));
import { POST as checkout } from '../app/api/billing/checkout/route';
import { POST as webhook } from '../app/api/billing/webhook/route';
import { POST as portal } from '../app/api/billing/portal/route';
import { PaymentRepository,type PurchaseAttempt } from '../lib/billing/payment-repository';
import { PaymentFulfillmentService } from '../lib/billing/payment-fulfillment';
import { ProductAuthorizationService } from '../lib/billing/product-authorization';
import { reconcileLegacyBilling } from '../lib/billing/payment-reconciliation';
import { ReportProductAccessService } from '../lib/billing/report-product-access';
import type { HealthIntelligenceResult } from '../lib/health-intelligence/models/health-intelligence-result';
import { MedicalMotionDeliveryService } from '../lib/medical-motion/delivery/service';
import { MedicalMotionJobRepository } from '../lib/medical-motion/job.repository';
import type { MedicalMotionArtifactService } from '../lib/medical-motion/artifacts/service';
import { contextContent } from './helpers/medical-motion-context';
import { CompositionError } from '../lib/medical-motion/composition/specification';
import * as gate from '../lib/medical-motion/composition/authorization';
vi.mock('../lib/medical-motion/composition/authorization',()=>({prepareCompositionScene:vi.fn()}));
const SECRET='whsec_local_verified_fixture';
describe('verified TEST provider boundary with real guarded PostgreSQL (no skips)',()=>{
 let owner:string,other:string,ids:string[],sessions:Map<string,any>,subs:Map<string,any>,charges:Map<string,any>,prices:Map<string,any>;
 let gateway:any,repository:PaymentRepository,authz:ProductAuthorizationService,db:SupabaseClient;
 let legacy:any,reportReady:boolean;
 beforeAll(async()=>{configuration();await productSchema();if(await sql("select to_regclass('public.payment_provider_events') is null;")==='t')await sql(readFileSync('supabase/migrations/20261004022308_verified_payment_fulfillment.sql','utf8'));});
 beforeEach(async()=>{
  owner=randomUUID();other=randomUUID();ids=[];sessions=new Map();subs=new Map();charges=new Map();prices=new Map();legacy=null;reportReady=true;
  await sql(`insert into auth.users(id) values('${owner}'),('${other}');`);
  vi.stubEnv('ORGANHEAL_BILLING_MODE','stripe-test');vi.stubEnv('STRIPE_SECRET_KEY','sk_test_local_fixture');vi.stubEnv('STRIPE_WEBHOOK_SECRET',SECRET);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://pmjuyyqofkdbgqmrdbuh.supabase.co');
  vi.stubEnv('STRIPE_PRICE_ID_ONE_TIME_ANALYSIS','price_analysis');vi.stubEnv('STRIPE_PRICE_ID_PLUS_MONTHLY','price_monthly');
  vi.stubEnv('ORGANHEAL_BILLING_TEST_PLUS_ALLOWANCES',JSON.stringify({'medical-motion.personalized':2,'report.full-analysis':3}));
  prices.set('price_analysis',{id:'price_analysis',livemode:false,active:true,type:'one_time'});
  prices.set('price_monthly',{id:'price_monthly',livemode:false,active:true,type:'recurring',recurring:{interval:'month'}});
  const rpc=async(name:string,p:Record<string,unknown>)=>{
   if(name!=='payment_operation')return motionClient.rpc(name,p);
   try{const r=await sql(`set role service_role;select public.payment_operation(${literal(p.p_action)},${p.p_owner?literal(p.p_owner)+'::uuid':'null'},${p.p_id?literal(p.p_id)+'::uuid':'null'},${p.p_input?literal(JSON.stringify(p.p_input))+'::jsonb':'null'});`);return {data:JSON.parse(r||'null'),error:null};}catch{return {data:null,error:{message:'isolated-rpc-failed'}};}
  };
  db={rpc,from:(table:string)=>({select:()=>({eq:(key:string,value:unknown)=>({eq:()=>({maybeSingle:async()=>({data:value===owner?{id:101,extraction_status:reportReady?'Completed':'Pending'}:null,error:null})}),in:async()=>({data:value===owner?[{id:101}]:[],error:null}),maybeSingle:async()=>({data:table==='profiles'?legacy:null,error:null})})})})} as unknown as SupabaseClient;
  repository=new PaymentRepository(db);authz=new ProductAuthorizationService(db);mocks.admin.mockReturnValue(db);
  mocks.auth.mockResolvedValue({success:true,user:{id:owner,is_anonymous:false},client:db});
  gateway={prices:{retrieve:vi.fn(async(id:string)=>prices.get(id))},checkout:{sessions:{
   create:vi.fn(async(p:any)=>{const id='cs_test_'+p.client_reference_id.replaceAll('-','');let s=sessions.get(id);if(!s){s={id,url:'https://checkout.stripe.com/c/pay/test',livemode:false,customer:p.customer,mode:p.mode,metadata:p.metadata,client_reference_id:p.client_reference_id,
    line_items:{data:[{price:{id:p.line_items[0].price},quantity:1}]},payment_status:'unpaid',status:'open',payment_intent:'pi_'+p.client_reference_id.replaceAll('-',''),amount_total:650,currency:'usd'};sessions.set(id,s)}return s}),
   retrieve:vi.fn(async(id:string)=>{if(!sessions.has(id))throw Error('provider-unavailable');return sessions.get(id)})}},
   subscriptions:{retrieve:vi.fn(async(id:string)=>{if(!subs.has(id))throw Error('provider-unavailable');return subs.get(id)})},
   invoices:{retrieve:vi.fn(async(id:string)=>({id,livemode:false,parent:{subscription_details:{subscription:[...subs.keys()][0]}}}))},
   charges:{retrieve:vi.fn(async(id:string)=>charges.get(id))},paymentIntents:{retrieve:vi.fn(async(id:string)=>({livemode:false,metadata:[...sessions.values()].find(s=>s.payment_intent===id)?.metadata??{}}))},disputes:{retrieve:vi.fn()},billingPortal:{sessions:{create:vi.fn(async()=>({url:'https://billing.stripe.com/p/session/test'}))}}};
  mocks.stripe=gateway;
 });
 afterEach(async()=>{
  if(ids.length)await sql(`delete from public.payment_provider_events where id in (${ids.map(literal).join(',')});`);
  await sql(`delete from public.payment_provider_events where attempt_id in(select id from public.payment_purchase_attempts where owner_id in('${owner}','${other}'));delete from public.payment_purchase_attempts where owner_id in('${owner}','${other}');`);
  await cleanupArtifactOwner(other);await cleanupArtifactOwner(owner);vi.unstubAllEnvs();
 });
 const request=(body:unknown)=>new Request('http://localhost/api/billing/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 async function buy(offer='one-time-analysis') {
  const r=await checkout(request(offer==='one-time-analysis'?{offer,reportId:101}:{offer}));expect(r.status).toBe(200);
  const a=JSON.parse(await sql(`select row_to_json(a) from public.payment_purchase_attempts a where owner_id='${owner}' and offer=${literal(offer)};`)) as PurchaseAttempt;
  return {a,s:sessions.get(a.checkout_id!)};
 }
 function event(type:string,objectId:string,created=Math.floor(Date.now()/1000),id='evt_'+randomUUID().replaceAll('-','')) {
  ids.push(id);return {id,type,created,livemode:false,data:{object:{id:objectId}}} as unknown as Stripe.Event;
 }
 async function send(e:Stripe.Event,signature?:string) {
  const raw=JSON.stringify(e),t=Math.floor(Date.now()/1000),sig=signature??`t=${t},v1=${createHmac('sha256',SECRET).update(`${t}.${raw}`).digest('hex')}`;
  return webhook(new Request('http://localhost/api/billing/webhook',{method:'POST',headers:{'stripe-signature':sig},body:raw}));
 }
 async function plus() {
  const {a,s}=await buy('plus-monthly');const id='sub_'+a.id.replaceAll('-','');s.subscription=id;s.payment_status='paid';s.status='complete';
  const start=Math.floor(Date.now()/1000)-100,end=start+2592000;
  const sub={id,livemode:false,metadata:{organheal_attempt:a.id},customer:a.customer_id,status:'active',cancel_at_period_end:false,
   items:{data:[{price:{id:a.price_id,livemode:false},quantity:1,current_period_start:start,current_period_end:end}]},latest_invoice:{status:'paid',livemode:false,parent:{subscription_details:{subscription:id}}}} as any;
  Object.defineProperty(sub.latest_invoice,'lines',{configurable:true,get:()=>({data:[{pricing:{price_details:{price:a.price_id}},quantity:1,period:{start:sub.items.data[0].current_period_start,end:sub.items.data[0].current_period_end}}]})});
  subs.set(id,sub);return {a,s,sub};
 }
 const count=async()=>Number(await sql(`select count(*) from public.product_entitlements where owner_id='${owner}';`));
 it('checkout never grants; signed verified paid checkout unlocks only owned report with original actual amount',async()=>{
  const {a,s}=await buy();expect(await count()).toBe(0);expect((await authz.authorizeProductUse(owner,'report.full-analysis',{kind:'report',ref:'101'})).allowed).toBe(false);
  s.payment_status='paid';s.status='complete';expect((await send(event('checkout.session.completed',s.id))).status).toBe(200);
  expect((await authz.authorizeProductUse(owner,'report.full-analysis',{kind:'report',ref:'101'})).code).toBe('ALLOWED_ONE_TIME');
  expect((await authz.authorizeProductUse(owner,'report.full-analysis',{kind:'report',ref:'102'})).allowed).toBe(false);
  expect((await authz.authorizeProductUse(owner,'medical-motion.personalized',{kind:'account',ref:null})).allowed).toBe(false);
  expect(await sql(`select purchase_amount_minor||'|'||purchase_currency from public.product_entitlements where source_ref='${a.id}';`)).toBe('650|USD');
 });
 it('ten concurrent identical verified webhooks grant once and persist one event',async()=>{const {s}=await buy();s.status='complete';s.payment_status='paid';const e=event('checkout.session.completed',s.id);const out=await Promise.all(Array.from({length:10},()=>send(e)));expect(out.every(x=>x.status===200)).toBe(true);expect(await count()).toBe(1);expect(await sql(`select count(*) from public.payment_provider_events where id=${literal(e.id)};`)).toBe('1');});
 it('different paid event identities do not inflate one-time allowance',async()=>{const {s}=await buy();s.status='complete';s.payment_status='paid';await send(event('checkout.session.completed',s.id));await send(event('checkout.session.async_payment_succeeded',s.id,Math.floor(Date.now()/1000)+1));expect(await count()).toBe(1);});
 it('concurrent checkout/retry shares a stable attempt and provider idempotency key',async()=>{const out=await Promise.all(Array.from({length:5},()=>checkout(request({offer:'one-time-analysis',reportId:101}))));expect(out.every(x=>x.status===200)).toBe(true);expect(await sql(`select count(*) from public.payment_purchase_attempts where owner_id='${owner}';`)).toBe('1');expect(new Set(gateway.checkout.sessions.create.mock.calls.map((x:any)=>x[1].idempotencyKey)).size).toBe(1);expect(await count()).toBe(0);});
 it.each([{offer:'unknown'},{offer:'one-time-analysis',reportId:101,amount:1},{offer:'plus-monthly',plan:'plus'},{offer:'plus-monthly',priceId:'price_attacker'},{offer:'plus-monthly',allowance:999}])('rejects client commercial authority %j',async body=>{expect((await checkout(request(body))).status).toBe(400);expect(await count()).toBe(0);});
 it('cross-owner report checkout fails without creating an attempt',async()=>{mocks.auth.mockResolvedValue({success:true,user:{id:other},client:db});expect((await checkout(request({offer:'one-time-analysis',reportId:101}))).status).toBe(400);expect(gateway.checkout.sessions.create).not.toHaveBeenCalled();});
 it('anonymous checkout is denied',async()=>{mocks.auth.mockResolvedValue({success:true,user:{id:owner,is_anonymous:true}});expect((await checkout(request({offer:'plus-monthly'}))).status).toBe(401);});
 it('success redirect/query and client successful-payment claims cannot fulfill',async()=>{const {s}=await buy();expect((await checkout(request({offer:'one-time-analysis',reportId:101,success:true}))).status).toBe(400);expect(await count()).toBe(0);expect(s.metadata).toEqual({organheal_attempt:s.client_reference_id});});
 it.each(['missing','invalid'])('rejects %s signature before database/provider work',async which=>{const raw=JSON.stringify(event('checkout.session.completed','cs_test_unknown'));const r=await webhook(new Request('http://localhost/api/billing/webhook',{method:'POST',headers:which==='missing'?{}:{'stripe-signature':'t=1,v1=bad'},body:raw}));expect(r.status).toBe(400);expect(await count()).toBe(0);});
 it.each(['live-key','mode-disabled','live-event','foreign-account'])('rejects unsafe environment/event %s',async which=>{const e=event('customer.subscription.updated','sub_unknown');if(which==='live-key')vi.stubEnv('STRIPE_SECRET_KEY','sk_live_forbidden_fixture');if(which==='mode-disabled')vi.stubEnv('ORGANHEAL_BILLING_MODE','disabled');if(which==='live-event')e.livemode=true;if(which==='foreign-account')(e as any).account='acct_foreign';expect([400,503]).toContain((await send(e)).status);expect(await count()).toBe(0);});
 it('production Supabase host gate prevents connection',async()=>{vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://production-forbidden.supabase.co');expect((await checkout(request({offer:'plus-monthly'}))).status).toBe(503);expect(gateway.prices.retrieve).not.toHaveBeenCalled();});
 it('unknown customer/attempt and malformed metadata cannot grant any owner',async()=>{const {s}=await buy();s.status='complete';s.payment_status='paid';s.metadata.organheal_attempt=other;s.client_reference_id=other;await send(event('checkout.session.completed',s.id));expect(await count()).toBe(0);});
 it('provider customer mismatch cannot grant User B from User A payment',async()=>{const {s}=await buy();s.status='complete';s.payment_status='paid';s.customer='cus_'+other.replaceAll('-','');await send(event('checkout.session.completed',s.id));expect(await count()).toBe(0);expect((await authz.authorizeProductUse(other,'report.full-analysis',{kind:'report',ref:'101'})).allowed).toBe(false);});
 it('wrong provider price is rejected without commercial effect',async()=>{const {s}=await buy();s.status='complete';s.payment_status='paid';s.line_items.data[0].price.id='price_wrong';await send(event('checkout.session.completed',s.id));expect(await count()).toBe(0);});
 it('unsupported signed event is durably ignored',async()=>{const e=event('payment_method.attached','pm_fixture');expect((await send(e)).status).toBe(200);expect(await sql(`select status from public.payment_provider_events where id=${literal(e.id)};`)).toBe('ignored');});
 it('unpaid checkout cannot grant; later paid event can converge',async()=>{const {s}=await buy();await send(event('checkout.session.completed',s.id));expect(await count()).toBe(0);s.status='complete';s.payment_status='paid';await send(event('checkout.session.async_payment_succeeded',s.id));expect(await count()).toBe(1);});
 it('verified paid Plus activates configured products, including Medical Motion, not unconfigured capabilities',async()=>{const {sub}=await plus();await send(event('customer.subscription.updated',sub.id));expect((await authz.authorizeProductUse(owner,'medical-motion.personalized',{kind:'account',ref:null})).code).toBe('ALLOWED_SUBSCRIPTION');expect((await authz.authorizeProductUse(owner,'patient-pdf',{kind:'account',ref:null})).allowed).toBe(false);expect(await count()).toBe(2);});
 it('subscription update before checkout and duplicate invoice events does not duplicate the period',async()=>{const {sub,s}=await plus();await send(event('customer.subscription.updated',sub.id));await send(event('checkout.session.completed',s.id));await send(event('invoice.paid','in_fixture'));expect(await count()).toBe(2);});
 it('renewal creates exactly one new period bundle and keeps previous usage attached to its period',async()=>{const {sub}=await plus();await send(event('customer.subscription.updated',sub.id));const held=await authz.reserve(owner,'medical-motion.personalized',{kind:'account',ref:null},randomUUID());sub.items.data[0].current_period_start+=2592000;sub.items.data[0].current_period_end+=2592000;await send(event('invoice.paid','in_fixture',Math.floor(Date.now()/1000)+1));await send(event('invoice.paid','in_fixture',Math.floor(Date.now()/1000)+2));expect(await count()).toBe(4);expect((await authz.settle(owner,held.reservationId!,'consumed','success'))).toBe('consumed');});
 it('cancel-at-period-end preserves verified paid period; actual cancellation blocks new work and stale reactivation',async()=>{const {sub}=await plus();sub.cancel_at_period_end=true;await send(event('customer.subscription.updated',sub.id));expect((await authz.authorizeProductUse(owner,'medical-motion.personalized',{kind:'account',ref:null})).allowed).toBe(true);sub.status='canceled';await send(event('customer.subscription.deleted',sub.id,Math.floor(Date.now()/1000)+1));sub.status='active';await send(event('customer.subscription.updated',sub.id,Math.floor(Date.now()/1000)-1));expect((await authz.authorizeProductUse(owner,'medical-motion.personalized',{kind:'account',ref:null})).allowed).toBe(false);});
 it.each(['trialing','past_due','unpaid','incomplete_expired'])('does not grant new allowance for %s subscription',async status=>{const {sub}=await plus();sub.status=status;sub.latest_invoice.status='open';await send(event('invoice.payment_failed','in_fixture'));expect(await count()).toBe(0);});
 it('active subscription with unpaid latest invoice does not receive a new paid grant',async()=>{const {sub}=await plus();sub.latest_invoice.status='open';await send(event('customer.subscription.updated',sub.id));expect(await count()).toBe(0);});
 it('refund revokes future premium use, preserves historical consumed usage, and cannot be undone by replay',async()=>{const {s}=await buy();s.status='complete';s.payment_status='paid';await send(event('checkout.session.completed',s.id));const held=await authz.reserve(owner,'report.full-analysis',{kind:'report',ref:'101'},randomUUID());await authz.settle(owner,held.reservationId!,'consumed','success');charges.set('ch_fixture',{livemode:false,customer:s.customer,payment_intent:s.payment_intent,amount_refunded:650});await send(event('charge.refunded','ch_fixture'));await send(event('checkout.session.completed',s.id,Math.floor(Date.now()/1000)+1));expect((await authz.authorizeProductUse(owner,'report.full-analysis',{kind:'report',ref:'101'})).allowed).toBe(false);expect(await sql(`select state from public.product_usage_reservations where id='${held.reservationId}';`)).toBe('consumed');});
 it('no application role can directly mutate payment tables or call fulfillment',async()=>{for(const role of ['anon','authenticated','service_role'])expect(await sql(`select has_table_privilege('${role}','public.payment_provider_events','INSERT');`)).toBe('f');for(const role of ['anon','authenticated'])expect(await sql(`select has_function_privilege('${role}','public.payment_operation(text,uuid,uuid,jsonb)','EXECUTE');`)).toBe('f');});
 it('database outage during receive returns retryable failure and no grant',async()=>{mocks.admin.mockReturnValue({rpc:async()=>({error:{message:'PRIVATE_DB_DETAIL'}})});expect((await send(event('checkout.session.completed','cs_test_unknown'))).status).toBe(503);expect(await count()).toBe(0);});
 it('provider outage after durable receipt leaves pending event; replay converges',async()=>{const {s}=await buy();s.status='complete';s.payment_status='paid';const e=event('checkout.session.completed',s.id);gateway.checkout.sessions.retrieve.mockRejectedValueOnce(Error('PRIVATE_PROVIDER_DETAIL'));expect((await send(e)).status).toBe(503);expect(await sql(`select status from public.payment_provider_events where id=${literal(e.id)};`)).toBe('received');expect((await send(e)).status).toBe(200);expect(await count()).toBe(1);});
 it('crash after atomic grant/commit before acknowledgment safely replays',async()=>{const {s}=await buy();s.status='complete';s.payment_status='paid';const e=event('checkout.session.completed',s.id),real=db.rpc.bind(db);mocks.admin.mockReturnValue({rpc:async(name:string,p:any)=>{const r=await real(name,p);if(p.p_action==='fulfill')throw Error('CRASH_AFTER_COMMIT');return r}});expect((await send(e)).status).toBe(503);expect(await count()).toBe(1);mocks.admin.mockReturnValue(db);expect((await send(e)).status).toBe(200);expect(await count()).toBe(1);});
 it('crash between grant and event completion rolls back both; replay converges',async()=>{const {s}=await buy();s.status='complete';s.payment_status='paid';const e=event('checkout.session.completed',s.id);await sql(`create function public.payment_test_reject() returns trigger language plpgsql as $$ begin if new.status='completed' then raise exception 'TEST_CRASH';end if;return new;end $$;create trigger payment_test_reject before update on public.payment_provider_events for each row execute function public.payment_test_reject();`);try{expect((await send(e)).status).toBe(503);expect(await count()).toBe(0);}finally{await sql('drop trigger payment_test_reject on public.payment_provider_events;drop function public.payment_test_reject();')}expect((await send(e)).status).toBe(200);expect(await count()).toBe(1);});
 it('trusted reconciliation dry-run grants nothing, repeated execution fills lost webhook once',async()=>{const {a,s}=await buy();s.status='complete';s.payment_status='paid';const service=new PaymentFulfillmentService(repository,gateway as Stripe);expect((await service.reconcile(a.id)).dryRun).toBe(true);expect(await count()).toBe(0);await service.reconcile(a.id,false);await service.reconcile(a.id,false);expect(await count()).toBe(1);});
 it('legacy profiles.plan alone grants nothing; verified test references migrate repeat-safely with dry-run',async()=>{expect(await reconcileLegacyBilling(db,owner,'plus-monthly')).toEqual({dryRun:true,action:'no-verified-provider-reference'});const {a,sub}=await plus();delete sub.metadata.organheal_attempt;sub.metadata.supabase_user_id=owner;legacy={id:owner,plan:'plus',stripe_customer_id:a.customer_id,stripe_subscription_id:sub.id};expect((await reconcileLegacyBilling(db,owner,'plus-monthly')).action).toBe('verified-period-grant');expect(await count()).toBe(0);await reconcileLegacyBilling(db,owner,'plus-monthly',false);await reconcileLegacyBilling(db,owner,'plus-monthly',false);expect(await count()).toBe(2);});
 it('payment outages/failures do not suppress free safety or preview',async()=>{vi.stubEnv('ORGANHEAL_BILLING_MODE','disabled');expect((await checkout(request({offer:'plus-monthly'}))).status).toBe(503);for(const c of ['safety.alerts','report.preview'] as const)expect((await authz.authorizeProductUse(owner,c,{kind:'account',ref:null})).allowed).toBe(true);});
 it('metadata uses only opaque attempt identity, and checkout return contains only URL',async()=>{const r=await checkout(request({offer:'one-time-analysis',reportId:101}));expect(Object.keys(await r.json()).sort()).toEqual(['success','url']);const p=gateway.checkout.sessions.create.mock.calls[0][0];expect(Object.keys(p.metadata)).toEqual(['organheal_attempt']);expect(p.metadata).not.toHaveProperty('reportId');expect(p).not.toHaveProperty('email');});
 it('portal uses canonical TEST customer, not a legacy production profile customer',async()=>{await buy();legacy={stripe_customer_id:'cus_production_forbidden'};expect((await portal(new Request('http://localhost/api/billing/portal',{method:'POST'}))).status).toBe(200);expect(gateway.billingPortal.sessions.create.mock.calls[0][0].customer).toBe('cus_'+owner.replaceAll('-',''));});
 it('free preview to verified paid webhook reveals the same computed owned report without recomputation',async()=>{
  const result={findings:[{severity:'critical',reportEvidence:{markerStatus:'High'}}],patterns:{status:'ready',data:{patterns:[]}}} as unknown as HealthIntelligenceResult;
  const service=new ReportProductAccessService(db),analysis=randomUUID();const free=await service.reveal(owner,101,result,analysis);expect(free).not.toHaveProperty('full');expect(free.safetyAlerts).toEqual(result.findings);
  const {s}=await buy();s.status='complete';s.payment_status='paid';await send(event('checkout.session.completed',s.id));const paid=await service.reveal(owner,101,result,analysis);expect(paid.full).toBe(result);expect(paid.safetyAlerts).toEqual(free.safetyAlerts);expect((await service.reveal(owner,101,result,analysis)).full).toBe(result);
 });
 it.each([true,false])('verified Plus enters Medical Motion with independent TEST medical eligibility %s',async eligible=>{
  const {sub}=await plus();await send(event('customer.subscription.updated',sub.id));const source=randomUUID();await new MedicalMotionJobRepository(db).enqueue(owner,source,contextContent(),0);
  if(eligible)vi.mocked(gate.prepareCompositionScene).mockResolvedValue(undefined as never);else vi.mocked(gate.prepareCompositionScene).mockRejectedValue(new CompositionError('COMPOSITION_INVALID'));
  const service=new MedicalMotionDeliveryService(db,{} as MedicalMotionArtifactService,'development');const r=await service.create(owner,{sourceRef:source,sceneIndex:0,language:'en',aspectRatio:'16:9'});
  expect(r.status).toBe(eligible?'queued':'failed');expect(await sql(`select count(*) from public.product_usage_reservations where owner_id='${owner}';`)).toBe(eligible?'1':'0');
 });
 it('event ID conflict cannot change previously persisted payment facts',async()=>{const {s}=await buy();const e=event('checkout.session.completed',s.id);await send(e);e.type='checkout.session.async_payment_succeeded';expect((await send(e)).status).toBe(503);expect(await count()).toBe(0);});
 it('trial/past-due/outage never change already determined critical report safety',async()=>{
  const result={findings:[{severity:'critical'}],patterns:{status:'ready',data:{patterns:[]}}} as unknown as HealthIntelligenceResult;
  const {sub}=await plus();sub.status='past_due';await send(event('invoice.payment_failed','in_fixture'));const out=await new ReportProductAccessService(db).reveal(owner,101,result,randomUUID());expect(out.safetyAlerts).toEqual(result.findings);expect(out).not.toHaveProperty('full');
 });
 it('refund before paid callback resolves original server attempt and prevents late grant',async()=>{
  const {s}=await buy();charges.set('ch_early',{livemode:false,customer:s.customer,payment_intent:s.payment_intent,amount_refunded:650});
  const e=event('charge.refunded','ch_early');expect((await send(e)).status).toBe(200);s.status='complete';s.payment_status='paid';await send(event('checkout.session.completed',s.id));expect(await count()).toBe(0);
 });
 it('unfinished report extraction cannot start paid checkout',async()=>{reportReady=false;expect((await checkout(request({offer:'one-time-analysis',reportId:101}))).status).toBe(400);expect(gateway.prices.retrieve).not.toHaveBeenCalled();});
 it('annual remains disabled without explicit test configuration',async()=>{vi.stubEnv('ORGANHEAL_BILLING_TEST_ANNUAL_ENABLED','false');expect((await checkout(request({offer:'plus-annual'}))).status).toBe(503);});
 it('new subscription allowance needs explicit server configuration',async()=>{vi.stubEnv('ORGANHEAL_BILLING_TEST_PLUS_ALLOWANCES','{}');expect((await checkout(request({offer:'plus-monthly'}))).status).toBe(503);});
 it('legacy reconciliation rejects provider ownership mismatch even with Plus profile',async()=>{const {a,sub}=await plus();delete sub.metadata.organheal_attempt;sub.metadata.supabase_user_id=other;legacy={id:owner,plan:'plus',stripe_customer_id:a.customer_id,stripe_subscription_id:sub.id};await expect(reconcileLegacyBilling(db,owner,'plus-monthly',false)).rejects.toThrow('PAYMENT_EVENT_REJECTED');expect(await count()).toBe(0);});
 it('verified dispute revokes future one-time access without refunding/deleting usage',async()=>{const {s}=await buy();s.status='complete';s.payment_status='paid';await send(event('checkout.session.completed',s.id));charges.set('ch_dispute',{livemode:false,customer:s.customer,payment_intent:s.payment_intent,amount_refunded:0});gateway.disputes.retrieve.mockResolvedValue({livemode:false,charge:'ch_dispute'});expect((await send(event('charge.dispute.created','dp_fixture'))).status).toBe(200);expect((await authz.authorizeProductUse(owner,'report.full-analysis',{kind:'report',ref:'101'})).allowed).toBe(false);});
 it('verified subscription refund resolves invoice-payment identity and revokes only its owned grants',async()=>{
  const {a,sub}=await plus();await send(event('customer.subscription.updated',sub.id));gateway.paymentIntents.retrieve.mockResolvedValue({livemode:false,metadata:{}});
  gateway.invoicePayments={list:vi.fn(async()=>({has_more:false,data:[{livemode:false,invoice:'in_fixture'}]}))};charges.set('ch_sub',{livemode:false,customer:a.customer_id,payment_intent:'pi_subscription',amount_refunded:999});
  expect((await send(event('charge.refunded','ch_sub'))).status).toBe(200);expect((await authz.authorizeProductUse(owner,'medical-motion.personalized',{kind:'account',ref:null})).allowed).toBe(false);
 });
 it('provider same-period extension or proration does not mint another allowance bundle',async()=>{const {sub}=await plus();await send(event('customer.subscription.updated',sub.id));sub.items.data[0].current_period_end+=100;await send(event('invoice.paid','in_fixture',Math.floor(Date.now()/1000)+1));expect(await count()).toBe(2);});
 it('callback after remote checkout creation but before local bind recovers original verified attempt',async()=>{const {a,s}=await buy();await sql(`update public.payment_purchase_attempts set checkout_id=null where id='${a.id}';`);s.status='complete';s.payment_status='paid';expect((await send(event('checkout.session.completed',s.id))).status).toBe(200);expect(await count()).toBe(1);expect(await sql(`select checkout_id from public.payment_purchase_attempts where id='${a.id}';`)).toBe(s.id);});
 it('older paid invoice cannot grant the new unpaid period',async()=>{const {sub}=await plus();const old=sub.latest_invoice.lines;Object.defineProperty(sub.latest_invoice,'lines',{value:old,configurable:true});sub.items.data[0].current_period_start+=2592000;sub.items.data[0].current_period_end+=2592000;await send(event('customer.subscription.updated',sub.id));expect(await count()).toBe(0);});
 it('legacy reconciliation cannot use an older paid invoice to inflate current allowance',async()=>{const {a,sub}=await plus();delete sub.metadata.organheal_attempt;sub.metadata.supabase_user_id=owner;legacy={id:owner,plan:'plus',stripe_customer_id:a.customer_id,stripe_subscription_id:sub.id};const old=sub.latest_invoice.lines;Object.defineProperty(sub.latest_invoice,'lines',{value:old});sub.items.data[0].current_period_start+=2592000;sub.items.data[0].current_period_end+=2592000;expect((await reconcileLegacyBilling(db,owner,'plus-monthly')).action).toBe('state-only');await reconcileLegacyBilling(db,owner,'plus-monthly',false);expect(await count()).toBe(0);});
});
