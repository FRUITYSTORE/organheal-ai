import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMedicalMotionRenderHandler } from "@/lib/jobs/handlers/medical-motion-render.handler";
import { ExecutionContextError } from "@/lib/medical-motion/execution-context.repository";
import { createArtifactOwnership, discardArtifact } from "@/lib/medical-motion/render/artifact-output";
import { recordExecutionResources } from "@/lib/medical-motion/render/execution-resources";
import { contextContent } from "./helpers/medical-motion-context";
import { JobDispatcher } from "@/lib/jobs/job-dispatcher";
import { DurableBackgroundJobWorker } from "@/lib/jobs/background-job-worker";
import type { BackgroundJobWorkerRepository, DurableBackgroundJob } from "@/lib/jobs/background-job-worker.repository";
import { OWNERSHIP_POLICY } from "@/lib/jobs/execution-ownership";

const id = "00000000-0000-4000-8000-000000000001", token = "00000000-0000-4000-8000-000000000002";
const owner = "00000000-0000-4000-8000-000000000003", ctx = "00000000-0000-4000-8000-000000000004";
function job(): DurableBackgroundJob {
  return { id, userId: owner, type: "medical-motion-render", status: "running", attemptToken: token,
    leaseExpiresAt: new Date(Date.now() + 1800000).toISOString(), requestId: null,
    payload: { schemaVersion: "1", executionVersion: "1", executionContextId: ctx, sceneIndex: 0 },
    attempts: 0, maxAttempts: 3, startedAt: null, finishedAt: null, lastError: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), availableAt: new Date().toISOString() };
}
const applied = () => ({ outcome: "applied" as const, status: "running" as const, leaseExpiresAt: new Date(Date.now()+1800000).toISOString() });
describe("Medical Motion safe handler retry matrix", () => {
  const clinical = contextContent();
  const contexts = { read: vi.fn(), reconstruct: vi.fn() }, attempts = { renewLease: vi.fn() }, execute = vi.fn(), acceptCandidate = vi.fn();
  const client = {} as SupabaseClient;
  let artifacts: Awaited<ReturnType<typeof createArtifactOwnership>>[] = [];
  const make = (signal?: AbortSignal) => createMedicalMotionRenderHandler(client,
    { capability: "medical-motion-render", mode: "development", acceptCandidate, signal }, { contexts, attempts, execute });
  const fail = (errorCode: string, cleanupConfirmed?: boolean) => {
    const result = { status: "failed" as const, errorCode, message: "PRIVATE CLINICAL /path/ stderr" };
    if (cleanupConfirmed !== undefined) recordExecutionResources(result, { cleanupConfirmed });
    execute.mockResolvedValue(result);
  };
  const success = async () => {
    const artifact = await createArtifactOwnership("handler-test.mp4", "video"); artifacts.push(artifact);
    const result = { status: "completed" as const, outputPath: artifact.outputPath, durationSeconds: 1 };
    recordExecutionResources(result, { cleanupConfirmed: false, artifact }); execute.mockResolvedValue(result);
    return artifact;
  };
  beforeEach(() => {
    contexts.read.mockResolvedValue({ ...clinical, id: ctx, userId: owner, createdAt: new Date().toISOString() });
    contexts.reconstruct.mockResolvedValue({ schemaVersion: "1", clinical: clinical.clinical, plan: clinical.candidatePlan, sceneIndex: 0 });
    attempts.renewLease.mockImplementation(async () => applied()); acceptCandidate.mockResolvedValue(undefined);
    fail("INVALID_SCENE");
  });
  afterEach(async () => { vi.useRealTimers(); for (const artifact of artifacts) await discardArtifact(artifact); artifacts=[]; });
  it("reconstructs context with exact owner/scene and trusted options", async () => {
    await make()(job()); expect(contexts.read).toHaveBeenCalledWith(ctx, owner);
    expect(contexts.reconstruct).toHaveBeenCalledWith(ctx, owner, 0);
    expect(execute.mock.calls[0][0].clinical).toEqual(clinical.clinical);
    expect(execute.mock.calls[0][1]).toEqual({ clinicalContextId: ctx, assetVersion: clinical.assetVersion, mode: "development", outputPath: "render.mp4" });
    expect(execute.mock.calls[0][2].signal).toBeInstanceOf(AbortSignal);
  });
  it.each(["CONTEXT_NOT_FOUND", "CONTEXT_VERSION_UNAVAILABLE", "INVALID_CONTEXT", "INVALID_CONTEXT_RESULT"] as const)("%s is permanent", async code => {
    contexts.reconstruct.mockRejectedValue(new ExecutionContextError(code));
    expect(await make()(job())).toMatchObject({ disposition: "fail", outcome: "PERMANENT", errorCode: code }); expect(execute).not.toHaveBeenCalled();
  });
  it("wrong context owner is never substituted", async () => {
    contexts.read.mockRejectedValue(new ExecutionContextError("CONTEXT_NOT_FOUND"));
    const j=job(); j.userId=token;
    expect(await make()(j)).toMatchObject({ disposition: "fail", errorCode: "CONTEXT_NOT_FOUND" });
    expect(contexts.read).toHaveBeenCalledExactlyOnceWith(ctx,token); expect(execute).not.toHaveBeenCalled();
  });
  it.each([{schemaVersion:"2"}, {executionVersion:"2"}, {sceneIndex:-1}, {clinical:"private"}, {outputPath:"escape"}, {timeoutMs:1}, {userId:owner}])("rejects malformed/config payload %j", async extra => {
    const j=job(); j.payload={...(j.payload as object),...extra};
    expect(await make()(j)).toMatchObject({ disposition:"fail",errorCode:"INVALID_MOTION_JOB" }); expect(attempts.renewLease).not.toHaveBeenCalled(); expect(execute).not.toHaveBeenCalled();
  });
  it.each(["UNSAFE_FOR_VIDEO_FIRST","INVALID_SCENE_PLAN","ANATOMY_STRUCTURE_NOT_FOUND","REAL_ANATOMICAL_ASSET_REQUIRED","INVALID_SCENE","ASSET_NOT_FOUND"])("%s never retries",async code=>{
    fail(code); expect(await make()(job())).toMatchObject({ disposition:"fail",errorCode:code });
  });
  it("transient context database read is retryable with safe code",async()=>{
    contexts.read.mockRejectedValue(new ExecutionContextError("CONTEXT_READ_FAILED"));
    expect(await make()(job())).toMatchObject({disposition:"retry",errorCode:"CONTEXT_READ_FAILED"});
  });
  it.each(["BLENDER_FAILED","RENDER_TIMEOUT"])("%s retries only with runtime cleanup evidence",async code=>{
    fail(code,true);expect(await make()(job())).toMatchObject({disposition:"retry",errorCode:code});
  });
  it.each([false,undefined])("timeout without confirmed cleanup (%s) is not retryable",async confirmed=>{
    fail("RENDER_TIMEOUT",confirmed);expect(await make()(job())).toMatchObject({disposition:"fail"});
  });
  it("ownership loss before execution prevents context read and spawn",async()=>{
    attempts.renewLease.mockResolvedValue({outcome:"ownership-lost",status:null,leaseExpiresAt:null});
    expect(await make()(job())).toMatchObject({disposition:"ownership-lost"});expect(contexts.read).not.toHaveBeenCalled();expect(execute).not.toHaveBeenCalled();
  });
  it("periodic ownership loss aborts active execution",async()=>{
    vi.useFakeTimers(); attempts.renewLease.mockResolvedValueOnce(applied()).mockResolvedValue({outcome:"ownership-lost",status:null,leaseExpiresAt:null});
    execute.mockImplementation(async (_input,_options,{signal})=>new Promise(resolve=>signal.addEventListener("abort",()=>resolve({status:"failed",errorCode:"RENDER_CANCELLED"}),{once:true})));
    const pending=make()(job()); await vi.advanceTimersByTimeAsync(OWNERSHIP_POLICY.intervalMs+1);
    expect(await pending).toMatchObject({disposition:"ownership-lost"});expect(execute.mock.calls[0][2].signal.aborted).toBe(true);
  });
  it("trusted shutdown signal cancels active execution",async()=>{
    const controller=new AbortController();execute.mockImplementation(async (_input,_options,{signal})=>{controller.abort(); expect(signal.aborted).toBe(true);return {status:"failed",errorCode:"RENDER_CANCELLED"};});
    expect(await make(controller.signal)(job())).toMatchObject({disposition:"ownership-lost"});
  });
  it("local success has no path, reference or publication in serializable outcome",async()=>{
    const artifact=await success(),outcome=await make()(job());
    expect(outcome).toMatchObject({disposition:"defer-completion",outcome:"EXECUTION_SUCCEEDED_AWAITING_ARTIFACT_PUBLICATION"});
    expect(JSON.stringify(outcome)).not.toContain(artifact.outputPath);expect(outcome).not.toHaveProperty("referenceId");expect(acceptCandidate).not.toHaveBeenCalled();
    if(outcome.disposition==="defer-completion") await outcome.settle(true);
    expect(acceptCandidate).toHaveBeenCalledWith(expect.objectContaining({localPath:artifact.outputPath,media:"video",discard:expect.any(Function)}));
    expect(()=>JSON.stringify(acceptCandidate.mock.calls[0][0])).toThrow("LOCAL_ARTIFACT_NOT_SERIALIZABLE");
    if(outcome.disposition==="defer-completion") await expect(outcome.settle(true)).rejects.toThrow("ARTIFACT_HANDOFF_ALREADY_SETTLED");
    expect(acceptCandidate).toHaveBeenCalledOnce();
  });
  it("fresh ownership loss after local success prevents candidate handoff",async()=>{
    await success();attempts.renewLease.mockResolvedValueOnce(applied()).mockResolvedValue({outcome:"ownership-lost",status:null,leaseExpiresAt:null});
    expect(await make()(job())).toMatchObject({disposition:"ownership-lost"});expect(acceptCandidate).not.toHaveBeenCalled();
  });
  it("failure diagnostics never enter returned last-error code",async()=>{
    execute.mockRejectedValue(new Error("PRIVATE CLINICAL /path/ stderr"));const r=await make()(job());
    expect(r).toMatchObject({disposition:"fail",errorCode:"MOTION_HANDLER_INTERNAL_FAILURE"});expect(JSON.stringify(r)).not.toMatch(/PRIVATE|stderr|path/);
  });
  it("completed result without runtime artifact authority fails closed",async()=>{
    execute.mockResolvedValue({status:"completed",outputPath:"untrusted/local.mp4",durationSeconds:1});
    expect(await make()(job())).toMatchObject({disposition:"fail",errorCode:"ARTIFACT_OWNERSHIP_UNAVAILABLE"});expect(acceptCandidate).not.toHaveBeenCalled();
  });
  it("fenced defer precedes handoff; worker never calls complete",async()=>{
    await success();const dispatcher=new JobDispatcher();dispatcher.register("medical-motion-render",make());
    const repository={claimNext:vi.fn().mockResolvedValue(job()),deferCompletion:vi.fn().mockResolvedValue({outcome:"applied"}),markCompleted:vi.fn(),markFailed:vi.fn(),scheduleRetry:vi.fn()};
    acceptCandidate.mockImplementation(async()=>{expect(repository.deferCompletion).toHaveBeenCalled();});
    await new DurableBackgroundJobWorker(repository as unknown as BackgroundJobWorkerRepository,dispatcher).processNext();
    expect(repository.markCompleted).not.toHaveBeenCalled();expect(repository.markFailed).not.toHaveBeenCalled();expect(repository.scheduleRetry).not.toHaveBeenCalled();
  });
});
