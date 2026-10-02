import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { artifactSchema, cleanupArtifactOwner } from "./helpers/medical-motion-artifacts";
import { client } from "./helpers/medical-motion-rpc";
import { sql } from "./helpers/medical-motion-postgres";
import { contextContent } from "./helpers/medical-motion-context";
import { FileArtifactStorage } from "./helpers/private-artifact-storage";
import { MedicalMotionJobRepository } from "@/lib/medical-motion/job.repository";
import { MedicalMotionExecutionContextRepository } from "@/lib/medical-motion/execution-context.repository";
import { BackgroundJobWorkerRepository, type DurableBackgroundJob } from "@/lib/jobs/background-job-worker.repository";
import { MedicalMotionArtifactRepository, ArtifactError } from "@/lib/medical-motion/artifacts/repository";
import { MedicalMotionArtifactService } from "@/lib/medical-motion/artifacts/service";
import { createMedicalMotionRenderHandler } from "@/lib/jobs/handlers/medical-motion-render.handler";
import { createArtifactOwnership, discardArtifact, type ArtifactOwnership } from "@/lib/medical-motion/render/artifact-output";
import { recordExecutionResources } from "@/lib/medical-motion/render/execution-resources";
import type { executeMedicalMotionRequest } from "@/lib/medical-motion/execute-medical-motion";

/** Real PostgreSQL + private filesystem contract. Only rendering is replaced by
 * an owned, fully decoded synthetic PNG; this suite claims no medical quality. */
describe("durable handler crash and fencing integration", () => {
  let owner:string,root:string,job:DurableBackgroundJob,storage:FileArtifactStorage;
  let attempts:BackgroundJobWorkerRepository,registry:MedicalMotionArtifactRepository,service:MedicalMotionArtifactService;
  let resources:ArtifactOwnership[]=[];
  const execute=vi.fn<typeof executeMedicalMotionRequest>();
  beforeAll(artifactSchema);
  beforeEach(async()=>{
    execute.mockReset();owner=randomUUID();root=await mkdtemp(path.join(tmpdir(),"organheal-handoff-handler-test-"));
    await sql(`insert into auth.users(id) values('${owner}');`);
    const queued=await new MedicalMotionJobRepository(client).enqueue(owner,randomUUID(),contextContent(),0);
    attempts=new BackgroundJobWorkerRepository(client,["medical-motion-render"]);job=(await attempts.claimById(queued.jobId))!;
    storage=new FileArtifactStorage(root);registry=new MedicalMotionArtifactRepository(client);service=new MedicalMotionArtifactService(registry,storage);
    execute.mockImplementation(async()=>{
      const artifact=await createArtifactOwnership("fixture.png","still");resources.push(artifact);
      await writeFile(artifact.outputPath,await sharp({create:{width:8,height:8,channels:3,background:"red"}}).png().toBuffer());
      const result={status:"completed",outputPath:artifact.outputPath,durationSeconds:1} as Awaited<ReturnType<typeof executeMedicalMotionRequest>>;
      recordExecutionResources(result,{artifact,dimensions:{width:8,height:8},cleanupConfirmed:false});return result;
    });
  });
  afterEach(async()=>{vi.restoreAllMocks();for(const r of resources)await discardArtifact(r);resources=[];await cleanupArtifactOwner(owner);await rm(root,{recursive:true,force:true});});
  function handler(custom:SupabaseClient=client,signal?:AbortSignal,mode:"development"|"production"="development",
    contexts=new MedicalMotionExecutionContextRepository(client)) {
    return createMedicalMotionRenderHandler(custom,{capability:"medical-motion-render",mode,signal,artifacts:service,
      acceptCandidate:async()=>{throw new Error("UNEXPECTED_LEGACY_HANDOFF");}}, {contexts,attempts,execute});
  }
  const state=()=>sql(`select status from public.background_jobs where id='${job.id}';`);
  async function newAttempt() {
    const old=job.attemptToken;
    await attempts.scheduleRetry({jobId:job.id,attemptToken:old,errorMessage:"ARTIFACT_RECOVERY_REQUIRED",retryDelayMs:0});
    job=(await attempts.claimById(job.id))!;expect(job.attemptToken).not.toBe(old);
  }
  function uncertainPublication(afterCommit=false) {
    return {rpc:async(name:string,args:Record<string,unknown>)=>{
      if(name==="publish_background_job_result") {if(afterCommit)await client.rpc(name,args);throw new Error("Test unknown response.");}
      return client.rpc(name,args);
    }} as unknown as SupabaseClient;
  }
  it("complete chain publishes once and disposes only after known completion",async()=>{
    expect(await handler()(job)).toMatchObject({disposition:"already-finalized",outcome:"PUBLICATION_FINALIZED"});
    expect(await state()).toBe("completed");expect(existsSync(resources[0].outputPath)).toBe(false);
    expect((await service.retrieval(job.id,owner))?.persisted).toBe(true);
  });
  it("upload failure returns retry, retains local candidate, and cannot complete",async()=>{
    storage.failWrite=true;expect(await handler()(job)).toMatchObject({disposition:"retry",errorCode:"ARTIFACT_STORAGE_UNAVAILABLE"});
    expect(await state()).toBe("running");expect(existsSync(resources[0].outputPath)).toBe(true);expect(await service.retrieval(job.id,owner)).toBeUndefined();
  });
  it.each([false,true])("registry failure after upload (committed=%s) recovers under new attempt without rendering",async committed=>{
    const persist=registry.persist.bind(registry);
    vi.spyOn(registry,"persist").mockImplementationOnce(async(j,id)=>{if(committed)await persist(j,id);throw new ArtifactError("ARTIFACT_STATE_UNKNOWN");});
    expect(await handler()(job)).toMatchObject({disposition:"retry"});const old=(await registry.list(job))[0];
    await discardArtifact(resources[0]);await newAttempt();
    expect(await handler()(job)).toMatchObject({disposition:"already-finalized"});expect(execute).toHaveBeenCalledTimes(1);
    expect((await service.retrieval(job.id,owner))?.id).toBe(old.id);expect(storage.writes).toBe(1);
  });
  it("twice unknown uncommitted publication recovers expired attempt using same durable object",async()=>{
    expect(await handler(uncertainPublication())(job)).toMatchObject({disposition:"ownership-lost"});expect(await state()).toBe("running");
    expect(existsSync(resources[0].outputPath)).toBe(true);const old=(await registry.list(job))[0];
    await sql(`update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id='${job.id}';
      select * from public.recover_stale_background_jobs(1800,10);`);
    job=(await attempts.claimById(job.id))!;expect(job).not.toBeNull();
    expect(await handler()(job)).toMatchObject({disposition:"already-finalized"});expect(execute).toHaveBeenCalledTimes(1);
    expect((await service.retrieval(job.id,owner))?.id).toBe(old.id);
  });
  it("twice lost committed publication is retrievable and duplicate claim cannot rerender",async()=>{
    expect(await handler(uncertainPublication(true))(job)).toMatchObject({disposition:"ownership-lost"});
    expect(await state()).toBe("completed");expect((await service.retrieval(job.id,owner))?.persisted).toBe(true);
    expect(await attempts.claimById(job.id)).toBeNull();expect(execute).toHaveBeenCalledTimes(1);
  });
  it("legacy awaiting state without durable bytes gets a new attempt and renders",async()=>{
    await attempts.deferCompletion({jobId:job.id,attemptToken:job.attemptToken});
    expect(await registry.resumeAwaiting(job.id,owner)).toBe(true);job=(await attempts.claimById(job.id))!;
    expect(await handler()(job)).toMatchObject({disposition:"already-finalized"});expect(execute).toHaveBeenCalledTimes(1);
  });
  it("legacy awaiting state with durable intent reconciles without rendering",async()=>{
    vi.spyOn(registry,"persist").mockRejectedValueOnce(new ArtifactError("ARTIFACT_STATE_UNKNOWN"));await handler()(job);
    await attempts.deferCompletion({jobId:job.id,attemptToken:job.attemptToken});await registry.resumeAwaiting(job.id,owner);
    job=(await attempts.claimById(job.id))!;
    expect(await handler()(job)).toMatchObject({disposition:"already-finalized"});expect(execute).toHaveBeenCalledTimes(1);
  });
  it("shutdown after upload leaves intent unpublished and quarantines local file",async()=>{
    const controller=new AbortController(),put=storage.put.bind(storage);
    vi.spyOn(storage,"put").mockImplementation(async(...args)=>{await put(...args);controller.abort();});
    expect(await handler(client,controller.signal)(job)).toMatchObject({disposition:"ownership-lost"});
    expect((await registry.list(job))[0].persisted).toBe(false);expect(await service.retrieval(job.id,owner)).toBeUndefined();
    expect(existsSync(resources[0].outputPath)).toBe(true);
  });
  it("lease expiry during upload cannot persist or publish late success",async()=>{
    const put=storage.put.bind(storage);vi.spyOn(storage,"put").mockImplementation(async(...args)=>{
      await put(...args);await sql(`update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id='${job.id}';`);
    });
    expect(await handler()(job)).toMatchObject({disposition:"ownership-lost"});
    expect(await sql(`select persisted_at is null from public.medical_motion_artifacts where job_id='${job.id}';`)).toBe("t");
    expect(await state()).toBe("running");expect(existsSync(resources[0].outputPath)).toBe(true);
  });
  it("production readiness is rechecked before reading cached development bytes",async()=>{
    await handler(uncertainPublication())(job);await newAttempt();const read=vi.spyOn(storage,"read");
    expect(await handler(client,undefined,"production")(job)).toMatchObject({disposition:"fail"});expect(read).not.toHaveBeenCalled();expect(execute).toHaveBeenCalledTimes(1);
  });
  it("Safety Gate remains before artifact reconciliation",async()=>{
    const contexts=new MedicalMotionExecutionContextRepository(client),reconstruct=contexts.reconstruct.bind(contexts);
    vi.spyOn(contexts,"reconstruct").mockImplementation(async(...args)=>{const input=await reconstruct(...args);return {...input,clinical:{message:"Severe chest pain and shortness of breath now",language:"en"}};});
    const read=vi.spyOn(storage,"read");expect(await handler(client,undefined,"development",contexts)(job)).toMatchObject({disposition:"fail",errorCode:"UNSAFE_FOR_VIDEO_FIRST"});
    expect(read).not.toHaveBeenCalled();expect(execute).not.toHaveBeenCalled();
  });
  it("verified myocardium dependency fails before recovery or execution",async()=>{
    const input=contextContent("myocardialOxygenDemandSupply");
    const contexts=new MedicalMotionExecutionContextRepository(client);
    vi.spyOn(contexts,"reconstruct").mockResolvedValue({schemaVersion:"1",clinical:input.clinical,plan:input.candidatePlan,sceneIndex:0});
    const reconcile=vi.spyOn(service,"reconcile");
    expect(await handler(client,undefined,"development",contexts)(job)).toMatchObject({disposition:"fail"});
    expect(reconcile).not.toHaveBeenCalled();expect(execute).not.toHaveBeenCalled();
  });
});
