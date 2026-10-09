import {describe,it,expect,beforeAll,beforeEach,afterEach,vi,type Mock} from "vitest";
import {randomUUID,createHash} from "node:crypto";
import {orchestrationSchema,orchestrationFixture,client} from "./helpers/orchestration";
import {sql} from "./helpers/medical-motion-postgres";
import {cleanupArtifactOwner} from "./helpers/medical-motion-artifacts";
import {MedicalMotionExecutionContextRepository} from "../lib/medical-motion/execution-context.repository";
import {MedicalMotionJobRepository} from "../lib/medical-motion/job.repository";
import {MedicalMotionArtifactRepository} from "../lib/medical-motion/artifacts/repository";
import {ReusableArtifactRepository,reusableArtifactIdentity} from "../lib/medical-motion/artifacts/reuse";
import {BackgroundJobWorkerRepository} from "../lib/jobs/background-job-worker.repository";
import {BackgroundJobResultRepository} from "../lib/jobs/background-job-result.repository";
import {TrustedMultiSceneOrchestrationService} from "../lib/medical-motion/orchestration/service";
import {OrchestrationRepository} from "../lib/medical-motion/orchestration/repository";
import {SceneSequenceRegistry} from "../lib/medical-motion/orchestration/sequence";
import {issueTimeline} from "../lib/medical-motion/composition/timeline-specification";
import {rehashTimeline,timelineFixture} from "./helpers/timeline-fixture";
import type {TrustedTimelineProducer} from "../lib/medical-motion/composition/timeline-producer";
import type {MedicalMotionArtifactService} from "../lib/medical-motion/artifacts/service";
import {prepareCompositionScene} from "../lib/medical-motion/composition/authorization";
import {CompositionError} from "../lib/medical-motion/composition/specification";
vi.mock("../lib/medical-motion/composition/authorization",()=>({prepareCompositionScene:vi.fn()}));
describe("real isolated durable internal orchestration",()=>{
 let f:Awaited<ReturnType<typeof orchestrationFixture>>,approve:TrustedTimelineProducer["approve"],producer:Mock<TrustedTimelineProducer["approve"]>,service:TrustedMultiSceneOrchestrationService;
 const repo=new OrchestrationRepository(client),artifacts=new MedicalMotionArtifactRepository(client),worker=new BackgroundJobWorkerRepository(client,["medical-motion-render"]);
 function restart(){return new TrustedMultiSceneOrchestrationService(client,{repository:artifacts,retrieval:(id:string,owner:string)=>artifacts.published(id,owner)} as unknown as MedicalMotionArtifactService,
  {approve:producer} as unknown as TrustedTimelineProducer,f.sequences,f.profiles);}
 beforeAll(orchestrationSchema);
 beforeEach(async()=>{
  f=await orchestrationFixture();
  f={...f,segments:f.segments.map(s=>({...s,renderSignature:createHash("sha256").update(randomUUID()).digest("hex")}))};
  vi.mocked(prepareCompositionScene).mockImplementation(async(_client,owner,ctx,index)=>{
   const context=await new MedicalMotionExecutionContextRepository(client,f.profiles).read(ctx,owner);
   return {context,presentation:f.scenes[index],checked:{ok:true,request:{renderSignature:f.segments[index].renderSignature}}} as unknown as Awaited<ReturnType<typeof prepareCompositionScene>>;
  });
  approve=async(owner,ctx,ordered,transitions,specification)=>{
   const segments=await Promise.all(ordered.map(async(o,i)=>{const a=(await artifacts.published(o.baseJobId,owner))!;return {...f.segments[i],sceneIndex:o.sceneIndex,baseJobId:o.baseJobId,baseArtifactId:a.id,baseSha256:a.sha256};}));
   return issueTimeline(rehashTimeline({...timelineFixture().content,userId:owner,contextId:ctx,segments,transitions,specification}),f.scenes);
  };producer=vi.fn(approve);service=restart();
 });
 afterEach(async()=>{vi.mocked(prepareCompositionScene).mockReset();if(f)await cleanupArtifactOwner(f.owner);});
 const signal=()=>new AbortController().signal;
 const create=()=>service.create(f.owner,f.request,f.selection,"en","16:9");
 async function publishBases(count=2){const row=await repo.read(f.owner,f.request);
  for(let i=0;i<count;i++){const job=(await worker.claimById(row.base_job_ids[i]))!;
   const identity=reusableArtifactIdentity(f.scenes[i],f.segments[i].renderSignature,"video")!;
   const reuse=new ReusableArtifactRepository(client),r=await reuse.operation(job,"reserve",identity);
   expect(r.outcome).toBe("CACHE_MISS");
   const a=await artifacts.reserve(job,{media:"video",byteSize:123,sha256:"a".repeat(64)});await artifacts.persist(job,a.id);await reuse.operation(job,"ready",identity,r.epoch,a.id);
   await new BackgroundJobResultRepository(client).publish({jobId:job.id,attemptToken:job.attemptToken,manifest:{kind:"artifact",referenceId:a.id}});
  }
 }
 it("creation and restart create one stable mapping; partial bases wait; all bases approve once",async()=>{
  expect((await create()).status).toBe("queued");await restart().advancePending(signal());let row=await repo.read(f.owner,f.request);
  expect(row.base_job_ids).toHaveLength(2);expect(row.base_job_ids[0]).toBe(f.initialJobId);expect(producer).not.toHaveBeenCalled();
  const jobs=row.base_job_ids;await restart().advancePending(signal());expect((await repo.read(f.owner,f.request)).base_job_ids).toEqual(jobs);
  await publishBases(1);await restart().advancePending(signal());expect(producer).not.toHaveBeenCalled();
  const second=(await worker.claimById(jobs[1]))!,identity=reusableArtifactIdentity(f.scenes[1],f.segments[1].renderSignature,"video")!,reuse=new ReusableArtifactRepository(client),r=await reuse.operation(second,"reserve",identity);
  expect(r.outcome).toBe("CACHE_MISS");
  const a=await artifacts.reserve(second,{media:"video",byteSize:123,sha256:"a".repeat(64)});await artifacts.persist(second,a.id);await reuse.operation(second,"ready",identity,r.epoch,a.id);
  await new BackgroundJobResultRepository(client).publish({jobId:second.id,attemptToken:second.attemptToken,manifest:{kind:"artifact",referenceId:a.id}});
  await restart().advancePending(signal());row=await repo.read(f.owner,f.request);expect(row.status).toBe("composing");expect(producer).toHaveBeenCalledTimes(1);
  expect(producer.mock.calls[0][2]).toEqual(jobs.map((baseJobId,i)=>({sceneIndex:i,baseJobId})));expect(producer.mock.calls[0][3]).toEqual(f.definition.transitions);
  await restart().advancePending(signal());expect(producer).toHaveBeenCalledTimes(1);expect((await repo.read(f.owner,f.request)).spec_id).toBe(row.spec_id);
  expect(await sql(`select count(*) from public.background_jobs where user_id='${f.owner}' and job_type='medical-motion-compose';`)).toBe("1");
 });
 it("valid eight-scene sequence is accepted and mapped",async()=>{await cleanupArtifactOwner(f.owner);f=await orchestrationFixture(8);service=restart();await create();await service.advancePending(signal());expect((await repo.read(f.owner,f.request)).base_job_ids).toHaveLength(8);});
 it("repeat creation is idempotent",async()=>{expect(await create()).toEqual(await create());});
 it.each(["copy","owner","context"])("rejects %s capability",async kind=>{const s=kind==="copy"?structuredClone(f.selection):f.selection;await expect(service.create(kind==="owner"?randomUUID():f.owner,f.request,kind==="context"?{...s,contextId:randomUUID()}:s,"en","16:9")).rejects.toThrow();expect(await sql(`select count(*) from public.medical_motion_orchestrations where user_id='${f.owner}';`)).toBe("0");});
 it.each(["outside","unbound"])("rejects %s scene before record/job creation",async kind=>{
  const d={...f.definition,sceneIndices:kind==="outside"?[0,2]:[0,1]},registry=new SceneSequenceRegistry([d]);
  if(kind==="unbound")vi.mocked(prepareCompositionScene).mockRejectedValue(new CompositionError("COMPOSITION_INVALID"));
  const s=new TrustedMultiSceneOrchestrationService(client,{} as MedicalMotionArtifactService,{} as TrustedTimelineProducer,registry,f.profiles);
  await expect(s.create(f.owner,f.request,registry.resolve(d.sequenceId,d.sequenceVersion,f.owner,f.contextId),"en","16:9")).rejects.toThrow();
 });
 it("failed base fails the whole sequence",async()=>{await create();await service.advancePending(signal());const r=await repo.read(f.owner,f.request);await sql(`update public.background_jobs set status='failed' where id='${r.base_job_ids[1]}';`);await restart().advancePending(signal());expect((await repo.read(f.owner,f.request)).status).toBe("failed");expect(producer).not.toHaveBeenCalled();});
 it("stale reusable ledger cannot approve",async()=>{await create();await service.advancePending(signal());await publishBases();await sql(`update public.medical_motion_reuse_keys set epoch=epoch+1 where producer_job_id in(select unnest(base_job_ids) from public.medical_motion_orchestrations where id='${f.request}');`);await restart().advancePending(signal());expect((await repo.read(f.owner,f.request)).status).toBe("failed");expect(await sql(`select count(*) from public.medical_motion_approved_specs where user_id='${f.owner}';`)).toBe("0");});
 it("stale required base after timeline approval fails the whole sequence without cancelling bases",async()=>{
  await create();await service.advancePending(signal());await publishBases();await service.advancePending(signal());
  const approved=await repo.read(f.owner,f.request);expect(approved.status).toBe("composing");
  await sql(`update public.medical_motion_reuse_keys set epoch=epoch+1 where producer_job_id='${approved.base_job_ids[0]}';`);
  await restart().advancePending(signal());
  const failed=await repo.read(f.owner,f.request);expect(failed.status).toBe("failed");expect(failed.final_artifact_id).toBeNull();
  expect(failed.failure_code).toBe("composition-failed");
  await restart().advancePending(signal());expect(await repo.read(f.owner,f.request)).toEqual(failed);
  expect(await sql(`select count(*) from public.medical_motion_approved_specs where user_id='${f.owner}';`)).toBe("1");
  expect(await sql(`select count(*) from public.background_jobs where user_id='${f.owner}' and job_type='medical-motion-compose';`)).toBe("1");
  expect(await sql(`select count(*) from public.medical_motion_artifacts where user_id='${f.owner}';`)).toBe("2");
  expect(await sql(`select count(*) from public.background_jobs where id=any(array[${approved.base_job_ids.map(id=>`'${id}'::uuid`).join()}]) and status='completed';`)).toBe("2");
 });
 it("cancellation before bases prevents approval and preserves shared jobs",async()=>{await create();await service.advancePending(signal());const r=await repo.cancel(f.owner,f.request);await restart().advancePending(signal());expect(r.status).toBe("cancelled");expect(producer).not.toHaveBeenCalled();expect(await sql(`select count(*) from public.background_jobs where id=any(array[${r.base_job_ids.map(id=>`'${id}'::uuid`).join()}]) and status='pending';`)).toBe("2");});
 it("cancellation between producer and SQL approval creates no orphan compose job",async()=>{await create();await service.advancePending(signal());await publishBases();producer.mockImplementation(async(...args)=>{const spec=await approve(...args);await repo.cancel(f.owner,f.request);return spec;});await restart().advancePending(signal());expect((await repo.read(f.owner,f.request)).status).toBe("cancelled");expect(await sql(`select count(*) from public.medical_motion_approved_specs where user_id='${f.owner}';`)).toBe("0");});
 it("cancellation after approval stops compose but preserves reusable bases",async()=>{await create();await service.advancePending(signal());await publishBases();await service.advancePending(signal());const r=await repo.cancel(f.owner,f.request);expect(r.status).toBe("cancelled");expect(await sql(`select status from public.background_jobs where id='${r.compose_job_id}';`)).toBe("cancelled");expect(await sql(`select count(*) from public.medical_motion_reuse_keys where producer_job_id=any(array[${r.base_job_ids.map(id=>`'${id}'::uuid`).join()}]) and state='ready';`)).toBe("2");});
 it("source policy revocation fails closed after restart",async()=>{await create();vi.mocked(prepareCompositionScene).mockRejectedValue(new CompositionError("COMPOSITION_INVALID"));await restart().advancePending(signal());expect((await repo.read(f.owner,f.request)).status).toBe("failed");});
 it("owner isolation and immutable identities are enforced",async()=>{await create();await expect(repo.read(randomUUID(),f.request)).rejects.toThrow("ORCHESTRATION_NOT_FOUND");for(const change of ["context_id=gen_random_uuid()","sequence='{}'","revision_id=gen_random_uuid()"]){await expect(sql(`update public.medical_motion_orchestrations set ${change} where id='${f.request}';`)).rejects.toThrow();}await repo.cancel(f.owner,f.request);await expect(sql(`update public.medical_motion_orchestrations set status='queued' where id='${f.request}';`)).rejects.toThrow();});
 it("cross-owner base mapping rejected by SQL",async()=>{await create();await expect(repo.bind(f.owner,f.request,[f.initialJobId,randomUUID()])).rejects.toThrow();});
 it("anon/authenticated and direct service table writes denied; RLS enabled",async()=>{for(const role of ["anon","authenticated"])expect(await sql(`select has_function_privilege('${role}','public.motion_orchestration_operation_v1(uuid,text,uuid,jsonb)','execute');`)).toBe("f");expect(await sql("select has_table_privilege('service_role','public.medical_motion_orchestrations','update');")).toBe("f");expect(await sql("select relrowsecurity from pg_class where oid='public.medical_motion_orchestrations'::regclass;")).toBe("t");});
});
