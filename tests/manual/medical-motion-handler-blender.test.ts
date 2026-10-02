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

vi.mock("node:child_process", async importOriginal => {
  const actual = await importOriginal<typeof childProcess>();
  return { ...actual, spawn: vi.fn(actual.spawn) };
});

/** Run explicitly on the guarded local PostgreSQL/Blender workstation.
 * No HTTP, output publication, production-quality video or new clinical asset. */
describe("real local PostgreSQL context to handler to Blender smoke",()=>{
  let owner:string,jobId:string;
  beforeAll(()=>{configuration();expect(existsSync(process.env.BLENDER_EXECUTABLE_PATH||"C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe")).toBe(true);});
  beforeEach(async()=>{
    owner=randomUUID(); await sql(`insert into auth.users(id) values('${owner}');`);
    const queued=await new MedicalMotionJobRepository(client).enqueue(owner,randomUUID(),contextContent(),0);jobId=queued.jobId;
    vi.stubEnv("MEDICAL_MOTION_RENDER_SCRIPT",path.resolve("tests/fixtures/medical-motion-handler-smoke.py"));
  });
  afterEach(async()=>{
    vi.useRealTimers();vi.unstubAllEnvs();
    await sql(`begin;
      alter table public.background_jobs disable trigger background_jobs_medical_motion_link;
      delete from public.background_jobs where user_id='${owner}';
      alter table public.background_jobs enable trigger background_jobs_medical_motion_link;
      alter table public.medical_motion_requests disable trigger medical_motion_requests_immutable;
      delete from public.medical_motion_requests where user_id='${owner}';
      alter table public.medical_motion_requests enable trigger medical_motion_requests_immutable;
      alter table public.medical_motion_execution_contexts disable trigger medical_motion_execution_contexts_immutable;
      delete from public.medical_motion_execution_contexts where user_id='${owner}';
      alter table public.medical_motion_execution_contexts enable trigger medical_motion_execution_contexts_immutable;
      delete from auth.users where id='${owner}'; commit;`);
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
