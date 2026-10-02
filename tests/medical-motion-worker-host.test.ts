import { afterEach, describe, expect, it, vi } from "vitest";
import { readWorkerConfig } from "@/lib/medical-motion/worker/config";
import { MedicalMotionWorkerHost, type WorkerEvent } from "@/lib/medical-motion/worker/host";
const flags = { blenderAvailable: true, dbReachable: true, storageConfigured: true };
const config = () => readWorkerConfig({ MEDICAL_MOTION_WORKER_IDLE_MS: "100", MEDICAL_MOTION_WORKER_RECOVERY_MS: "1000" });
afterEach(() => vi.useRealTimers());
describe("isolated worker lifecycle", () => {
  it("defaults to one render and immutable bounded configuration", () => {
    expect(readWorkerConfig({}).concurrency).toBe(1); expect(Object.isFrozen(config())).toBe(true);
  });
  it.each(["0", "3", "-1", "1.5", "Infinity", " 1", "1e0", ""])("rejects invalid concurrency %s", value => {
    expect(() => readWorkerConfig({ MEDICAL_MOTION_WORKER_CONCURRENCY: value })).toThrow("INVALID_WORKER_CONFIGURATION");
  });
  it.each(["MEDICAL_MOTION_WORKER_POLL_BATCH", "MEDICAL_MOTION_WORKER_IDLE_MS", "MEDICAL_MOTION_WORKER_ERROR_MAX_MS", "MEDICAL_MOTION_WORKER_RECOVERY_MS", "MEDICAL_MOTION_WORKER_SHUTDOWN_MS"])("bounds %s", name => {
    expect(() => readWorkerConfig({ [name]: "999999999" })).toThrow();
  });
  it.each(["blenderAvailable", "dbReachable", "storageConfigured"] as const)("does not claim when %s unavailable", async field => {
    const processNext = vi.fn(); const recover = vi.fn();
    const host = new MedicalMotionWorkerHost(config(), { preflight: async () => ({ ...flags, [field]: false }), recover, processNext });
    expect(await host.run()).toEqual({ settled: true, startupFailed: true });
    expect(processNext).not.toHaveBeenCalled(); expect(recover).not.toHaveBeenCalled(); expect(host.snapshot().ready).toBe(false);
  });
  it("recovers before the first poll, periodically, and sleeps between empty polls", async () => {
    vi.useFakeTimers(); const order: string[] = [];
    const host = new MedicalMotionWorkerHost(config(), { preflight: async () => flags,
      recover: async () => { order.push("recover"); }, processNext: async () => { order.push("poll"); return false; } });
    const run = host.run(); await vi.advanceTimersByTimeAsync(0);
    expect(order).toEqual(["recover", "poll"]);
    await vi.advanceTimersByTimeAsync(99); expect(order.length).toBe(2);
    await vi.advanceTimersByTimeAsync(1001); expect(order.filter(x => x === "recover").length).toBe(2);
    host.stop(); await run; const count = order.length; await vi.advanceTimersByTimeAsync(2000); expect(order.length).toBe(count);
    expect(host.snapshot()).toMatchObject({ ready: false, shuttingDown: true, settled: true, activeJobCount: 0 });
  });
  it("second render waits, active health counts jobs, and shutdown interrupts idle polling", async () => {
    vi.useFakeTimers(); let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve; });
    let host: MedicalMotionWorkerHost; const processNext = vi.fn(async () => { const done = host.beginJob("00000000-0000-4000-8000-000000000001"); await pending; done(); done(); return true; });
    host = new MedicalMotionWorkerHost(config(), { preflight: async () => flags, recover: async () => {}, processNext });
    const run = host.run(); await vi.advanceTimersByTimeAsync(2000); expect(processNext).toHaveBeenCalledTimes(1);
    expect(host.snapshot().activeJobCount).toBe(1); host.stop(); release(); await run;
    expect(processNext).toHaveBeenCalledTimes(1); expect(host.snapshot().activeJobCount).toBe(0);
  });
  it("uses bounded error backoff and restores DB readiness after recovery", async () => {
    vi.useFakeTimers(); const processNext = vi.fn().mockRejectedValueOnce(Error("secret diagnostic")).mockResolvedValue(false);
    const events: WorkerEvent[] = []; const host = new MedicalMotionWorkerHost(config(), { preflight: async () => flags,
      recover: async () => {}, processNext, log: e => events.push(e) });
    const run = host.run(); await vi.advanceTimersByTimeAsync(0); expect(host.snapshot().ready).toBe(false);
    await vi.advanceTimersByTimeAsync(1000); expect(host.snapshot().ready).toBe(true);
    expect(JSON.stringify(events)).not.toContain("secret"); expect(events.some(e => e.event === "POLL_FAILED")).toBe(true);
    host.stop(); await run;
  });
  it("shutdown is bounded when a dependency does not settle", async () => {
    vi.useFakeTimers(); const host = new MedicalMotionWorkerHost({ ...config(), shutdownMs: 1000 }, {
      preflight: async () => flags, recover: async () => {}, processNext: () => new Promise(() => {}) });
    const run = host.run(); await vi.advanceTimersByTimeAsync(0); host.stop(); await vi.advanceTimersByTimeAsync(1000);
    expect(await run).toEqual({ settled: false, startupFailed: false });
  });
  it("configured concurrency two never schedules a third active operation", async () => {
    vi.useFakeTimers(); let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve; });
    const processNext = vi.fn(async () => { await pending; return true; });
    const host = new MedicalMotionWorkerHost({ ...config(), concurrency: 2, pollBatch: 10 }, { preflight: async () => flags, recover: async () => {}, processNext });
    const run = host.run(); await vi.advanceTimersByTimeAsync(1000); expect(processNext).toHaveBeenCalledTimes(2);
    host.stop(); release(); await run; expect(processNext).toHaveBeenCalledTimes(2);
  });
  it("cannot be started twice and tolerates a failed log sink", async () => {
    const host = new MedicalMotionWorkerHost(config(), { preflight: async () => ({ ...flags, dbReachable: false }), recover: async () => {}, processNext: async () => false, log: () => { throw Error(); } });
    await host.run(); await expect(host.run()).rejects.toThrow("WORKER_ALREADY_STARTED");
  });
});
