import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as childProcess from "node:child_process";
import { client } from "../helpers/medical-motion-rpc";
import { configuration, sql } from "../helpers/medical-motion-postgres";
import { contextContent } from "../helpers/medical-motion-context";
import { MedicalMotionJobRepository } from "@/lib/medical-motion/job.repository";
import { createMedicalMotionRenderHandler } from "@/lib/jobs/handlers/medical-motion-render.handler";
import { BackgroundJobWorkerRepository } from "@/lib/jobs/background-job-worker.repository";
import { JobDispatcher } from "@/lib/jobs/job-dispatcher";
import { DurableBackgroundJobWorker } from "@/lib/jobs/background-job-worker";
import { OWNERSHIP_POLICY } from "@/lib/jobs/execution-ownership";
import { artifactSchema,cleanupArtifactOwner } from "../helpers/medical-motion-artifacts";
import { FileArtifactStorage } from "../helpers/private-artifact-storage";
import { createMedicalMotionArtifactRuntime } from "@/lib/medical-motion/artifacts/runtime";
import * as organModules from "@/lib/medical-motion/organ-modules";
import { withTestCacheAnatomy } from "../helpers/cache-anatomy-fixture";
import { mkdtemp,rm } from "node:fs/promises";
import { tmpdir } from "node:os";

vi.mock("node:child_process", async importOriginal => {
  const actual = await importOriginal<typeof childProcess>();
  return { ...actual, spawn: vi.fn(actual.spawn) };
});

/** Run explicitly on the guarded local PostgreSQL/Blender workstation.
 * No HTTP, output publication, production-quality video or new clinical asset. */
describe("real local PostgreSQL context to handler to Blender smoke",()=>{
  let owner:string,jobId:string,storageRoot:string;
  beforeAll(async()=>{configuration();await artifactSchema();expect(existsSync(process.env.BLENDER_EXECUTABLE_PATH||"C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe")).toBe(true);});
  beforeEach(async()=>{
    owner=randomUUID(); await sql(`insert into auth.users(id) values('${owner}');`);
    storageRoot=await mkdtemp(path.join(tmpdir(),"organheal-blender-artifact-test-"));
    const queued=await new MedicalMotionJobRepository(client).enqueue(owner,randomUUID(),contextContent(),0);jobId=queued.jobId;
    vi.stubEnv("MEDICAL_MOTION_RENDER_SCRIPT",path.resolve("tests/fixtures/medical-motion-handler-smoke.py"));
  });
  afterEach(async()=>{
    vi.useRealTimers();vi.unstubAllEnvs();
    await cleanupArtifactOwner(owner);
    await rm(storageRoot,{recursive:true,force:true});
  });
  it("real render yields owned candidate and fenced pending status without durable result",async()=>{
    let accepted=false,disposed=false;
    const handler=createMedicalMotionRenderHandler(client,{capability:"medical-motion-render",mode:"development",
      acceptCandidate:async candidate=>{accepted=true;expect(candidate.media).toBe("video");expect(existsSync(candidate.localPath)).toBe(true);disposed=await candidate.discard();}});
    const dispatcher=new JobDispatcher();dispatcher.register("medical-motion-render",handler);
    await new DurableBackgroundJobWorker(new BackgroundJobWorkerRepository(client,["medical-motion-render"]),dispatcher).processById(jobId);
    expect(accepted).toBe(true);expect(disposed).toBe(true);
    expect(await sql(`select status from public.background_jobs where id='${jobId}';`)).toBe("awaiting-artifact-publication");
    expect(await sql(`select count(*) from public.background_job_results where job_id='${jobId}';`)).toBe("0");
  },120000);
  it("real Blender first render then durable cache hit keeps render count one",async()=>{
    // Pure encoded-media/ownership/cache acceptance. This hypothetical TEST
    // metadata does not medically verify the smoke geometry or current heart.
    const moduleSpy=vi.spyOn(organModules,"getOrganModule").mockReturnValue(withTestCacheAnatomy());
    try {
    const before=vi.mocked(childProcess.spawn).mock.calls.filter(args=>String(args[0]).toLowerCase().includes("blender")).length;
    const storage=new FileArtifactStorage(storageRoot),runtime=createMedicalMotionArtifactRuntime(client,{mode:"development",reuse:true},storage);
    await runtime.worker.processById(jobId);
    const first=await runtime.artifacts.retrieval(jobId,owner);
    expect(first?.persisted).toBe(true);
    const next=await new MedicalMotionJobRepository(client).enqueue(owner,randomUUID(),contextContent(),0);
    await runtime.worker.processById(next.jobId);
    const second=await runtime.artifacts.retrieval(next.jobId,owner);
    expect(second?.id).toBe(first?.id);expect(second?.jobId).toBe(next.jobId);expect(storage.writes).toBe(1);
    const after=vi.mocked(childProcess.spawn).mock.calls.filter(args=>String(args[0]).toLowerCase().includes("blender")).length;
    expect(after-before).toBe(1);expect(runtime.reuse?.metrics.CACHE_HIT).toBe(1);expect(runtime.reuse?.metrics.RENDER_CREATED).toBe(1);
    expect(await sql(`select count(*) from public.background_job_results where job_id in('${jobId}','${next.jobId}');`)).toBe("2");
    } finally {moduleSpy.mockRestore();}
  },120000);
  it.each(["normal","lost-publication-response"])("real durable e2e: %s",async scenario=>{
    let lost=false;
    const originalRpc=client.rpc.bind(client);
    const wrapped={rpc:async(name:string,args:Record<string,unknown>)=>{
      const response=await originalRpc(name,args);
      if(name==="publish_background_job_result"&&scenario==="lost-publication-response"&&!lost){lost=true;throw new Error("Test response lost.");}
      return response;
    }} as unknown as typeof client;
    const storage=new FileArtifactStorage(storageRoot),runtime=createMedicalMotionArtifactRuntime(wrapped,{mode:"development"},storage);
    const {spawn}=await vi.importActual<typeof childProcess>("node:child_process");let localPath="";
    vi.mocked(childProcess.spawn).mockImplementation((...args:Parameters<typeof childProcess.spawn>)=>{
      if(String(args[0]).toLowerCase().includes("blender"))localPath=(args[1] as string[]).at(-1)!;
      return spawn(...args);
    });
    await runtime.worker.processById(jobId);
    expect(await sql(`select status from public.background_jobs where id='${jobId}';`)).toBe("completed");
    const artifact=await runtime.artifacts.retrieval(jobId,owner);
    expect(artifact?.persisted).toBe(true);expect(artifact?.media).toBe("video");expect(storage.writes).toBe(1);
    expect(await sql(`select reference_id=medical_motion_artifact_id from public.background_job_results where job_id='${jobId}';`)).toBe("t");
    expect(existsSync(path.dirname(localPath))).toBe(false);
    if(scenario==="lost-publication-response")expect(lost).toBe(true);
  },120000);
  it.each(["shutdown","lease-loss"])("%s through handler aborts real Blender and refuses handoff",async cause=>{
    vi.stubEnv("ORGANHEAL_HANDLER_SMOKE_CANCEL","1");
    const controller=new AbortController(),acceptCandidate=vi.fn();
    const { spawn } = await vi.importActual<typeof childProcess>("node:child_process");
    let started=false,closed=false,artifactPath="";
    vi.mocked(childProcess.spawn).mockImplementation((...args:Parameters<typeof childProcess.spawn>)=>{
      const child=spawn(...args);
      if(String(args[0]).toLowerCase().includes("blender")) {
        artifactPath=(args[1] as string[]).at(-1)!;
        child.on("close",()=>{closed=true;});child.stdout?.on("data",async data=>{if(String(data).includes("HANDLER_SMOKE_STARTED")){
          started=true;
          if(cause==="shutdown") controller.abort();
          else {
            await sql(`update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id='${jobId}';`);
            await vi.advanceTimersByTimeAsync(OWNERSHIP_POLICY.intervalMs+1);
          }
        }});
      }
      return child;
    });
    const job=await new BackgroundJobWorkerRepository(client,["medical-motion-render"]).claimById(jobId);
    expect(job!==null).toBe(true);
    if(cause==="lease-loss") vi.useFakeTimers({toFake:["setTimeout","clearTimeout"]});
    const handler=createMedicalMotionRenderHandler(client,{capability:"medical-motion-render",mode:"development",acceptCandidate,signal:controller.signal});
    const result=await handler(job!);
    expect(started).toBe(true);expect(closed).toBe(true);expect(result.disposition).toBe("ownership-lost");expect(acceptCandidate).not.toHaveBeenCalled();
    expect(existsSync(path.dirname(artifactPath))).toBe(false);
    expect(await sql(`select status from public.background_jobs where id='${jobId}';`)).toBe("running");
  },60000);
});
