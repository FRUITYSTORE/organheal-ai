import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExecutionOwnership, OWNERSHIP_POLICY as policy, type OwnedOperation } from "../lib/jobs/execution-ownership";
import type { AttemptMutationResult } from "../lib/jobs/background-job-worker.repository";

const attempt = { jobId: "11111111-1111-4111-8111-111111111111", attemptToken: "22222222-2222-4222-8222-222222222222" };
const manifest = { kind: "artifact" as const, referenceId: "33333333-3333-4333-8333-333333333333" };
const valid: AttemptMutationResult = { outcome: "applied", status: "running", leaseExpiresAt: "2026-10-02T12:30:00Z" };
const lost: AttemptMutationResult = { outcome: "ownership-lost", status: null, leaseExpiresAt: null };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function fixture() {
  const renewLease = vi.fn<() => Promise<AttemptMutationResult>>().mockResolvedValue(valid);
  const publish = vi.fn().mockResolvedValue({ outcome: "applied", resultId: manifest.referenceId });
  return { boundary: new ExecutionOwnership(attempt, { renewLease, publish }), renewLease, publish };
}
const flush = () => vi.advanceTimersByTimeAsync(0);
beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe("single-use execution ownership", () => {
  it("confirms fenced ownership before expensive work and before publication", async () => {
    const f = fixture();
    const op = vi.fn(async () => { expect(f.renewLease).toHaveBeenCalledWith(attempt); return { status: "succeeded" as const, value: 7 }; });
    expect(await f.boundary.run(op)).toEqual({ execution: "succeeded", value: 7, publicationAllowed: true });
    expect(vi.getTimerCount()).toBe(0);
    await f.boundary.publish(manifest);
    expect(f.renewLease).toHaveBeenCalledTimes(2);
    expect(f.publish).toHaveBeenCalledWith({ ...attempt, manifest });
    expect(f.boundary.publicationAllowed).toBe(false);
    expect(await f.boundary.run(op)).toMatchObject({ execution: "not-started" });
  });
  it.each(["stale attempt", "expired lease"])("never starts or revives work for %s", async () => {
    const f = fixture(); f.renewLease.mockResolvedValue(lost); const op = vi.fn();
    expect(await f.boundary.run(op)).toMatchObject({ execution: "not-started", publicationAllowed: false });
    expect(op).not.toHaveBeenCalled(); expect(f.boundary.signal.aborted).toBe(true);
    await expect(f.boundary.publish(manifest)).rejects.toThrow();
    expect(f.publish).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it("renews every five minutes while active and stops after success", async () => {
    const f = fixture(), work = deferred<OwnedOperation<number>>(); const task = f.boundary.run(() => work.promise);
    await flush(); await vi.advanceTimersByTimeAsync(policy.intervalMs * 2);
    expect(f.renewLease).toHaveBeenCalledTimes(3);
    work.resolve({ status: "succeeded", value: 1 }); await task;
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(policy.intervalMs); expect(f.renewLease).toHaveBeenCalledTimes(3);
  });
  it("never overlaps a pending renewal; hung RPC cancels and late success cannot restore ownership", async () => {
    const f = fixture(), renewal = deferred<AttemptMutationResult>(), work = deferred<OwnedOperation<number>>();
    f.renewLease.mockResolvedValueOnce(valid).mockReturnValueOnce(renewal.promise);
    const task = f.boundary.run(() => work.promise); await flush();
    await vi.advanceTimersByTimeAsync(policy.intervalMs + policy.requestTimeoutMs - 1);
    expect(f.renewLease).toHaveBeenCalledTimes(2); expect(f.boundary.signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1); expect(f.boundary.signal.aborted).toBe(true);
    renewal.resolve(valid); work.resolve({ status: "succeeded", value: 1 });
    expect(await task).toMatchObject({ execution: "cancelled", publicationAllowed: false });
    await vi.advanceTimersByTimeAsync(policy.intervalMs); expect(f.renewLease).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("ownership loss cancels the signal and rejects late successful publication", async () => {
    const f = fixture(), work = deferred<OwnedOperation<number>>(); f.renewLease.mockResolvedValueOnce(valid).mockResolvedValueOnce(lost);
    const task = f.boundary.run(() => work.promise); await flush(); await vi.advanceTimersByTimeAsync(policy.intervalMs);
    expect(f.boundary.signal.aborted).toBe(true); expect(vi.getTimerCount()).toBe(0);
    work.resolve({ status: "succeeded", value: 42 }); expect(await task).toMatchObject({ execution: "cancelled", publicationAllowed: false });
    await expect(f.boundary.publish(manifest)).rejects.toThrow(); expect(f.publish).not.toHaveBeenCalled();
  });
  it("transient failure cannot falsely publish; only confirmed reconciliation restores eligibility", async () => {
    const f = fixture(), work = deferred<OwnedOperation<number>>(); f.renewLease.mockResolvedValueOnce(valid).mockRejectedValueOnce(new Error("private diagnostics"));
    const task = f.boundary.run(() => work.promise); await flush(); await vi.advanceTimersByTimeAsync(policy.intervalMs);
    expect(f.boundary.signal.aborted).toBe(false);
    work.resolve({ status: "succeeded", value: 1 }); expect(await task).toMatchObject({ execution: "succeeded", publicationAllowed: false });
    expect(f.publish).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
    await f.boundary.publish(manifest); expect(f.renewLease).toHaveBeenCalledTimes(3); expect(f.publish).toHaveBeenCalledTimes(1);
  });
  it("retries once after five seconds, then cancels on repeated failure", async () => {
    const f = fixture(), work = deferred<OwnedOperation<number>>(); f.renewLease.mockResolvedValueOnce(valid).mockRejectedValue(new Error("unavailable"));
    const task = f.boundary.run(() => work.promise); await flush(); await vi.advanceTimersByTimeAsync(policy.intervalMs + policy.retryMs - 1);
    expect(f.boundary.signal.aborted).toBe(false); expect(f.renewLease).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1); expect(f.boundary.signal.aborted).toBe(true);
    work.resolve({ status: "failed" }); await task; expect(vi.getTimerCount()).toBe(0);
  });
  it("initial transient failure retries before starting; malformed/repeated confirmation prevents start", async () => {
    const f = fixture(), op = vi.fn(async () => ({ status: "succeeded" as const, value: 1 }));
    f.renewLease.mockRejectedValueOnce(new Error("unavailable")); const task = f.boundary.run(op);
    await flush(); expect(op).not.toHaveBeenCalled(); await vi.advanceTimersByTimeAsync(policy.retryMs); await task;
    expect(op).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
    const g = fixture(); g.renewLease.mockResolvedValue({ ...valid, leaseExpiresAt: null });
    const refused = g.boundary.run(op); await vi.advanceTimersByTimeAsync(policy.retryMs);
    expect(await refused).toMatchObject({ execution: "not-started" }); expect(g.boundary.signal.aborted).toBe(true); expect(vi.getTimerCount()).toBe(0);
  });
  it.each(["result", "exception"])("failure via %s stops all renewal timers", async kind => {
    const f = fixture(); const result = await f.boundary.run(async () => { if (kind === "exception") throw new Error("private"); return { status: "failed" }; });
    expect(result).toMatchObject({ execution: "failed", publicationAllowed: false }); expect(vi.getTimerCount()).toBe(0);
    await expect(f.boundary.publish(manifest)).rejects.toThrow();
  });
  it("completion joins an in-flight renewal before deciding publication eligibility", async () => {
    const f = fixture(), renewal = deferred<AttemptMutationResult>(), work = deferred<OwnedOperation<number>>();
    f.renewLease.mockResolvedValueOnce(valid).mockReturnValueOnce(renewal.promise);
    const task = f.boundary.run(() => work.promise); await flush(); await vi.advanceTimersByTimeAsync(policy.intervalMs);
    work.resolve({ status: "succeeded", value: 1 }); await flush(); renewal.resolve(lost);
    expect(await task).toMatchObject({ execution: "cancelled", publicationAllowed: false }); expect(vi.getTimerCount()).toBe(0);
  });
  it("shutdown cancels cooperative work and prohibits future execution/publication", async () => {
    const f = fixture(); const task = f.boundary.run(signal => new Promise(resolve => signal.addEventListener("abort", () => resolve({ status: "failed" }), { once: true })));
    await flush(); expect(await f.boundary.shutdown()).toEqual({ settled: true });
    expect(await task).toMatchObject({ execution: "cancelled" }); expect(f.boundary.publicationAllowed).toBe(false);
    await expect(f.boundary.publish(manifest)).rejects.toThrow(); expect(await f.boundary.run(vi.fn())).toMatchObject({ execution: "not-started" }); expect(vi.getTimerCount()).toBe(0);
  });
  it("shutdown is bounded even when operation ignores cancellation", async () => {
    const f = fixture(), work = deferred<OwnedOperation<number>>(); const task = f.boundary.run(() => work.promise); await flush();
    const shutdown = f.boundary.shutdown(); await vi.advanceTimersByTimeAsync(policy.shutdownMs);
    expect(await shutdown).toEqual({ settled: false }); expect(f.boundary.publicationAllowed).toBe(false); expect(vi.getTimerCount()).toBe(0);
    work.resolve({ status: "succeeded", value: 1 }); expect(await task).toMatchObject({ execution: "cancelled" });
  });
  it("shutdown during initial confirmation starts neither renewal transport nor operation", async () => {
    const f = fixture(), op = vi.fn(); const task = f.boundary.run(op); const shutdown = f.boundary.shutdown();
    await task; await shutdown; expect(f.renewLease).not.toHaveBeenCalled(); expect(op).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it("ownership loss on final confirmation refuses fenced publication", async () => {
    const f = fixture(); await f.boundary.run(async () => ({ status: "succeeded", value: 1 })); f.renewLease.mockResolvedValue(lost);
    await expect(f.boundary.publish(manifest)).rejects.toThrow(); expect(f.publish).not.toHaveBeenCalled(); expect(f.boundary.signal.aborted).toBe(true);
  });
  it("shutdown during publication confirmation prevents submission", async () => {
    const f = fixture(), renewal = deferred<AttemptMutationResult>(); await f.boundary.run(async () => ({ status: "succeeded", value: 1 }));
    f.renewLease.mockReturnValueOnce(renewal.promise); const publication = f.boundary.publish(manifest); const rejected = expect(publication).rejects.toThrow(); await flush();
    await f.boundary.shutdown(); await rejected; renewal.resolve(valid); await flush(); expect(f.publish).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it("lost publication response permits only identical fenced replay, without rerunning or renewing a finalized job", async () => {
    const f = fixture(); await f.boundary.run(async () => ({ status: "succeeded", value: 1 }));
    f.publish.mockRejectedValueOnce(new Error("private provider diagnostics"));
    await expect(f.boundary.publish(manifest)).rejects.toThrow("Publication failed; commit state is unknown."); expect(f.boundary.publicationAllowed).toBe(false);
    await expect(f.boundary.publish({ ...manifest, referenceId: attempt.jobId })).rejects.toThrow("identical");
    f.publish.mockResolvedValueOnce({ outcome: "already-finalized", resultId: manifest.referenceId });
    expect(await f.boundary.publish(manifest)).toMatchObject({ outcome: "already-finalized" }); expect(f.renewLease).toHaveBeenCalledTimes(2);
  });
  it("fenced publication ownership loss is irreversible", async () => {
    const f = fixture(); await f.boundary.run(async () => ({ status: "succeeded", value: 1 })); f.publish.mockResolvedValueOnce({ outcome: "ownership-lost", resultId: null });
    await f.boundary.publish(manifest); expect(f.boundary.signal.aborted).toBe(true); await expect(f.boundary.publish(manifest)).rejects.toThrow(); expect(vi.getTimerCount()).toBe(0);
  });
  it("shutdown bounds an already submitted publication but cannot undo a database commit", async () => {
    const f = fixture(), response = deferred<{ outcome: "applied"; resultId: string }>();
    await f.boundary.run(async () => ({ status: "succeeded", value: 1 })); f.publish.mockReturnValueOnce(response.promise);
    const publication = f.boundary.publish(manifest); await flush(); expect(f.publish).toHaveBeenCalledTimes(1);
    const shutdown = f.boundary.shutdown(); await vi.advanceTimersByTimeAsync(policy.shutdownMs);
    expect(await shutdown).toEqual({ settled: false }); expect(f.boundary.publicationAllowed).toBe(false);
    await expect(f.boundary.publish(manifest)).rejects.toThrow();
    response.resolve({ outcome: "applied", resultId: manifest.referenceId }); await publication;
    expect(f.boundary.publicationAllowed).toBe(false); expect(f.publish).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
  });
  it("cancellation prohibits even an identical replay after an unknown commit", async () => {
    const f = fixture(); await f.boundary.run(async () => ({ status: "succeeded", value: 1 })); f.publish.mockRejectedValueOnce(new Error("unavailable"));
    await expect(f.boundary.publish(manifest)).rejects.toThrow(); await f.boundary.shutdown();
    await expect(f.boundary.publish(manifest)).rejects.toThrow(); expect(f.publish).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
  });
});
