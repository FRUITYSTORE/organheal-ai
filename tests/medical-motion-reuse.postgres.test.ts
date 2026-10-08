import {installTestOrganModuleResolution} from "./helpers/organ-module-resolution";
import { randomUUID,createHash } from "node:crypto";
import { mkdtemp,rm,writeFile,unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach,beforeAll,beforeEach,describe,expect,it,vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { artifactSchema,cleanupArtifactOwner } from "./helpers/medical-motion-artifacts";
import { client } from "./helpers/medical-motion-rpc";
import { sql } from "./helpers/medical-motion-postgres";
import { contextContent } from "./helpers/medical-motion-context";
import { FileArtifactStorage } from "./helpers/private-artifact-storage";
import { mp4Fixture } from "./fixtures/medical-motion-artifact";
import { MedicalMotionJobRepository } from "../lib/medical-motion/job.repository";
import { BackgroundJobWorkerRepository,type DurableBackgroundJob } from "../lib/jobs/background-job-worker.repository";
import { MedicalMotionExecutionContextRepository } from "../lib/medical-motion/execution-context.repository";
import { MedicalMotionArtifactRepository,ArtifactError } from "../lib/medical-motion/artifacts/repository";
import { MedicalMotionArtifactService } from "../lib/medical-motion/artifacts/service";
import { ReusableArtifactCache,ReusableArtifactRepository,reusableArtifactIdentity,type ReuseIdentity } from "../lib/medical-motion/artifacts/reuse";
import { prepareExplanationAuthorization,readExplanationAuthorization } from "../lib/symptom-explanation/explanation-authorization";
import { validateExplanationRenderRequest } from "../lib/medical-motion/render/explanation-renderer";
import { createMedicalMotionRenderHandler } from "../lib/jobs/handlers/medical-motion-render.handler";
import { createArtifactOwnership,discardArtifact,type ArtifactOwnership } from "../lib/medical-motion/render/artifact-output";
import { recordExecutionResources } from "../lib/medical-motion/render/execution-resources";
import type { executeMedicalMotionRequest } from "../lib/medical-motion/execute-medical-motion";
import * as organModules from "../lib/medical-motion/organ-modules";
import { HEART_ORGAN_MODULE } from "../lib/medical-motion/organs/heart/heart-organ-module";
import { withTestCacheAnatomy } from "./helpers/cache-anatomy-fixture";
import { CROSS_BODY_FIXTURES,MECHANISM_TEST_CATALOG } from "./helpers/whole-body-mechanism-fixtures";
import { withTestAnatomyReview } from "./helpers/anatomy-review-fixture";
import { MEDICAL_MECHANISMS } from "../lib/medical-motion/mechanism-definitions";
import { createMechanismRegistry } from "../lib/medical-motion/mechanism-registry";
import { compileMedicalScene } from "../lib/medical-motion/scene-compiler";

describe("real isolated PostgreSQL reusable artifact coordination",()=>{
  let owner:string,root:string,job:DurableBackgroundJob,other:DurableBackgroundJob,storage:FileArtifactStorage;
  let cache:ReusableArtifactCache,repository:ReusableArtifactRepository,artifacts:MedicalMotionArtifactService,attempts:BackgroundJobWorkerRepository;
  let resources:ArtifactOwnership[]=[];
  const execute=vi.fn<typeof executeMedicalMotionRequest>();
  beforeAll(artifactSchema);
  beforeEach(async()=>{
    installTestOrganModuleResolution(withTestCacheAnatomy()).legacy;
    owner=randomUUID();root=await mkdtemp(path.join(tmpdir(),"organheal-cache-test-"));execute.mockReset();
    await sql(`insert into auth.users(id) values('${owner}');`);
    attempts=new BackgroundJobWorkerRepository(client,["medical-motion-render"]);
    const jobs=new MedicalMotionJobRepository(client);
    job=(await attempts.claimById((await jobs.enqueue(owner,randomUUID(),contextContent(),0)).jobId))!;
    other=(await attempts.claimById((await jobs.enqueue(owner,randomUUID(),contextContent(),0)).jobId))!;
    storage=new FileArtifactStorage(root);repository=new ReusableArtifactRepository(client);cache=new ReusableArtifactCache(repository,storage);
    artifacts=new MedicalMotionArtifactService(new MedicalMotionArtifactRepository(client),storage);
    execute.mockImplementation(async()=>{
      const artifact=await createArtifactOwnership("fixture.mp4","video");resources.push(artifact);
      await writeFile(artifact.outputPath,mp4Fixture());
      const result={status:"completed",outputPath:artifact.outputPath,durationSeconds:1} as Awaited<ReturnType<typeof executeMedicalMotionRequest>>;
      recordExecutionResources(result,{artifact,dimensions:{width:1920,height:1080},cleanupConfirmed:false});return result;
    });
  });
  afterEach(async()=>{vi.restoreAllMocks();for(const r of resources)await discardArtifact(r);resources=[];await cleanupArtifactOwner(owner);await rm(root,{recursive:true,force:true});});
  function handler(custom=client,reuse=cache) {return createMedicalMotionRenderHandler(custom,{capability:"medical-motion-render",mode:"development",artifacts,reuse,acceptCandidate:async()=>{throw Error("NO_LEGACY");}},
    {contexts:new MedicalMotionExecutionContextRepository(client),attempts,execute});}
  async function authorization(j=job) {
    const contexts=new MedicalMotionExecutionContextRepository(client),payload=j.payload as {executionContextId:string;sceneIndex:number};
    const input=await contexts.reconstruct(payload.executionContextId,j.userId,payload.sceneIndex);
    const context=await contexts.read(payload.executionContextId,j.userId);
    const prepared=prepareExplanationAuthorization({clinical:input.clinical,plan:input.plan,sceneIndex:input.sceneIndex},{clinicalContextId:context.id,assetVersion:context.assetVersion,mode:"development",outputPath:"render.mp4"});
    if(!("ok" in prepared))throw Error(prepared.message);return prepared.authorization;
  }
  function identity(capability:object) {
    const issued=readExplanationAuthorization(capability)!;
    const checked=validateExplanationRenderRequest(capability,issued.options.outputPath,{mode:"development"});
    if(!("ok" in checked))throw Error(checked.message);
    return reusableArtifactIdentity(checked.request.medicalScene!,checked.request.renderSignature,"video")!;
  }
  const signal=()=>new AbortController().signal;
  async function retry(j:DurableBackgroundJob) {await attempts.scheduleRetry({jobId:j.id,attemptToken:j.attemptToken,errorMessage:"CACHE_RECOVERY",retryDelayMs:0});return (await attempts.claimById(j.id))!;}
  async function first() {expect(await handler()(job)).toMatchObject({disposition:"already-finalized"});return (await artifacts.retrieval(job.id,owner))!;}
  it.each([MEDICAL_MECHANISMS.definitions[1],...CROSS_BODY_FIXTURES])("generic DB miss/ready/hit/link for $affectedOrgans TEST contracts",async mechanism=>{
    // DB/identity contract only: synthetic encoded bytes are NOT organ geometry.
    const module=withTestAnatomyReview({...HEART_ORGAN_MODULE,id:mechanism.affectedOrgans[0],anatomyRegistry:Object.entries(mechanism.requiredAnatomy).map(([id,r])=>({
      id:id as `${string}.${string}`,kind:"organ",availability:"present",representation:r!.representations![0],verification:"verified",blenderObject:"TEST_ONLY_NO_GEOMETRY",fidelity:"reference-derived",
      coverage:{verifiedRegions:["whole"],unknownRegions:[],excludedRegions:[],evidenceRefs:["TEST ONLY COVERAGE"]}}))});
    const compiled=compileMedicalScene({mechanismId:mechanism.mechanismId,mechanismVersion:mechanism.version},{registry:createMechanismRegistry([mechanism],MECHANISM_TEST_CATALOG),getModule:()=>module,catalog:MECHANISM_TEST_CATALOG,
      safety:{allowVideo:true,level:"none"},mode:"development",claim:"possible-mechanism",evidence:mechanism.requiredEvidence.map(r=>({...r,origin:r.origin??"server-intake",assertion:"present",evidenceRef:"TEST ONLY SERVER"}))});
    expect(compiled.ok).toBe(true);if(!compiled.ok)throw Error("TEST_COMPILER_FAILED");
    const key=reusableArtifactIdentity(compiled.compiled,"a".repeat(64),"video")!;
    const miss=await repository.operation(job,"reserve",key);expect(miss.outcome).toBe("CACHE_MISS");
    const bytes=mp4Fixture(),record=await artifacts.repository.reserve(job,{media:"video",byteSize:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")});
    await storage.put(record.id,bytes,"video/mp4");await artifacts.repository.persist(job,record.id);
    await repository.operation(job,"ready",key,miss.epoch,record.id);
    const hit=await repository.operation(other,"reserve",key);expect(hit).toMatchObject({outcome:"CACHE_HIT",artifact_id:record.id});
    await repository.operation(other,"link",key,hit.epoch,record.id);
    expect(storage.writes).toBe(1);expect(execute).not.toHaveBeenCalled();
    expect(await sql(`select count(*) from public.medical_motion_reuse_links where job_id in('${job.id}','${other.id}');`)).toBe("2");
  });
  it("unverified development anatomy renders through the existing path without cache registration",async()=>{
    vi.mocked(organModules.getOrganModule).mockReturnValue(HEART_ORGAN_MODULE);
    expect(await handler()(job)).toMatchObject({disposition:"already-finalized"});
    expect(await handler()(other)).toMatchObject({disposition:"already-finalized"});
    expect(execute).toHaveBeenCalledTimes(2);expect(storage.writes).toBe(2);
    expect(await sql(`select count(*) from public.medical_motion_reuse_keys where producer_job_id in('${job.id}','${other.id}');`)).toBe("0");
    expect(await sql(`select count(*) from public.background_job_results where job_id in('${job.id}','${other.id}');`)).toBe("2");
  });
  it("first render then second reuse publishes both jobs, one object, one render",async()=>{
    const a=await first();expect(await handler()(other)).toMatchObject({disposition:"already-finalized"});
    const b=await artifacts.retrieval(other.id,owner);expect(b?.id).toBe(a.id);expect(b?.jobId).toBe(other.id);
    expect(execute).toHaveBeenCalledTimes(1);expect(storage.writes).toBe(1);
    expect(await sql(`select count(*) from public.medical_motion_artifacts where user_id='${owner}';`)).toBe("1");
    expect(await sql(`select string_agg(disposition,',' order by disposition) from public.medical_motion_reuse_links where job_id in('${job.id}','${other.id}');`)).toBe("render-created,reused");
  });
  it("concurrent misses reserve one producer, loser retries and safely links winner",async()=>{
    const [a,b]=await Promise.all([authorization(job),authorization(other)]);
    const independentCache=new ReusableArtifactCache(new ReusableArtifactRepository(client),storage);
    const [x,y]=await Promise.all([cache.lookup(job,a,signal()),independentCache.lookup(other,b,signal())]);
    expect([x.disposition,y.disposition].sort()).toEqual(["CACHE_CONFLICT","CACHE_MISS"]);
    const winner=x.disposition==="CACHE_MISS"?job:other,loser=winner===job?other:job;
    expect(await handler()(winner)).toMatchObject({disposition:"already-finalized"});
    expect(await handler()(loser)).toMatchObject({disposition:"already-finalized"});
    expect(execute).toHaveBeenCalledTimes(1);expect(storage.writes).toBe(1);
    expect(await sql(`select count(*) from public.medical_motion_reuse_keys where producer_job_id in('${job.id}','${other.id}') and state='ready';`)).toBe("1");
  });
  it("a pending producer yields retry without consuming Blender",async()=>{
    await cache.lookup(job,await authorization(),signal());
    expect(await handler()(other)).toMatchObject({disposition:"retry",errorCode:"CACHE_CONFLICT"});expect(execute).not.toHaveBeenCalled();
  });
  it("concurrent handlers keep one render and both fenced publications after loser retry",async()=>{
    const original=execute.getMockImplementation()!;let unblock!:()=>void,started!:()=>void;
    const begun=new Promise<void>(resolve=>{started=resolve;}),barrier=new Promise<void>(resolve=>{unblock=resolve;});
    execute.mockImplementationOnce(async(...args)=>{started();await barrier;return original(...args);});
    const producing=handler()(job);await begun;
    const losing=await handler()(other);expect(losing).toMatchObject({disposition:"retry",errorCode:"CACHE_CONFLICT"});unblock();
    expect(await producing).toMatchObject({disposition:"already-finalized"});other=await retry(other);
    expect(await handler()(other)).toMatchObject({disposition:"already-finalized"});
    expect(execute).toHaveBeenCalledTimes(1);expect(storage.writes).toBe(1);
    expect(await sql(`select count(*) from public.background_job_results where job_id in('${job.id}','${other.id}');`)).toBe("2");
  });
  it("crash after reservation is reclaimed after fencing expires",async()=>{
    const a=await authorization(),key=identity(a);await cache.lookup(job,a,signal());
    await sql(`update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id='${job.id}';`);
    expect(await handler()(other)).toMatchObject({disposition:"already-finalized"});
    await expect(repository.operation(job,"ready",key,1,randomUUID())).rejects.toMatchObject({code:"ARTIFACT_OWNERSHIP_LOST"});
    expect(execute).toHaveBeenCalledTimes(1);
  });
  it.each([false,true])("crash after durable upload (persisted=%s) reconciles bytes without a second render",async committed=>{
    const persist=artifacts.repository.persist.bind(artifacts.repository);
    vi.spyOn(artifacts.repository,"persist").mockImplementationOnce(async(j,id)=>{if(committed)await persist(j,id);throw new ArtifactError("ARTIFACT_STATE_UNKNOWN");});
    expect(await handler()(job)).toMatchObject({disposition:"retry"});job=await retry(job);
    expect(await handler()(job)).toMatchObject({disposition:"already-finalized"});
    expect(execute).toHaveBeenCalledTimes(1);expect(storage.writes).toBe(1);
  });
  it("lost cache-ready response recovers its committed identity",async()=>{
    const operation=repository.operation.bind(repository);
    vi.spyOn(repository,"operation").mockImplementationOnce(operation); // reserve
    vi.spyOn(repository,"operation").mockImplementationOnce(async(...args)=>{await operation(...args);throw new ArtifactError("ARTIFACT_STATE_UNKNOWN");});
    expect(await handler()(job)).toMatchObject({disposition:"retry"});job=await retry(job);
    expect(await handler()(job)).toMatchObject({disposition:"already-finalized"});expect(execute).toHaveBeenCalledTimes(1);
  });
  it("publication response loss replays fenced publication without rendering again",async()=>{
    await first();let lost=false;
    const wrapped={rpc:async(name:string,p:Record<string,unknown>)=>{const result=await client.rpc(name,p);if(name==="publish_background_job_result"&&!lost){lost=true;throw Error("TEST_RESPONSE_LOST");}return result;}} as unknown as SupabaseClient;
    expect(await handler(wrapped)(other)).toMatchObject({disposition:"already-finalized"});expect(lost).toBe(true);expect(execute).toHaveBeenCalledTimes(1);
  });
  it.each(["missing","digest","mime","size"])("rejects %s object integrity, invalidates, never publishes the hit",async kind=>{
    const record=await first();
    if(kind==="missing")await unlink(path.join(root,record.id));
    else {const read=storage.read.bind(storage);vi.spyOn(storage,"read").mockImplementation(async key=>{const result=await read(key);if(!result)return result;
      if(kind==="digest")result.bytes[8]^=1;if(kind==="mime")result.contentType="image/png";if(kind==="size")result.bytes=result.bytes.subarray(1);return result;});}
    expect(await handler()(other)).toMatchObject({disposition:"retry",errorCode:"CACHE_INVALID"});
    expect(await sql(`select count(*) from public.background_job_results where job_id='${other.id}';`)).toBe("0");expect(execute).toHaveBeenCalledTimes(1);
  });
  it("invalid slot safely gets a new epoch without overwriting old bytes",async()=>{
    const old=await first();await unlink(path.join(root,old.id));
    expect(await handler()(other)).toMatchObject({disposition:"retry",errorCode:"CACHE_INVALID"});other=await retry(other);
    expect(await handler()(other)).toMatchObject({disposition:"already-finalized"});expect((await artifacts.retrieval(other.id,owner))?.id).not.toBe(old.id);
    expect(execute).toHaveBeenCalledTimes(2);expect(storage.writes).toBe(2);
  });
  it("stale epoch/link cannot publish after cache invalidation",async()=>{
    const record=await first(),capability=await authorization(other),key=identity(capability);
    const hit=await cache.lookup(other,capability,signal());expect(hit.disposition).toBe("CACHE_HIT");
    await repository.operation(other,"invalidate",key,1,record.id);
    const published=await client.rpc("publish_background_job_result",{p_job_id:other.id,p_attempt_token:other.attemptToken,p_result_kind:"artifact",p_reference_id:record.id});
    expect(published.error?.code).toBe("OM409");
  });
  it("own-job recovery cannot bypass an invalidated cache generation",async()=>{
    const record=await first(),cap=await authorization(other),key=identity(cap);
    await repository.operation(other,"reserve",key);await repository.operation(other,"invalidate",key,1,record.id);
    // Producer's completed result is immutable; simulate its pre-publication retry
    // under the guarded local fixture, preserving the artifact and old cache link.
    await sql(`begin;alter table public.background_job_results disable trigger background_job_results_immutable;
      delete from public.background_job_results where job_id='${job.id}';alter table public.background_job_results enable trigger background_job_results_immutable;
      update public.background_jobs set status='retrying',attempt_token=null,available_at=clock_timestamp() where id='${job.id}';commit;`);
    job=(await attempts.claimById(job.id))!;
    const invalid=await client.rpc("publish_background_job_result",{p_job_id:job.id,p_attempt_token:job.attemptToken,p_result_kind:"artifact",p_reference_id:record.id});
    expect(invalid.error?.code).toBe("OM409");
    expect(await handler()(job)).toMatchObject({disposition:"already-finalized"});
    expect((await artifacts.retrieval(job.id,owner))?.id).not.toBe(record.id);expect(execute).toHaveBeenCalledTimes(2);
  });
  it("an expired consumer cannot link or publish a shared artifact",async()=>{
    await first();const cap=await authorization(other),key=identity(cap);
    await sql(`update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id='${other.id}';`);
    await expect(repository.operation(other,"reserve",key)).rejects.toMatchObject({code:"ARTIFACT_OWNERSHIP_LOST"});
  });
  it("database lookup failure does not fall through to duplicate rendering",async()=>{
    vi.spyOn(repository,"operation").mockRejectedValue(new ArtifactError("ARTIFACT_STATE_UNKNOWN"));
    expect(await handler()(job)).toMatchObject({disposition:"retry",errorCode:"ARTIFACT_STATE_UNKNOWN"});expect(execute).not.toHaveBeenCalled();
  });
  it("storage metadata failure fails closed without publication",async()=>{
    await first();Object.assign(storage,{inspect:vi.fn().mockRejectedValue(Error("TEST_STORAGE_UNAVAILABLE"))});
    expect(await handler()(other)).toMatchObject({disposition:"retry",errorCode:"ARTIFACT_STORAGE_UNAVAILABLE"});expect(execute).toHaveBeenCalledTimes(1);
  });
  it("metadata-first hit avoids download; periodic deep check verifies and refreshes",async()=>{
    const record=await first();Object.assign(storage,{inspect:vi.fn().mockResolvedValue({contentType:"video/mp4",byteSize:record.byteSize,sha256:record.sha256})});
    const read=vi.spyOn(storage,"read");await cache.lookup(other,await authorization(other),signal());expect(read).not.toHaveBeenCalled();
    await sql(`update public.medical_motion_reuse_keys set verified_at=clock_timestamp()-interval '16 minutes' where artifact_id='${record.id}';`);
    await cache.lookup(other,await authorization(other),signal());expect(read).toHaveBeenCalledTimes(1);
  });
  it("client roles cannot read/mutate cache tables or execute its privileged RPC",async()=>{
    for(const role of ["anon","authenticated","service_role"]) await expect(sql(`set role ${role};select * from public.medical_motion_reuse_keys;`)).rejects.toMatchObject({code:"42501"});
    for(const role of ["anon","authenticated"]) await expect(sql(`set role ${role};select * from public.motion_reuse_operation('${job.id}','${owner}','${job.attemptToken}','reserve','{}'::jsonb);`)).rejects.toMatchObject({code:"42501"});
  });
  it("published metadata and current authorization never cross user boundaries",async()=>{
    const record=await first(),wrongUser=randomUUID();
    expect(await artifacts.retrieval(job.id,wrongUser)).toBeUndefined();
    expect(await cache.lookup(other,await authorization(job),signal())).toMatchObject({disposition:"CACHE_STALE"});
    expect(record.id).toMatch(/^[a-f0-9-]{36}$/);
  });
  it("cross-user base reuse exposes only the consumer result and excludes patient text",async()=>{
    const a=await first(),consumer=randomUUID();await sql(`insert into auth.users(id) values('${consumer}');`);
    try {
      const content=contextContent();content.clinical.message="I feel tired. TEST age 24.";(content.candidatePlan as {topic:string}).topic="TEST patient overlay text";
      const queued=await new MedicalMotionJobRepository(client).enqueue(consumer,randomUUID(),content,0);
      const consuming=(await attempts.claimById(queued.jobId))!;
      expect(await handler()(consuming)).toMatchObject({disposition:"already-finalized"});
      const b=await artifacts.retrieval(consuming.id,consumer);
      expect(b?.id).toBe(a.id);expect(b?.userId).toBe(consumer);expect(b?.jobId).toBe(consuming.id);expect(b?.originAttempt).toBe(consuming.attemptToken);
      expect(await artifacts.retrieval(job.id,consumer)).toBeUndefined();expect(await artifacts.retrieval(consuming.id,owner)).toBeUndefined();
      expect(execute).toHaveBeenCalledTimes(1);expect(storage.writes).toBe(1);
    } finally {await cleanupArtifactOwner(consumer);}
  });
  it("cancellation during metadata lookup prevents a late link or publication",async()=>{
    await first();const cap=await authorization(other),controller=new AbortController();let release!:(v:unknown)=>void;
    Object.assign(storage,{inspect:vi.fn(()=>new Promise(resolve=>{release=resolve;}))});
    const pending=cache.lookup(other,cap,controller.signal);
    await vi.waitFor(()=>expect((storage as unknown as {inspect:ReturnType<typeof vi.fn>}).inspect).toHaveBeenCalled());controller.abort();
    await expect(pending).rejects.toMatchObject({code:"ARTIFACT_OWNERSHIP_LOST"});release({byteSize:1,contentType:"video/mp4"});
    expect(await sql(`select count(*) from public.medical_motion_reuse_links where job_id='${other.id}';`)).toBe("0");
  });
  it("index-backed key lookup and PHI-free cache metadata",async()=>{
    await first();const cap=await authorization(other),key=identity(cap);
    expect(JSON.stringify(key)).not.toContain(owner);expect(JSON.stringify(key)).not.toContain(job.id);expect(JSON.stringify(key)).not.toContain("I feel");
    expect(await sql(`select indexdef like '%(cache_key)%' from pg_indexes where indexname='medical_motion_reuse_keys_pkey';`)).toBe("t");
    await expect(sql(`set role service_role;select * from public.motion_reuse_operation('${other.id}','${owner}','${other.attemptToken}','reserve','${JSON.stringify({...key,patientName:"TEST"})}'::jsonb);`)).rejects.toMatchObject({code:"22023"});
  });
});
