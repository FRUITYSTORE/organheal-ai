import { it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DurableBackgroundJob } from "../lib/jobs/background-job-worker.repository";
import type { MedicalMotionCompositionService } from "../lib/medical-motion/composition/service";
import { createCompositionJobRuntime } from "../lib/medical-motion/composition/job-runtime";
import { timelineFixture } from "./helpers/timeline-fixture";
const execute = vi.hoisted(() => vi.fn());
vi.mock("../lib/medical-motion/composition/operation", () => ({ executeOwnedComposition: execute }));
beforeEach(() => { execute.mockReset(); });
function fixture() {
  const { content } = timelineFixture(), id = randomUUID(), jobId = randomUUID();
  const row = { id, job_id: jobId, user_id: content.userId, content, created_at: new Date().toISOString() };
  const rpc = vi.fn(async (name: string) => ({ data: name === "cancel_motion_personalization" ? true : [row], error: null }));
  const runtime = createCompositionJobRuntime({ rpc } as unknown as SupabaseClient, {} as MedicalMotionCompositionService,
    { concurrency: 1, signal: new AbortController().signal });
  const job = { id: jobId, userId: content.userId, type: "medical-motion-compose", status: "running", attemptToken: randomUUID(),
    payload: { approvedPersonalizationSpecId: id, compositionVersion: "2" } } as DurableBackgroundJob;
  return { runtime, job, row, rpc, content };
}
it("dispatches durable V2 through the existing owned composition operation", async () => {
  const f = fixture(); execute.mockResolvedValue({ outcome: "applied" });
  expect(await f.runtime.dispatcher.dispatch(f.job)).toEqual({ disposition: "already-finalized" });
  expect(execute).toHaveBeenCalledTimes(1);
  expect(execute.mock.calls[0][2]).toBe(f.job);
  expect(execute.mock.calls[0][3]).toBe(f.content.segments[0].baseJobId);
  expect(execute.mock.calls[0][4]).toEqual(f.content.specification);
});
it("rejects a durable spec bound to another job before execution", async () => {
  const f = fixture(); f.row.job_id = randomUUID();
  expect(await f.runtime.dispatcher.dispatch(f.job)).toEqual({ disposition: "fail", errorCode: "COMPOSITION_SPEC_JOB_MISMATCH" });
  expect(execute).not.toHaveBeenCalled();
});
it("rejects extra V2 payload fields before reading or executing", async () => {
  const f = fixture();
  const payload = f.job.payload;
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) throw Error("INVALID_TEST_PAYLOAD");
  f.job.payload = { ...payload, untrusted: true };
  expect(await f.runtime.dispatcher.dispatch(f.job)).toEqual({ disposition: "fail", errorCode: "COMPOSITION_APPROVED_SPEC_UNAVAILABLE" });
  expect(f.rpc).not.toHaveBeenCalled(); expect(execute).not.toHaveBeenCalled();
});
it("owner-scoped V2 cancellation aborts the running owned operation", async () => {
  const f = fixture(); let started!: () => void;
  const ready = new Promise<void>(resolve => { started = resolve; });
  execute.mockImplementation(async (...args) => { const signal = args[5] as AbortSignal; started();
    await new Promise<void>(resolve => signal.addEventListener("abort", () => resolve(), { once: true }));
    return { outcome: "ownership-lost" }; });
  const running = f.runtime.dispatcher.dispatch(f.job); await ready;
  expect(await f.runtime.cancel(f.row.id, f.content.userId)).toBe(true);
  expect(await running).toEqual({ disposition: "ownership-lost" });
  expect(f.rpc).toHaveBeenCalledWith("cancel_motion_personalization", { p_spec_id: f.row.id, p_user_id: f.content.userId });
});
