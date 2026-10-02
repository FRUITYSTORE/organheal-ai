import { describe, expect, it, vi } from "vitest";
import { JobDispatcher } from "@/lib/jobs/job-dispatcher";
import { DurableBackgroundJobWorker } from "@/lib/jobs/background-job-worker";
import type { JobHandlerResult } from "@/lib/jobs/job-handler";
import type { BackgroundJobWorkerRepository, DurableBackgroundJob } from "@/lib/jobs/background-job-worker.repository";
import { JobWorker } from "@/lib/jobs/job-worker";
import type { BackgroundJobQueue } from "@/lib/jobs/job-queue";

async function run(result: void | JobHandlerResult, exhausted=false, defer?:ReturnType<typeof vi.fn>) {
  const job={id:"job",attemptToken:"token",type:"medical-motion-render",attempts:exhausted?2:0,maxAttempts:3} as DurableBackgroundJob;
  const repository={claimNext:vi.fn().mockResolvedValue(job),markCompleted:vi.fn(),markFailed:vi.fn(),scheduleRetry:vi.fn(),
    deferCompletion:defer??vi.fn().mockResolvedValue({outcome:"applied"})};
  const dispatcher=new JobDispatcher();dispatcher.register(job.type,async()=>result);
  await new DurableBackgroundJobWorker(repository as unknown as BackgroundJobWorkerRepository,dispatcher).processNext();return repository;
}
describe("generic handler dispositions preserve fenced worker semantics",()=>{
  it("already finalized publication performs no second worker mutation",async()=>{const r=await run({disposition:"already-finalized"});expect(r.markCompleted).not.toHaveBeenCalled();expect(r.markFailed).not.toHaveBeenCalled();expect(r.scheduleRetry).not.toHaveBeenCalled();expect(r.deferCompletion).not.toHaveBeenCalled();});
  it("legacy void success completes",async()=>{expect((await run(undefined)).markCompleted).toHaveBeenCalledWith({jobId:"job",attemptToken:"token"});});
  it("explicit complete retains old completion",async()=>{expect((await run({disposition:"complete"})).markCompleted).toHaveBeenCalledOnce();});
  it("permanent failure never retries",async()=>{const r=await run({disposition:"fail",errorCode:"INVALID_CONTEXT"});expect(r.markFailed).toHaveBeenCalledWith({jobId:"job",attemptToken:"token",errorMessage:"INVALID_CONTEXT"});expect(r.scheduleRetry).not.toHaveBeenCalled();expect(r.markCompleted).not.toHaveBeenCalled();});
  it("retry uses token and bounded backoff",async()=>{const r=await run({disposition:"retry",errorCode:"RENDER_TIMEOUT"});expect(r.scheduleRetry).toHaveBeenCalledWith({jobId:"job",attemptToken:"token",errorMessage:"RENDER_TIMEOUT",retryDelayMs:30000});expect(r.markCompleted).not.toHaveBeenCalled();});
  it("exhausted retry fails",async()=>{const r=await run({disposition:"retry",errorCode:"RENDER_TIMEOUT"},true);expect(r.markFailed).toHaveBeenCalledOnce();expect(r.scheduleRetry).not.toHaveBeenCalled();});
  it("ownership loss performs no mutation",async()=>{const r=await run({disposition:"ownership-lost"});expect(r.markCompleted).not.toHaveBeenCalled();expect(r.markFailed).not.toHaveBeenCalled();expect(r.scheduleRetry).not.toHaveBeenCalled();expect(r.deferCompletion).not.toHaveBeenCalled();});
  it("raw diagnostic is replaced before persistence",async()=>{const r=await run({disposition:"fail",errorCode:"clinical /path stderr"});expect(r.markFailed.mock.calls[0][0].errorMessage).toBe("INVALID_HANDLER_ERROR_CODE");});
  it.each(["applied","already-finalized"])("defer %s accepts handoff without complete",async outcome=>{const settle=vi.fn();const r=await run({disposition:"defer-completion",settle},false,vi.fn().mockResolvedValue({outcome}));expect(settle).toHaveBeenCalledWith(true);expect(r.markCompleted).not.toHaveBeenCalled();});
  it("lost defer refuses handoff and makes no stale mutation",async()=>{const settle=vi.fn();const r=await run({disposition:"defer-completion",settle},false,vi.fn().mockResolvedValue({outcome:"ownership-lost"}));expect(settle).toHaveBeenCalledWith(false);expect(r.markCompleted).not.toHaveBeenCalled();expect(r.scheduleRetry).not.toHaveBeenCalled();});
  it("unknown defer response replays only identical transition",async()=>{const defer=vi.fn().mockRejectedValueOnce(new Error("transport")).mockResolvedValue({outcome:"already-finalized"}),settle=vi.fn();await run({disposition:"defer-completion",settle},false,defer);expect(defer).toHaveBeenCalledTimes(2);expect(defer.mock.calls[0]).toEqual(defer.mock.calls[1]);expect(settle).toHaveBeenCalledWith(true);});
  it("twice-unknown defer refuses handoff and never retries render",async()=>{const defer=vi.fn().mockRejectedValue(new Error("unknown")),settle=vi.fn();await expect(run({disposition:"defer-completion",settle},false,defer)).rejects.toThrow("unknown");expect(settle).toHaveBeenCalledWith(false);expect(defer).toHaveBeenCalledTimes(2);});
  it("unknown explicit result cannot silently complete",async()=>{const r=await run({disposition:"unknown"} as unknown as JobHandlerResult);expect(r.markFailed).toHaveBeenCalledWith(expect.objectContaining({errorMessage:"INVALID_HANDLER_RESULT"}));expect(r.markCompleted).not.toHaveBeenCalled();});
  it("in-memory worker refuses deferred completion and discards handoff",async()=>{
    const job={id:"job",type:"medical-motion-render",status:"pending",attempts:0,maxAttempts:3} as DurableBackgroundJob;
    const settle=vi.fn(),queue={dequeue:vi.fn().mockResolvedValue(job),enqueue:vi.fn()};
    const dispatcher=new JobDispatcher();dispatcher.register(job.type,async()=>({disposition:"defer-completion",settle}));
    await new JobWorker(queue as unknown as BackgroundJobQueue,dispatcher).processNext();
    expect(settle).toHaveBeenCalledWith(false);expect(job.status).toBe("failed");expect(queue.enqueue).not.toHaveBeenCalled();
  });
});
