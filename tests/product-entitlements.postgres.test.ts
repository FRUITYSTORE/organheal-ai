import { randomUUID } from "node:crypto";
import { beforeAll,beforeEach,afterEach,describe,it,expect,vi } from "vitest";
import { productSchema } from "./helpers/product-entitlements";
import { sql } from "./helpers/medical-motion-postgres";
import { client } from "./helpers/medical-motion-rpc";
import { cleanupArtifactOwner } from "./helpers/medical-motion-artifacts";
import { ProductAuthorizationService } from "../lib/billing/product-authorization";
import { ProviderEntitlements } from "../lib/billing/provider-entitlements";
import { MedicalMotionDeliveryService } from "../lib/medical-motion/delivery/service";
import { MedicalMotionJobRepository } from "../lib/medical-motion/job.repository";
import { BackgroundJobWorkerRepository } from "../lib/jobs/background-job-worker.repository";
import { contextContent } from "./helpers/medical-motion-context";
import { CompositionError } from "../lib/medical-motion/composition/specification";
import * as gate from "../lib/medical-motion/composition/authorization";
import type { MedicalMotionArtifactService } from "../lib/medical-motion/artifacts/service";
import type { EntitlementGrant } from "../lib/billing/product-contracts";
vi.mock("../lib/medical-motion/composition/authorization",()=>({prepareCompositionScene:vi.fn()}));
describe("guarded real PostgreSQL product entitlements and atomic usage",()=>{
 let a:string,b:string;const auth=new ProductAuthorizationService(client),provider=new ProviderEntitlements(auth),account={kind:"account",ref:null} as const;
 beforeAll(productSchema);
 beforeEach(async()=>{a=randomUUID();b=randomUUID();await sql(`insert into auth.users(id) values('${a}'),('${b}');`);vi.mocked(gate.prepareCompositionScene).mockResolvedValue(undefined as never);});
 afterEach(async()=>{await cleanupArtifactOwner(b);await cleanupArtifactOwner(a);vi.restoreAllMocks();});
 const grant=(patch:Partial<EntitlementGrant>={})=>auth.grant(a,{capability:"medical-motion.personalized",kind:"subscription",scope:account,
  validFrom:"2020-01-01T00:00:00Z",validUntil:"2099-01-01T00:00:00Z",allowance:1,sourceRef:randomUUID(),offer:"plus-monthly",...patch});
 const reserve=(action:string=randomUUID())=>auth.reserve(a,"medical-motion.personalized",account,action);
 it("Free allows actual preview/safety capabilities, denies premium full analysis",async()=>{
  expect((await auth.authorizeProductUse(a,"report.preview",account)).code).toBe("ALLOWED_FREE");expect((await auth.authorizeProductUse(a,"safety.alerts",account)).allowed).toBe(true);
  expect((await auth.authorizeProductUse(a,"report.full-analysis",{kind:"report",ref:"101"})).code).toBe("DENIED_ENTITLEMENT_REQUIRED");
 });
 it("one-time purchase is confined to one numeric report reference",async()=>{await provider.confirmAnalysis(a,"101",{sourceRef:randomUUID(),validFrom:"2020-01-01T00:00:00Z",validUntil:null});
  expect((await auth.authorizeProductUse(a,"report.full-analysis",{kind:"report",ref:"101"})).code).toBe("ALLOWED_ONE_TIME");expect((await auth.authorizeProductUse(a,"report.full-analysis",{kind:"report",ref:"102"})).allowed).toBe(false);});
 it("Plus activates configured capabilities only without final allowance defaults",async()=>{await provider.activateSubscription(a,{sourceRef:randomUUID(),validFrom:"2020-01-01T00:00:00Z",validUntil:"2099-01-01T00:00:00Z"},{"medical-motion.personalized":2,"history.extended":null});
  expect((await auth.authorizeProductUse(a,"medical-motion.personalized",account)).code).toBe("ALLOWED_SUBSCRIPTION");expect((await auth.authorizeProductUse(a,"history.extended",account)).allowed).toBe(true);expect((await auth.authorizeProductUse(a,"patient-pdf",account)).allowed).toBe(false);});
 it.each(["subscription","credit"] as const)("one remaining %s allowance permits exactly one of eight concurrent distinct actions",async kind=>{await grant({kind});const out=await Promise.all(Array.from({length:8},()=>reserve()));expect(out.filter(r=>r.allowed)).toHaveLength(1);expect(out.filter(r=>r.code==="DENIED_ALLOWANCE_EXHAUSTED")).toHaveLength(7);});
 it("one-time result consumes once, retains original paid provenance and cannot unlock another report",async()=>{
  const sourceRef=randomUUID();await provider.confirmAnalysis(a,"101",{sourceRef,validFrom:"2020-01-01T00:00:00Z",validUntil:null,purchase:{amountMinor:650,currency:"USD"}});
  const action=randomUUID(),r=await auth.reserve(a,"report.full-analysis",{kind:"report",ref:"101"},action);
  await auth.settle(a,r.reservationId!,"consumed","success");expect((await auth.reserve(a,"report.full-analysis",{kind:"report",ref:"101"},action)).state).toBe("consumed");
  expect((await auth.reserve(a,"report.full-analysis",{kind:"report",ref:"102"},randomUUID())).allowed).toBe(false);
  expect(await sql(`select purchase_amount_minor from public.product_entitlements where owner_id='${a}' and source_ref='${sourceRef}';`)).toBe("650");
 });
 it("subscription grant bundle rolls back every capability on a conflicting receipt",async()=>{
  const sourceRef=randomUUID(),period={sourceRef,validFrom:"2020-01-01T00:00:00Z",validUntil:"2099-01-01T00:00:00Z"};
  await provider.activateSubscription(a,period,{"history.extended":1});
  await expect(provider.activateSubscription(a,period,{"medical-motion.personalized":1,"history.extended":2})).rejects.toThrow();
  expect((await auth.authorizeProductUse(a,"medical-motion.personalized",account)).allowed).toBe(false);
 });
 it("eight identical retries reserve one unit and consume once",async()=>{await grant();const action=randomUUID(),out=await Promise.all(Array.from({length:8},()=>reserve(action)));expect(new Set(out.map(r=>r.reservationId)).size).toBe(1);
  await Promise.all(out.map(r=>auth.settle(a,r.reservationId!,"consumed","success")));expect(await sql(`select count(*) from public.product_usage_reservations where owner_id='${a}' and state='consumed';`)).toBe("1");expect((await reserve(action)).state).toBe("consumed");});
 it("credit is deducted on reserve and consumed once with immutable audit entries",async()=>{await grant({kind:"credit",offer:null});const r=await reserve();await auth.settle(a,r.reservationId!,"consumed","success");await auth.settle(a,r.reservationId!,"consumed","success");
  expect(await sql(`select sum(units) from public.product_credit_ledger where owner_id='${a}';`)).toBe("0");expect(await sql(`select count(*) from public.product_credit_ledger where owner_id='${a}';`)).toBe("3");await expect(sql(`update public.product_credit_ledger set units=999 where owner_id='${a}';`)).rejects.toThrow();});
 it.each(["cancelled","technical-failure","medical-unavailable"] as const)("%s releases exactly once and restores the last credit",async reason=>{await grant({kind:"credit",offer:null});const r=await reserve();await auth.settle(a,r.reservationId!,"released",reason);await auth.settle(a,r.reservationId!,"released",reason);
  expect(await sql(`select sum(units) from public.product_credit_ledger where owner_id='${a}';`)).toBe("1");expect((await reserve()).allowed).toBe(true);expect((await reserve()).allowed).toBe(false);});
 it("released action cannot be consumed or reserved anew on replay",async()=>{await grant();const action=randomUUID(),r=await reserve(action);await auth.settle(a,r.reservationId!,"released","cancelled");expect(await auth.settle(a,r.reservationId!,"consumed","success")).toBe("released");expect(await reserve(action)).toMatchObject({allowed:false,code:"DENIED_PRODUCT_UNAVAILABLE",state:"released"});});
 it("successful usage is not released by infrastructure cancellation; explicit refund is idempotent",async()=>{await grant({kind:"credit",offer:null});const r=await reserve();await auth.settle(a,r.reservationId!,"consumed","success");expect(await auth.settle(a,r.reservationId!,"released","cancelled")).toBe("consumed");await provider.refundUsage(a,r.reservationId!);await provider.refundUsage(a,r.reservationId!);expect(await sql(`select sum(units) from public.product_credit_ledger where owner_id='${a}';`)).toBe("1");});
 it("A cannot spend B entitlement/credit or settle B reservation by UUID",async()=>{await grant({kind:"credit",offer:null});expect((await auth.reserve(b,"medical-motion.personalized",account,randomUUID())).allowed).toBe(false);const r=await reserve();expect(await auth.settle(b,r.reservationId!,"consumed","success")).toBeNull();expect((await reserve((await sql(`select action_ref from public.product_usage_reservations where id='${r.reservationId}';`)))).state).toBe("reserved");});
 it("same action cannot change its entitlement scope",async()=>{await grant();const action=randomUUID();await reserve(action);await expect(auth.reserve(a,"medical-motion.personalized",{kind:"context",ref:randomUUID()},action)).rejects.toThrow();});
 it("expiry, future validity and revocation deny new reservations",async()=>{await grant({validUntil:"2021-01-01T00:00:00Z"});await grant({validFrom:"2090-01-01T00:00:00Z"});expect((await reserve()).allowed).toBe(false);const id=await grant() as {id:string};await auth.revoke(a,id.id);expect((await reserve()).allowed).toBe(false);});
 it("subscription periods have independent explicit allowance grants",async()=>{await grant();const r=await reserve();await auth.settle(a,r.reservationId!,"consumed","success");await grant();expect((await reserve()).allowed).toBe(true);});
 it("grant retry retains provenance; conflicting replay fails",async()=>{const sourceRef=randomUUID(),first=await grant({sourceRef}),second=await grant({sourceRef});expect(first).toEqual(second);await expect(grant({sourceRef,allowance:2})).rejects.toThrow();});
 it("RLS and direct grants prevent self-grant and ledger mutation",async()=>{for(const table of ["product_entitlements","product_usage_reservations","product_credit_ledger","product_usage_events"]){expect(await sql(`select relrowsecurity from pg_class where oid='public.${table}'::regclass;`)).toBe("t");for(const role of ["anon","authenticated","service_role"])await expect(sql(`set role ${role};select * from public.${table};`)).rejects.toThrow();}
  for(const role of ["anon","authenticated"])await expect(sql(`set role ${role};select public.product_operation('${a}','grant',null,'{}');`)).rejects.toThrow();});
 it("scope and entitlement identity remain immutable",async()=>{const id=await grant() as {id:string};await expect(sql(`update public.product_entitlements set owner_id='${b}' where id='${id.id}';`)).rejects.toThrow();await expect(grant({kind:"one-time",scope:account})).rejects.toThrow();});
 it("cost units are idempotent, contain no PHI and reject arbitrary prose/price/plan",async()=>{const event=randomUUID(),action=randomUUID();await auth.recordCost(a,event,action,{baseCacheHit:true,blenderAvoided:true,compositionExecutions:1,artifactBytes:123});await auth.recordCost(a,event,action,{baseCacheHit:true,blenderAvoided:true,compositionExecutions:1,artifactBytes:123});expect(await sql(`select count(*) from public.product_usage_events where owner_id='${a}';`)).toBe("1");await expect(auth.recordCost(a,randomUUID(),action,{clinicalValue:42} as never)).rejects.toThrow();await expect(auth.recordCost(a,event,action,{artifactBytes:124})).rejects.toThrow();});
 it("concurrent mismatched operational event replay cannot overwrite audit",async()=>{const event=randomUUID(),action=randomUUID();const r=await Promise.allSettled([auth.recordCost(a,event,action,{artifactBytes:1}),auth.recordCost(a,event,action,{artifactBytes:2})]);expect(r.filter(v=>v.status==="fulfilled")).toHaveLength(1);});
 async function motion(){const sourceRef=randomUUID();const base=await new MedicalMotionJobRepository(client).enqueue(a,sourceRef,contextContent(),0);const service=new MedicalMotionDeliveryService(client,{} as MedicalMotionArtifactService,"development");return {service,base,input:{sourceRef,sceneIndex:0,language:"ar",aspectRatio:"16:9"}};}
 it("Medical Motion denies commercial use before clinical source access",async()=>{const m=await motion();await expect(m.service.create(a,m.input)).rejects.toThrow("product-use-not-allowed");expect(gate.prepareCompositionScene).not.toHaveBeenCalled();});
 it("medically unavailable paid request creates safe unavailable without reserving/consuming",async()=>{await grant();vi.mocked(gate.prepareCompositionScene).mockRejectedValue(new CompositionError("COMPOSITION_INVALID"));const m=await motion();expect(await m.service.create(a,m.input)).toMatchObject({status:"failed",stage:"unavailable"});expect(await sql(`select count(*) from public.product_usage_reservations where owner_id='${a}';`)).toBe("0");expect((await reserve()).allowed).toBe(true);});
 it("Medical Motion reservation and product creation are atomic under last-unit concurrency",async()=>{await grant();const x=await motion(),y=await motion();const out=await Promise.allSettled([x.service.create(a,x.input),y.service.create(a,y.input)]);expect(out.filter(v=>v.status==="fulfilled")).toHaveLength(1);expect(await sql(`select count(*) from public.medical_motion_delivery_requests where user_id='${a}';`)).toBe("1");expect(await sql(`select count(*) from public.product_usage_reservations where owner_id='${a}';`)).toBe("1");});
 it("identical product request replay uses its original reservation despite exhaustion",async()=>{await grant();const m=await motion(),x=await m.service.create(a,m.input),y=await m.service.create(a,m.input);expect(y.requestId).toBe(x.requestId);expect(await sql(`select count(*) from public.product_usage_reservations where owner_id='${a}';`)).toBe("1");});
 it("durable product cancellation releases held allowance and preserves shared base",async()=>{await grant();const m=await motion(),p=await m.service.create(a,m.input);await m.service.cancel(a,p.requestId);expect(await sql(`select state from public.product_usage_reservations where product_request_id='${p.requestId}';`)).toBe("released");expect(await sql(`select status from public.background_jobs where id='${m.base.jobId}';`)).toBe("pending");expect((await reserve()).allowed).toBe(true);});
 it("terminal backend failure releases without requiring owner polling",async()=>{await grant();const m=await motion(),p=await m.service.create(a,m.input),jobs=new BackgroundJobWorkerRepository(client,["medical-motion-render"]),job=(await jobs.claimById(m.base.jobId))!;await jobs.markFailed({jobId:job.id,attemptToken:job.attemptToken,errorMessage:"TEST_FAILURE"});expect(await sql(`select state from public.product_usage_reservations where product_request_id='${p.requestId}';`)).toBe("released");});
});
