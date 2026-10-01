import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BackgroundJobWorkerRepository, type DurableBackgroundJob } from "@/lib/jobs/background-job-worker.repository";
import { DurableBackgroundJobWorker } from "@/lib/jobs/background-job-worker";
import { JobDispatcher } from "@/lib/jobs/job-dispatcher";
import { JOB_TYPES, JOB_STATUS } from "@/lib/jobs/job-types";

vi.mock("@/lib/api/api-logger", () => ({ logApiError: vi.fn() }));
const ownership = { jobId: "11111111-1111-4111-8111-111111111111", attemptToken: "22222222-2222-4222-8222-222222222222" };
const applied = { outcome: "applied", job_status: "completed", lease_expires_at: null };
const job: DurableBackgroundJob = {
  id: ownership.jobId, attemptToken: ownership.attemptToken, leaseExpiresAt: "2026-10-01T20:00:00Z",
  userId: "opaque-user", requestId: null, type: JOB_TYPES.FOLLOW_UP_DELIVERY, status: JOB_STATUS.RUNNING,
  payload: {}, attempts: 0, maxAttempts: 3, createdAt: "2026-10-01T19:00:00Z",
  availableAt: "2026-10-01T19:00:00Z", updatedAt: "2026-10-01T19:00:00Z",
  startedAt: "2026-10-01T19:00:00Z", finishedAt: null, lastError: null,
};
function setup(handler = vi.fn(async () => undefined)) {
  const rpc = vi.fn().mockResolvedValue({ data: [applied], error: null });
  const repository = new BackgroundJobWorkerRepository({ rpc } as unknown as SupabaseClient);
  vi.spyOn(repository, "claimNext").mockResolvedValue(job);
  const dispatcher = new JobDispatcher();
  dispatcher.register(JOB_TYPES.FOLLOW_UP_DELIVERY, handler);
  return { rpc, repository, handler, worker: new DurableBackgroundJobWorker(repository, dispatcher) };
}
describe("Durable ownership RPC and worker boundary (mock-only, not PostgreSQL locking proof)", () => {
  it.each(["complete", "renew", "retry", "fail"] as const)("passes the same token to %s", async action => {
    const { repository, rpc } = setup();
    if (action === "complete") await repository.markCompleted(ownership);
    if (action === "renew") await repository.renewLease(ownership);
    if (action === "retry") await repository.scheduleRetry({ ...ownership, retryDelayMs: 30000, errorMessage: "opaque failure" });
    if (action === "fail") await repository.markFailed({ ...ownership, errorMessage: "opaque failure" });
    expect(rpc).toHaveBeenCalledWith("mutate_background_job_attempt", expect.objectContaining({
      p_job_id: ownership.jobId, p_attempt_token: ownership.attemptToken, p_action: action,
    }));
  });
  it.each([[], null, [{}], [applied, applied]])("rejects an invalid/zero-row response %j", async data => {
    const { repository, rpc } = setup();
    rpc.mockResolvedValue({ data, error: null });
    await expect(repository.markCompleted(ownership)).rejects.toThrow("invalid result");
  });
  it("exposes ownership loss explicitly", async () => {
    const { repository, rpc } = setup();
    rpc.mockResolvedValue({ data: [{ outcome: "ownership-lost", job_status: null, lease_expires_at: null }], error: null });
    expect(await repository.renewLease(ownership)).toEqual({ outcome: "ownership-lost", status: null, leaseExpiresAt: null });
  });
  it("reconciles a lost completion response without dispatching or retrying again", async () => {
    const { repository, rpc, worker, handler } = setup();
    const retry = vi.spyOn(repository, "scheduleRetry");
    const fail = vi.spyOn(repository, "markFailed");
    rpc.mockRejectedValueOnce(new Error("Lost response")).mockResolvedValueOnce({
      data: [{ outcome: "already-finalized", job_status: "completed", lease_expires_at: null }], error: null,
    });
    await worker.processNext();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[0]).toEqual(rpc.mock.calls[1]);
    expect(retry).not.toHaveBeenCalled();
    expect(fail).not.toHaveBeenCalled();
  });
  it("propagates unresolved completion ambiguity without scheduling duplicate execution", async () => {
    const { repository, rpc, worker, handler } = setup();
    const retry = vi.spyOn(repository, "scheduleRetry");
    const fail = vi.spyOn(repository, "markFailed");
    rpc.mockRejectedValue(new Error("Unavailable"));
    await expect(worker.processNext()).rejects.toThrow("Unavailable");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(retry).not.toHaveBeenCalled();
    expect(fail).not.toHaveBeenCalled();
  });
  it("stops after rejected completion ownership", async () => {
    const { rpc, worker } = setup();
    rpc.mockResolvedValue({ data: [{ outcome: "ownership-lost", job_status: null, lease_expires_at: null }], error: null });
    await worker.processNext();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][1].p_action).toBe("complete");
  });
  it("handler failure uses a fenced retry and database-relative delay without changing attempts client-side", async () => {
    const { rpc, worker } = setup(vi.fn(async () => { throw new Error("opaque failure"); }));
    rpc.mockResolvedValue({ data: [{ outcome: "ownership-lost", job_status: null, lease_expires_at: null }], error: null });
    await worker.processNext();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][1]).toEqual({
      p_job_id: ownership.jobId, p_attempt_token: ownership.attemptToken,
      p_action: "retry", p_retry_delay_ms: 30000, p_error_message: "opaque failure",
    });
  });
  it("rejects a claimed row lacking durable ownership before dispatch", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ status: "running" }], error: null });
    const repository = new BackgroundJobWorkerRepository({ rpc } as unknown as SupabaseClient);
    await expect(repository.claimNext()).rejects.toThrow();
    await expect(repository.claimById(ownership.jobId)).rejects.toThrow();
  });
  it("claim-by-ID forwards its exact attempt ownership to completion", async () => {
    const { repository, rpc, worker } = setup();
    const claim = vi.spyOn(repository, "claimById").mockResolvedValue(job);
    await worker.processById(job.id);
    expect(claim).toHaveBeenCalledWith(job.id);
    expect(rpc.mock.calls[0][1]).toMatchObject({
      p_job_id: ownership.jobId, p_attempt_token: ownership.attemptToken, p_action: "complete",
    });
  });
  it("does not reinterpret a retry transport failure as another handler failure", async () => {
    const { rpc, worker } = setup(vi.fn(async () => { throw new Error("opaque failure"); }));
    rpc.mockRejectedValue(new Error("Retry response unavailable"));
    await expect(worker.processNext()).rejects.toThrow("Retry response unavailable");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][1].p_action).toBe("retry");
  });
});
