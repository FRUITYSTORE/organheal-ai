import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MedicalMotionCompositionService } from "../lib/medical-motion/composition/service";
import { createCompositionJobRuntime } from "../lib/medical-motion/composition/job-runtime";
import { randomUUID } from "node:crypto";
describe("explicit heavy composition worker capacity", () => {
  it("bounds concurrent claims, has no waiting promise queue, and releases capacity", async () => {
    let release!: (value: unknown) => void;
    const rpc = vi.fn(() => new Promise(resolve => { release = resolve; }));
    const runtime = createCompositionJobRuntime({ rpc } as unknown as SupabaseClient, {} as MedicalMotionCompositionService,
      { concurrency: 1, signal: new AbortController().signal });
    const first = runtime.processNext(); await Promise.resolve();
    expect(runtime.capacity().active).toBe(1); expect(await runtime.processNext()).toBe(false); expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0]).toEqual(["claim_next_background_job", { p_allowed_job_types: ["medical-motion-compose"] }]);
    release({ data: [], error: null }); expect(await first).toBe(false); expect(runtime.capacity().active).toBe(0);
  });
  it("shutdown abort prevents new claims", async () => {
    const controller = new AbortController(); controller.abort(); const rpc = vi.fn();
    const runtime = createCompositionJobRuntime({ rpc } as unknown as SupabaseClient, {} as MedicalMotionCompositionService,
      { concurrency: 1, signal: controller.signal });
    expect(await runtime.processById(randomUUID())).toBe(false); expect(rpc).not.toHaveBeenCalled();
  });
  it("claim transport failure releases its bounded slot", async () => {
    const rpc = vi.fn(async () => { throw Error("UNSAFE_PROVIDER_DETAIL"); });
    const runtime = createCompositionJobRuntime({ rpc } as unknown as SupabaseClient, {} as MedicalMotionCompositionService,
      { concurrency: 2, signal: new AbortController().signal });
    await expect(runtime.processNext()).rejects.toThrow(); expect(runtime.capacity().active).toBe(0);
    expect(Object.keys(runtime.metrics())).toEqual(["executions", "published", "ownershipLost", "failures"]);
  });
});
