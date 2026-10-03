import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { compositionScene } from "./helpers/composition-scene";
import { testHealth } from "./helpers/approved-personalization";
import * as authorization from "../lib/medical-motion/composition/authorization";
import * as inspection from "../lib/medical-motion/composition/base-inspection";
import { TrustedPersonalizationProducer } from "../lib/medical-motion/composition/producer";
import { ApprovedPersonalizationRepository } from "../lib/medical-motion/composition/approved-spec.repository";
import { validateApprovedContent, validateCompositionJobPayload } from "../lib/medical-motion/composition/approved-spec";
import type { PrivateArtifactStorage } from "../lib/medical-motion/artifacts/storage";
import type { FfmpegRuntime } from "../lib/medical-motion/composition/ffmpeg-runtime";
import { createCompositionJobRuntime } from "../lib/medical-motion/composition/job-runtime";
import type { MedicalMotionCompositionService } from "../lib/medical-motion/composition/service";
vi.mock("../lib/medical-motion/composition/authorization", () => ({ prepareCompositionScene: vi.fn() }));
vi.mock("../lib/medical-motion/composition/base-inspection", () => ({ inspectApprovedBase: vi.fn() }));
describe("trusted private structured-source producer", () => {
  const owner = randomUUID(), context = randomUUID(), baseJob = randomUUID();
  const base = { id: randomUUID(), jobId: baseJob, userId: owner, originAttempt: randomUUID(), media: "video" as const,
    byteSize: 123, sha256: "a".repeat(64), persisted: true };
  const client = { rpc: vi.fn() } as unknown as SupabaseClient;
  const signal = () => new AbortController().signal;
  beforeEach(() => { vi.mocked(authorization.prepareCompositionScene).mockResolvedValue({ context: {} as never,
    checked: { ok: true, request: { renderSignature: "b".repeat(64) } } as never, presentation: compositionScene() });
    vi.mocked(inspection.inspectApprovedBase).mockResolvedValue(3); });
  const approve = (health = testHealth(owner), language: "en" | "ar" = "en", abort = signal()) =>
    new TrustedPersonalizationProducer(client, async () => health, "development", {} as PrivateArtifactStorage, {} as FfmpegRuntime)
      .approve(owner, context, 0, baseJob, base, language, { aspectRatio: "16:9", policy: "fit", resolution: "720p" }, abort);
  it.each(["ar", "en"] as const)("produces deterministic immutable %s approved fields, not raw prose", async language => {
    const health = testHealth(owner); health.latestCheckIn!.mood = "RAW_LLM_PROSE";
    const a = await approve(health, language), b = await approve(health, language);
    expect(a).toEqual(b); expect(Object.isFrozen(a.specification)).toBe(true);
    expect(JSON.stringify(a)).not.toContain("RAW_LLM_PROSE");
    expect(a.specification.numericOverlays[0].value).toBe(42); expect(a.source.field).toBe("wellnessScore");
  });
  it.each([NaN, Infinity, -1, 101])("rejects invalid structured score %s", async score => {
    await expect(approve(testHealth(owner, score))).rejects.toThrow();
  });
  it("rejects another source owner", async () => { await expect(approve(testHealth(randomUUID()))).rejects.toThrow("COMPOSITION_INVALID"); });
  it("rejects missing structured evidence", async () => { const h = testHealth(owner); h.latestCheckIn = null; await expect(approve(h)).rejects.toThrow(); });
  it("medical gate failure precedes any health source read", async () => {
    vi.mocked(authorization.prepareCompositionScene).mockRejectedValue(Error("COMPOSITION_INVALID")); const load = vi.fn();
    await expect(new TrustedPersonalizationProducer(client, load, "production", {} as PrivateArtifactStorage, {} as FfmpegRuntime)
      .approve(owner, context, 0, baseJob, base, "en", { aspectRatio: "16:9", policy: "fit", resolution: "720p" }, signal())).rejects.toThrow();
    expect(load).not.toHaveBeenCalled();
  });
  it("cancellation prevents approval", async () => { const c = new AbortController(); c.abort(); await expect(approve(testHealth(owner), "en", c.signal)).rejects.toThrow("COMPOSITION_CANCELLED"); });
  it("copied approval cannot mint a durable job", async () => {
    const a = await approve(); await expect(new ApprovedPersonalizationRepository(client).approveAndSchedule(JSON.parse(JSON.stringify(a)))).rejects.toThrow("COMPOSITION_INVALID");
    expect(client.rpc).not.toHaveBeenCalled();
  });
  it("private identity changes for source revision/value/language", async () => {
    const a = await approve(), value = await approve(testHealth(owner, 43)), ar = await approve(testHealth(owner), "ar");
    expect(new Set([a.logicalIdentity, value.logicalIdentity, ar.logicalIdentity]).size).toBe(3);
  });
  it.each(["schemaVersion", "producerVersion", "compositionVersion", "fingerprint", "baseSha256"])("rejects durable %s drift/tamper", async field => {
    const a = await approve(); expect(() => validateApprovedContent({ ...a, [field]: "unsupported" })).toThrow("COMPOSITION_INVALID");
  });
  it.each([0, 1, 2, 3, 4])("same producer maps whole-body TEST scene %s", async index => {
    vi.mocked(authorization.prepareCompositionScene).mockResolvedValue({ context: {} as never,
      checked: { ok: true, request: { renderSignature: "b".repeat(64) } } as never, presentation: compositionScene(index) });
    expect((await approve()).specification.numericOverlays[0].value).toBe(42);
  });
  it.each([{ labValue: 123 }, { approvedPersonalizationSpecId: randomUUID(), compositionVersion: "2" },
    { approvedPersonalizationSpecId: randomUUID(), compositionVersion: "1", clinical: "private" }])("rejects non-minimal queue payload", value => {
    expect(() => validateCompositionJobPayload(value)).toThrow("COMPOSITION_INVALID");
  });
  it("accepts only IDs/version in queue", () => expect(validateCompositionJobPayload({ approvedPersonalizationSpecId: randomUUID(), compositionVersion: "1" }).compositionVersion).toBe("1"));
  it.each([0, 5, 1.5])("rejects unbounded worker capacity %s", concurrency => {
    expect(() => createCompositionJobRuntime(client, {} as MedicalMotionCompositionService, { concurrency, signal: signal() })).toThrow("INVALID_COMPOSITION_CAPACITY");
  });
});
