import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { validateMedicalMotionJobPayload, MedicalMotionJobRepository, MedicalMotionJobError } from "@/lib/medical-motion/job.repository";
import { BackgroundJobWorkerRepository } from "@/lib/jobs/background-job-worker.repository";
import { JOB_TYPES } from "@/lib/jobs/job-types";
import { contextContent } from "./helpers/medical-motion-context";
const owner="11111111-1111-4111-8111-111111111111", context="22222222-2222-4222-8222-222222222222";
const job="33333333-3333-4333-8333-333333333333";
const payload = () => ({ schemaVersion:"1",executionVersion:"1",executionContextId:context,sceneIndex:0 });
function repository(data: unknown=[{job_id:job,execution_context_id:context,created:true}], error:unknown=null) {
  const rpc=vi.fn().mockResolvedValue({data,error});
  return { rpc, repo:new MedicalMotionJobRepository({rpc} as unknown as SupabaseClient) };
}
describe("Medical Motion reference-only durable job foundation",()=>{
  it("accepts strict versioned references",()=>expect(validateMedicalMotionJobPayload(payload())).toEqual(payload()));
  it.each(["message","clinical","plan","candidatePlan","reasoning","findings","authorization","signal","control",
    "blenderConfig","timeoutMs","outputPath","userId","capabilities","artifactMetadata"])("rejects payload field %s",key=>{
    expect(()=>validateMedicalMotionJobPayload({...payload(),[key]:"rejected-sensitive-value"})).toThrow(/^INVALID_MOTION_JOB$/);
  });
  it.each([null,{},[],{...payload(),schemaVersion:"2"},{...payload(),executionVersion:"2"},{...payload(),executionContextId:"bad"},
    ...[-1,1.5,1024,NaN,Infinity].map(sceneIndex=>({...payload(),sceneIndex}))])("rejects malformed payload %#",value=>{
    expect(()=>validateMedicalMotionJobPayload(value)).toThrow("INVALID_MOTION_JOB");
  });
  it("rejects prototype/accessor payloads without invoking getter",()=>{
    const get=vi.fn(()=>"secret"), p=payload(); Object.defineProperty(p,"sceneIndex",{get,enumerable:true});
    expect(()=>validateMedicalMotionJobPayload(p)).toThrow("INVALID_MOTION_JOB"); expect(get).not.toHaveBeenCalled();
    expect(()=>validateMedicalMotionJobPayload(Object.assign(Object.create({}),payload()))).toThrow("INVALID_MOTION_JOB");
  });
  it("enqueues only through one atomic RPC with separate trusted owner/request identity",async()=>{
    const {repo,rpc}=repository(); const result=await repo.enqueue(owner,job,contextContent(),0);
    expect(result).toEqual({jobId:job,executionContextId:context,created:true});
    expect(rpc).toHaveBeenCalledTimes(1); expect(rpc.mock.calls[0][0]).toBe("enqueue_medical_motion_job");
    expect(rpc.mock.calls[0][1].p_user_id===owner && rpc.mock.calls[0][1].p_request_id===job).toBe(true);
  });
  it("returns stable replay identities",async()=>{
    const {repo}=repository([{job_id:job,execution_context_id:context,created:false}]);
    expect(await repo.enqueue(owner,job,contextContent(),0)).toEqual({jobId:job,executionContextId:context,created:false});
  });
  it.each(["userId","signal","outputPath","metadata"])("rejects extra content %s before database",async key=>{
    const {repo,rpc}=repository(); await expect(repo.enqueue(owner,job,{...contextContent(),[key]:true},0)).rejects.toThrow("INVALID_CONTEXT");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("rejects bad identity or scene before database",async()=>{
    const {repo,rpc}=repository(); await expect(repo.enqueue("bad",job,contextContent(),0)).rejects.toThrow("INVALID_MOTION_JOB");
    await expect(repo.enqueue(owner,"bad",contextContent(),0)).rejects.toThrow("INVALID_MOTION_JOB");
    await expect(repo.enqueue(owner,job,contextContent(),1024)).rejects.toThrow("INVALID_MOTION_JOB"); expect(rpc).not.toHaveBeenCalled();
  });
  it.each([null,[],{},[{job_id:job,execution_context_id:context,created:"yes"}],
    [{job_id:job,execution_context_id:"bad",created:true}],[{job_id:job,execution_context_id:context,created:true,secret:"synthetic"}]])("rejects malformed/empty RPC %#",async data=>{
    const {repo}=repository(data); await expect(repo.enqueue(owner,job,contextContent(),0)).rejects.toThrow("INVALID_MOTION_JOB_RESULT");
  });
  it("maps conflict and provider failures to constant PHI-safe errors",async()=>{
    const {repo,rpc}=repository(null,{code:"OM409",message:"rejected-sensitive-value"});
    await expect(repo.enqueue(owner,job,contextContent(),0)).rejects.toThrow(/^MOTION_JOB_CONFLICT$/);
    rpc.mockResolvedValue({data:null,error:{code:"other",message:"rejected-sensitive-value"}});
    await expect(repo.enqueue(owner,job,contextContent(),0)).rejects.toThrow(/^MOTION_JOB_ENQUEUE_FAILED$/);
    rpc.mockRejectedValue(new Error("rejected-sensitive-value"));
    await expect(repo.enqueue(owner,job,contextContent(),0)).rejects.toThrow(/^MOTION_JOB_ENQUEUE_FAILED$/);
  });
  it("snapshots enqueue content before awaiting a response",async()=>{
    const {repo,rpc}=repository(); const input=contextContent();
    const pending=repo.enqueue(owner,job,input,0); input.clinical.message="changed";
    expect(rpc.mock.calls[0][1].p_clinical_message!==input.clinical.message).toBe(true); await pending;
  });
  it("never propagates even a provider-thrown domain error instance with changed diagnostics",async()=>{
    const {repo,rpc}=repository(),error=new MedicalMotionJobError("INVALID_MOTION_JOB");error.message="rejected-sensitive-value";
    rpc.mockRejectedValue(error);
    await expect(repo.enqueue(owner,job,contextContent(),0)).rejects.toThrow(/^MOTION_JOB_ENQUEUE_FAILED$/);
  });
  it("prepares exact owner-bound context input without executing a renderer",async()=>{
    const input=contextContent(),{repo,rpc}=repository([{id:context,user_id:owner,schema_version:"1",execution_version:"1",
      asset_version:input.assetVersion,clinical_message:input.clinical.message,clinical_language:input.clinical.language,
      candidate_plan:input.candidatePlan,created_at:"2026-10-02T00:00:00Z"}]);
    const output=await repo.reconstruct({type:JOB_TYPES.MEDICAL_MOTION_RENDER,userId:owner,payload:payload()});
    expect(output.clinical.message===input.clinical.message).toBe(true);
    expect(rpc).toHaveBeenCalledWith("read_medical_motion_execution_context",{p_context_id:context,p_user_id:owner});
    await expect(repo.reconstruct({type:JOB_TYPES.PDF_EXTRACTION,userId:owner,payload:payload()})).rejects.toThrow("INVALID_MOTION_JOB");
  });
  it("cross-owner reconstruction fails closed",async()=>{
    const {repo}=repository([]); await expect(repo.reconstruct({type:JOB_TYPES.MEDICAL_MOTION_RENDER,userId:owner,payload:payload()})).rejects.toThrow("CONTEXT_NOT_FOUND");
  });
  it("default server claims restrict both entrypoints to actual registered handlers",async()=>{
    const {rpc}=repository([]),worker=new BackgroundJobWorkerRepository({rpc} as unknown as SupabaseClient);
    await worker.claimNext(); await worker.claimById(job);
    expect(rpc.mock.calls[0]).toEqual(["claim_next_background_job",{p_allowed_job_types:["pdf-extraction","follow-up-delivery"]}]);
    expect(rpc.mock.calls[1]).toEqual(["claim_background_job_by_id",{p_job_id:job,p_allowed_job_types:["pdf-extraction","follow-up-delivery"]}]);
  });
  it("explicit render capability is copied from trusted server policy",async()=>{
    const {rpc}=repository([]),allowed=[JOB_TYPES.MEDICAL_MOTION_RENDER];
    const worker=new BackgroundJobWorkerRepository({rpc} as unknown as SupabaseClient,allowed); allowed.length=0;
    await worker.claimNext(); expect(rpc.mock.calls[0][1]).toEqual({p_allowed_job_types:["medical-motion-render"]});
  });
  it("fails closed if a claim response violates the server allow-list",async()=>{
    const {rpc}=repository([{job_type:"medical-motion-render"}]);
    const worker=new BackgroundJobWorkerRepository({rpc} as unknown as SupabaseClient);
    await expect(worker.claimNext()).rejects.toThrow("Background job claim exceeded server capabilities.");
    await expect(worker.claimById(job)).rejects.toThrow("Background job claim exceeded server capabilities.");
  });
  it.each([[],["unknown"],[JOB_TYPES.PDF_EXTRACTION,JOB_TYPES.PDF_EXTRACTION]].map(allowed=>({allowed})))("rejects invalid capability policy %#",({allowed})=>{
    expect(()=>new BackgroundJobWorkerRepository({} as SupabaseClient,allowed as never)).toThrow("Invalid server worker capabilities.");
  });
});
