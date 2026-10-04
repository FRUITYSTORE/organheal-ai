import { randomUUID } from "node:crypto";
import { beforeAll,beforeEach,afterEach,describe,it,expect,vi } from "vitest";
import { client } from "./helpers/medical-motion-rpc";
import { sql } from "./helpers/medical-motion-postgres";
import { deliverySchema } from "./helpers/medical-motion-delivery";
import { cleanupArtifactOwner } from "./helpers/medical-motion-artifacts";
import { contextContent } from "./helpers/medical-motion-context";
import { MedicalMotionJobRepository } from "../lib/medical-motion/job.repository";
import { DeliveryRepository } from "../lib/medical-motion/delivery/repository";
import { MedicalMotionDeliveryService } from "../lib/medical-motion/delivery/service";
import type { MedicalMotionArtifactService } from "../lib/medical-motion/artifacts/service";
import { BackgroundJobWorkerRepository } from "../lib/jobs/background-job-worker.repository";
import { CompositionError } from "../lib/medical-motion/composition/specification";
import * as gate from "../lib/medical-motion/composition/authorization";
import { MedicalMotionArtifactRepository } from "../lib/medical-motion/artifacts/repository";
import { BackgroundJobResultRepository } from "../lib/jobs/background-job-result.repository";
import { ReusableArtifactRepository,reusableArtifactIdentity } from "../lib/medical-motion/artifacts/reuse";
import { compositionScene,compositionSpecification } from "./helpers/composition-scene";
import { validatePersonalization } from "../lib/medical-motion/composition/specification";
import { issueApprovedSpec,privateHash } from "../lib/medical-motion/composition/approved-spec";
import { productSchema,grantTestMotion } from "./helpers/product-entitlements";
import { ApprovedPersonalizationRepository } from "../lib/medical-motion/composition/approved-spec.repository";
vi.mock("../lib/medical-motion/composition/authorization",()=>({prepareCompositionScene:vi.fn()}));
describe("isolated local PostgreSQL delivery product lifecycle",()=>{
 let owner:string,other:string,revision:string,base:string;
 const repo=new DeliveryRepository(client), jobs=new BackgroundJobWorkerRepository(client,["medical-motion-render"]);
 const service=new MedicalMotionDeliveryService(client,{} as MedicalMotionArtifactService,"development");
 const input=()=>({sourceRef:revision,sceneIndex:0,language:"en" as const,aspectRatio:"16:9" as const});
 beforeAll(productSchema);
 beforeEach(async()=>{owner=randomUUID();other=randomUUID();revision=randomUUID();await sql(`insert into auth.users(id) values('${owner}'),('${other}');`);
  await grantTestMotion(owner);
  base=(await new MedicalMotionJobRepository(client).enqueue(owner,revision,contextContent(),0)).jobId;vi.mocked(gate.prepareCompositionScene).mockResolvedValue(undefined as never);});
 afterEach(async()=>{await cleanupArtifactOwner(other);await cleanupArtifactOwner(owner);vi.restoreAllMocks();});
 async function approved(language:"en"|"ar"="en") {
  const job=(await jobs.claimById(base))!,identity=reusableArtifactIdentity(compositionScene(),"b".repeat(64),"video")!,reuse=new ReusableArtifactRepository(client),miss=await reuse.operation(job,"reserve",identity),ar=new MedicalMotionArtifactRepository(client);
  const artifact=await ar.reserve(job,{media:"video",byteSize:123,sha256:"a".repeat(64)});await ar.persist(job,artifact.id);await reuse.operation(job,"ready",identity,miss.epoch,artifact.id);
  await new BackgroundJobResultRepository(client).publish({jobId:job.id,attemptToken:job.attemptToken,manifest:{kind:"artifact",referenceId:artifact.id}});
  const contextId=(job.payload as {executionContextId:string}).executionContextId,specification={...compositionSpecification(),baseArtifactId:artifact.id,language};
  const cap=validatePersonalization(specification,compositionScene(),{userId:owner,contextId,baseSha256:artifact.sha256,duration:5});
  const content={schemaVersion:"1" as const,producerVersion:"1" as const,compositionVersion:"1" as const,userId:owner,contextId,sceneIndex:0,baseJobId:base,baseArtifactId:artifact.id,
   baseFingerprint:identity.baseFingerprint,baseOutputFingerprint:identity.outputFingerprint,renderSignature:identity.renderSignature,baseSha256:artifact.sha256,duration:5,fingerprint:cap.fingerprint,
   approvalDisposition:"structured-source" as const,source:{kind:"health-check-in" as const,id:randomUUID(),field:"wellnessScore" as const,fingerprint:"c".repeat(64)},specification:cap.specification};
  return issueApprovedSpec({...content,logicalIdentity:privateHash(content)});
 }
 it("eight double-click/network retries resolve one stable product request",async()=>{const rows=await Promise.all(Array.from({length:8},()=>service.create(owner,input())));expect(new Set(rows.map(r=>r.requestId)).size).toBe(1);expect(await sql(`select count(*) from public.medical_motion_delivery_requests where user_id='${owner}';`)).toBe("1");});
 it("request ID differs from context/base job and public projection hides all internals",async()=>{const r=await service.create(owner,input());const raw=await repo.read(owner,r.requestId);expect(r.requestId).not.toBe(base);expect(r.requestId).not.toBe(raw.contextId);
  expect(Object.keys(r).sort()).toEqual(["requestId","status","stage","createdAt","updatedAt","retryable","pollAfterSeconds","failureCode"].sort());});
 it.each(["read","cancel"] as const)("other owner cannot %s known UUID",async action=>{const r=await service.create(owner,input());await expect(repo[action](other,r.requestId)).rejects.toThrow("not-found");});
 it("other owner cannot resolve source reference or create its request",async()=>{await grantTestMotion(other);await expect(service.create(other,input())).rejects.toThrow("not-found");});
 it("history is owner-only and bounded",async()=>{await service.create(owner,input());expect((await service.history(other)).requests).toHaveLength(0);expect((await service.history(owner)).requests).toHaveLength(1);await expect(service.history(owner,1001)).rejects.toThrow();});
 it("queued cancellation is idempotent and does not mutate shared base infrastructure",async()=>{const r=await service.create(owner,input());expect((await service.cancel(owner,r.requestId)).status).toBe("cancelled");expect((await service.cancel(owner,r.requestId)).status).toBe("cancelled");expect(await sql(`select status from public.background_jobs where id='${base}';`)).toBe("pending");expect(await repo.pending()).toEqual([]);});
 it("running base maps rendering, cancellation preserves the current base lease",async()=>{const r=await service.create(owner,input()),job=(await jobs.claimById(base))!;expect((await service.status(owner,r.requestId)).status).toBe("rendering");await service.cancel(owner,r.requestId);expect((await jobs.renewLease({jobId:base,attemptToken:job.attemptToken})).outcome).toBe("applied");});
 it("automatic retry maps preparing without patient retry or diagnostic leakage",async()=>{const r=await service.create(owner,input()),job=(await jobs.claimById(base))!;await jobs.scheduleRetry({jobId:base,attemptToken:job.attemptToken,retryDelayMs:30000,errorMessage:"PRIVATE_INTERNAL_ERROR"});const result=await service.status(owner,r.requestId);expect(result.status).toBe("preparing");expect(result.retryable).toBe(false);expect(JSON.stringify(result)).not.toContain("PRIVATE");});
 it("medical gate failure is durable product unavailable, not a generic technical error",async()=>{vi.mocked(gate.prepareCompositionScene).mockRejectedValue(new CompositionError("COMPOSITION_INVALID"));const r=await service.create(owner,input());expect(r).toMatchObject({status:"failed",stage:"unavailable",failureCode:"medical-visualization-not-available"});expect(await repo.pending()).toEqual([]);});
 it("central product eligibility denial precedes source lookup and request creation",async()=>{const denied=new MedicalMotionDeliveryService(client,{} as MedicalMotionArtifactService,"development",undefined,async()=>false);await expect(denied.create(owner,input())).rejects.toThrow("product-use-not-allowed");expect(await sql(`select count(*) from public.medical_motion_delivery_requests where user_id='${owner}';`)).toBe("0");});
 it("Arabic/English identities differ but retain the same base work",async()=>{const a=await service.create(owner,input()),b=await service.create(owner,{...input(),language:"ar"});expect(a.requestId).not.toBe(b.requestId);expect((await repo.read(owner,a.requestId)).baseJobId).toBe((await repo.read(owner,b.requestId)).baseJobId);});
 it("RLS and grants deny direct application table access and RPC invocation",async()=>{expect(await sql("select relrowsecurity from pg_class where oid='public.medical_motion_delivery_requests'::regclass;")).toBe("t");for(const role of ["anon","authenticated","service_role"])await expect(sql(`set role ${role};select * from public.medical_motion_delivery_requests;`)).rejects.toThrow();for(const role of ["anon","authenticated"])await expect(sql(`set role ${role};select public.motion_delivery_operation('${owner}','list');`)).rejects.toThrow();});
 it("logical identity is immutable even under privileged accidental mutation",async()=>{const r=await service.create(owner,input());await expect(sql(`update public.medical_motion_delivery_requests set user_id='${other}' where id='${r.requestId}';`)).rejects.toThrow();});
 it("queued or cancelled product never issues artifact access",async()=>{const r=await service.create(owner,input());await expect(service.access(owner,r.requestId)).rejects.toThrow("not-ready");await service.cancel(owner,r.requestId);await expect(service.access(owner,r.requestId)).rejects.toThrow("not-ready");await expect(service.access(other,r.requestId)).rejects.toThrow("not-found");});
 it("approval/spec/job/product linkage commits atomically and exact replay reuses it",async()=>{const r=await service.create(owner,input()),spec=await approved();const a=await repo.approve(owner,r.requestId,spec),b=await repo.approve(owner,r.requestId,spec);expect(a.specId).not.toBeNull();expect(b.specId).toBe(a.specId);expect(await sql(`select count(*) from public.medical_motion_approved_specs where user_id='${owner}';`)).toBe("1");expect(a.status).toBe("personalizing");});
 it("mismatched approved language rolls back inserted spec/job and preserves product",async()=>{const r=await service.create(owner,input()),spec=await approved("ar");await expect(repo.approve(owner,r.requestId,spec)).rejects.toThrow();expect(await sql(`select count(*) from public.medical_motion_approved_specs where user_id='${owner}';`)).toBe("0");expect(await sql(`select count(*) from public.background_jobs where user_id='${owner}' and job_type='medical-motion-compose';`)).toBe("0");});
 it("cancellation winning approval prevents any orphan composition",async()=>{const r=await service.create(owner,input()),spec=await approved();await service.cancel(owner,r.requestId);const a=await repo.approve(owner,r.requestId,spec);expect(a.status).toBe("cancelled");expect(await sql(`select count(*) from public.medical_motion_approved_specs where user_id='${owner}';`)).toBe("0");});
 it("copied approval and cross-owner approval cannot mint product work",async()=>{const r=await service.create(owner,input()),spec=await approved();await expect(repo.approve(owner,r.requestId,JSON.parse(JSON.stringify(spec)))).rejects.toThrow("invalid-request");await expect(repo.approve(other,r.requestId,spec)).rejects.toThrow("invalid-request");});
 it("permanent source drift closes pending orchestration safely",async()=>{const r=await service.create(owner,input());await approved();await repo.ineligible(owner,r.requestId);expect((await service.status(owner,r.requestId)).failureCode).toBe("source-no-longer-eligible");expect(await repo.pending()).toEqual([]);});
 it("cancelling medically unavailable terminal request preserves its unavailable state",async()=>{vi.mocked(gate.prepareCompositionScene).mockRejectedValue(new CompositionError("COMPOSITION_INVALID"));const r=await service.create(owner,input());expect((await service.cancel(owner,r.requestId)).status).toBe("failed");});
 it.each(["heart","lung","kidney","liver","brain"])("product orchestration consumes generic %s TEST scene authority",async organ=>{
  const index=["heart","lung","kidney","liver","brain"].indexOf(organ),scene=compositionScene(index);
  expect(scene.scene.organIds).toContain(organ==="lung"?"lungs":organ==="kidney"?"kidneys":organ);
  vi.mocked(gate.prepareCompositionScene).mockResolvedValue({presentation:scene,context:{} as never,checked:{} as never});
  const r=await service.create(owner,input());expect(r.status).toBe("queued");expect(r.requestId).not.toBe(base);
  expect(gate.prepareCompositionScene).toHaveBeenCalledWith(client,owner,(await repo.read(owner,r.requestId)).contextId,0,"development");
 });
 it("usage dimensions are bounded and contain no clinical/private identity values",async()=>{const events:unknown[]=[],tracked=new MedicalMotionDeliveryService(client,{} as MedicalMotionArtifactService,"development",undefined,async()=>true,v=>events.push(v));await tracked.create(owner,input());expect(events).toEqual([{outputProfile:"16:9",durationBand:"unknown",baseRenderNeeded:null,baseCacheHit:null,compositionNeeded:true,compositionReused:false}]);expect(JSON.stringify(events)).not.toContain(owner);expect(JSON.stringify(events)).not.toContain(revision);});
 it("publication-pending base has truthful finalizing stage without a ready descriptor",async()=>{const r=await service.create(owner,input()),job=(await jobs.claimById(base))!;await sql(`select * from public.defer_background_job_completion('${job.id}','${job.attemptToken}');`);expect(await service.status(owner,r.requestId)).toMatchObject({status:"preparing",stage:"finalizing"});expect((await service.status(owner,r.requestId)).artifact).toBeUndefined();});
 it("terminal backend failure stays failed when cancellation is requested",async()=>{const r=await service.create(owner,input()),job=(await jobs.claimById(base))!;await jobs.markFailed({jobId:base,attemptToken:job.attemptToken,errorMessage:"PRIVATE_RENDER_FAILURE"});const before=await service.status(owner,r.requestId),after=await service.cancel(owner,r.requestId);expect(before.status).toBe("failed");expect(after.status).toBe("failed");expect(after.failureCode).toBe("unable-to-create-video");expect(JSON.stringify(after)).not.toContain("PRIVATE");});
 it("fenced private publication consumes automatically once and records safe successful-result units",async()=>{
  const r=await service.create(owner,input()),cap=await approved(),linked=await repo.approve(owner,r.requestId,cap);
  const spec=await new ApprovedPersonalizationRepository(client).read(linked.specId!,owner),job=(await new BackgroundJobWorkerRepository(client,["medical-motion-compose"]).claimById(spec.jobId))!;
  const artifacts=new MedicalMotionArtifactRepository(client),artifact=await artifacts.reserve(job,{media:"video",byteSize:123,sha256:"d".repeat(64)});
  const recorded=await client.rpc("motion_composition_provenance",{p_job_id:job.id,p_user_id:owner,p_attempt_token:job.attemptToken,p_artifact_id:artifact.id,
    p_base_job_id:cap.baseJobId,p_base_artifact_id:cap.baseArtifactId,p_context_id:cap.contextId,p_provenance:{compositionVersion:"1",fingerprint:cap.fingerprint,
    overlaySpecFingerprint:cap.fingerprint,baseSha256:cap.baseSha256,baseFingerprint:cap.baseFingerprint,baseOutputFingerprint:cap.baseOutputFingerprint,
    baseRenderSignature:cap.renderSignature,outputProfile:"16:9",language:"en",audioComponents:[],disposition:"private-composed"}});
  expect(recorded.error).toBeNull();await artifacts.persist(job,artifact.id);const results=new BackgroundJobResultRepository(client),publication={jobId:job.id,attemptToken:job.attemptToken,manifest:{kind:"artifact" as const,referenceId:artifact.id}};
  await results.publish(publication);await results.publish(publication);
  expect(await sql(`select state from public.product_usage_reservations where product_request_id='${r.requestId}';`)).toBe("consumed");
  expect(await sql(`select count(*) from public.product_usage_events where owner_id='${owner}' and action_ref='${r.requestId}';`)).toBe("1");
  expect((await repo.cancel(owner,r.requestId)).status).toBe("ready");
  expect(await sql(`select units->>'artifactBytes' from public.product_usage_events where owner_id='${owner}';`)).toBe("123");
 });
 it("cancel winning fenced publication releases allowance and never consumes",async()=>{
  const r=await service.create(owner,input()),cap=await approved(),linked=await repo.approve(owner,r.requestId,cap);
  const spec=await new ApprovedPersonalizationRepository(client).read(linked.specId!,owner),job=(await new BackgroundJobWorkerRepository(client,["medical-motion-compose"]).claimById(spec.jobId))!;
  const artifacts=new MedicalMotionArtifactRepository(client),artifact=await artifacts.reserve(job,{media:"video",byteSize:123,sha256:"d".repeat(64)});await artifacts.persist(job,artifact.id);
  await service.cancel(owner,r.requestId);await new BackgroundJobResultRepository(client).publish({jobId:job.id,attemptToken:job.attemptToken,manifest:{kind:"artifact",referenceId:artifact.id}});
  expect(await sql(`select count(*) from public.background_job_results where job_id='${job.id}';`)).toBe("0");
  expect(await sql(`select state from public.product_usage_reservations where product_request_id='${r.requestId}';`)).toBe("released");
 });
});
