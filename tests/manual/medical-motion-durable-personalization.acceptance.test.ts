import {installTestOrganModuleResolution} from "../helpers/organ-module-resolution";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, beforeAll, beforeEach, afterEach, it, expect, vi } from "vitest";
import * as childProcess from "node:child_process";
import * as modules from "../../lib/medical-motion/organ-modules";
import * as processes from "../../lib/medical-motion/composition/ffmpeg-runtime";
import { approvedSpecSchema, testHealth } from "../helpers/approved-personalization";
import { compositionRuntime } from "../helpers/composition-media";
import { cleanupArtifactOwner } from "../helpers/medical-motion-artifacts";
import { client } from "../helpers/medical-motion-rpc";
import { sql } from "../helpers/medical-motion-postgres";
import { contextContent } from "../helpers/medical-motion-context";
import { FileArtifactStorage } from "../helpers/private-artifact-storage";
import { withTestCacheAnatomy } from "../helpers/cache-anatomy-fixture";
import { MedicalMotionJobRepository } from "../../lib/medical-motion/job.repository";
import { createMedicalMotionArtifactRuntime } from "../../lib/medical-motion/artifacts/runtime";
import { MedicalMotionCompositionService } from "../../lib/medical-motion/composition/service";
import { TrustedPersonalizationProducer } from "../../lib/medical-motion/composition/producer";
import { ApprovedPersonalizationRepository } from "../../lib/medical-motion/composition/approved-spec.repository";
import { createCompositionJobRuntime } from "../../lib/medical-motion/composition/job-runtime";
import { CompositionMetrics } from "../../lib/medical-motion/composition/metrics";
import { CompositionError } from "../../lib/medical-motion/composition/specification";
import { createIsolatedMotionDatabase } from "../../lib/medical-motion/worker/local-postgres";
import { PersonalizationSchedulingService } from "../../lib/medical-motion/composition/scheduling";
import { isolatedStorageClient } from "../../lib/medical-motion/worker/entry";
import { MEDICAL_MOTION_BUCKET, SupabasePrivateArtifactStorage, type PrivateArtifactStorage } from "../../lib/medical-motion/artifacts/storage";
vi.mock("node:child_process", async original => {
  const actual = await original<typeof childProcess>(); return { ...actual, spawn: vi.fn(actual.spawn) };
});
describe("real durable approved-spec worker / Blender / FFmpeg / PostgreSQL", () => {
  let owners: string[], root: string;
  let cloud: ReturnType<typeof isolatedStorageClient> | undefined;
  const committed = new Set<string>(), pending = new Set<string>();
  beforeAll(approvedSpecSchema);
  beforeEach(async () => {
    owners = [randomUUID(), randomUUID()]; for (const owner of owners) await sql(`insert into auth.users(id) values('${owner}');`);
    root = await mkdtemp(path.join(tmpdir(), "organheal-approved-jobs-"));
    vi.stubEnv("MEDICAL_MOTION_OUTPUT_ROOT", path.join(root, "render-output"));
    vi.stubEnv("MEDICAL_MOTION_RENDER_SCRIPT", path.resolve("tests/fixtures/medical-motion-handler-smoke.py"));
    installTestOrganModuleResolution(withTestCacheAnatomy()).legacy;
  });
  afterEach(async () => {
    if (pending.size) throw Error("AMBIGUOUS_TEST_OBJECT_PRESERVED");
    if (cloud) for (const id of committed) { const removed = await cloud.storage.from(MEDICAL_MOTION_BUCKET).remove([id]);
      if (removed.error || await new SupabasePrivateArtifactStorage(cloud).read(id)) throw Error("TEST_CLEANUP_NOT_CONFIRMED"); }
    cloud = undefined; committed.clear();
    vi.restoreAllMocks(); vi.unstubAllEnvs(); for (const owner of [...owners].reverse()) await cleanupArtifactOwner(owner);
    if (path.dirname(root) === tmpdir() && path.basename(root).startsWith("organheal-approved-jobs-")) await rm(root, { recursive: true, force: true }); });
  const signal = () => new AbortController().signal;
  async function setup(transport = client, storage: PrivateArtifactStorage = new FileArtifactStorage(root)) {
    const metrics = new CompositionMetrics();
    const render = createMedicalMotionArtifactRuntime(transport, { mode: "development", reuse: true, observeReuse: metrics.reuse }, storage);
    const ffmpeg = await compositionRuntime(root), specs = new ApprovedPersonalizationRepository(transport);
    const service = new MedicalMotionCompositionService(transport, render.artifacts, storage, ffmpeg, "development", undefined, metrics.composition);
    const jobs = createCompositionJobRuntime(transport, service, { concurrency: 1, signal: signal() });
    const source = vi.fn(async (owner: string) => testHealth(owner, owner === owners[0] ? 42 : 73));
    const producer = new TrustedPersonalizationProducer(transport, source, "development", storage, ffmpeg);
    async function approve(owner = owners[0], language: "ar" | "en" = "en") {
      const queued = await new MedicalMotionJobRepository(client).enqueue(owner,
        // Stable per-fixture trusted revision avoids a second render job on retry.
        owner, contextContent(), 0);
      await render.worker.processById(queued.jobId);
      const base = (await render.artifacts.retrieval(queued.jobId, owner))!;
      expect(base, "TEST_BASE_REQUIRED").toBeDefined();
      const content = await producer.approve(owner, queued.executionContextId, 0, queued.jobId, base, language,
        { aspectRatio: "16:9", policy: "fit", resolution: "720p" }, signal());
      const approved = await specs.approveAndSchedule(content);
      return { approved, content, base, baseJobId: queued.jobId };
    }
    return { approve, source, storage, metrics, render, specs, service, jobs, ffmpeg, producer };
  }
  async function readyRetry(id: string) { await sql(`update public.background_jobs set available_at=clock_timestamp() where id='${id}' and status='retrying';`); }
  it("A miss, B cross-owner base hit, ar/en finals, repeated A no duplicate FFmpeg through durable workers", async () => {
    const p = await setup(), a = await p.approve(owners[0], "ar"), original = (await p.storage.read(a.base.id))!.bytes;
    const before = performance.now(); expect(await p.jobs.processById(a.approved.jobId)).toBe(true);
    const b = await p.approve(owners[1], "en"); expect(b.base.id).toBe(a.base.id);
    expect(await p.jobs.processById(b.approved.jobId)).toBe(true);
    const repeat = await p.approve(owners[0], "ar"); expect(repeat.approved.id).toBe(a.approved.id);
    expect(await p.jobs.processById(repeat.approved.jobId)).toBe(false);
    const af = (await p.render.artifacts.retrieval(a.approved.jobId, owners[0]))!, bf = (await p.render.artifacts.retrieval(b.approved.jobId, owners[1]))!;
    expect(af.id).not.toBe(bf.id); expect(await p.render.artifacts.retrieval(a.approved.jobId, owners[1])).toBeUndefined();
    expect(await p.render.artifacts.retrieval(b.approved.jobId, owners[0])).toBeUndefined();
    for (const artifact of [af, bf]) {
      const name = `${artifact.id}.mp4`; await writeFile(path.join(root, name), (await p.storage.read(artifact.id))!.bytes);
      expect((await processes.inspectMedia(p.ffmpeg, name, root, signal())).frameCount).toBe(2);
    }
    expect((await p.storage.read(a.base.id))!.bytes.equals(original)).toBe(true);
    expect(p.metrics.snapshot).toMatchObject({ "base-cache-miss": 1, "base-cache-hit": 1, "composition-start": 2, "composition-complete": 2 });
    expect(p.metrics.snapshot.outputBytes).toBeGreaterThan(0);
    expect(p.metrics.snapshot.ffmpegMilliseconds).toBeGreaterThan(0);
    const blender = vi.mocked(childProcess.spawn).mock.calls.filter(args => String(args[0]).toLowerCase().includes("blender.exe")).length;
    expect(blender).toBe(1); expect(p.jobs.metrics()).toMatchObject({ executions: 2, published: 2 });
    expect(await sql("select count(*) from public.medical_motion_approved_specs;")).toBe("2");
    await writeFile(path.join(tmpdir(), "organheal-durable-personalization-baseline.json"), JSON.stringify({ blender, compositions: 2,
      finalArtifacts: 2, approvedSpecs: 2, repeatComposition: 0, durationMs: Math.round(performance.now() - before), metrics: p.metrics.snapshot }));
  }, 120_000);
  it("restart after approval/job creation uses durable snapshot without source regeneration", async () => {
    const p = await setup(), a = await p.approve(); p.source.mockRejectedValue(Error("SOURCE_CHANGED_AFTER_APPROVAL"));
    const restarted = createCompositionJobRuntime(client, p.service, { concurrency: 1, signal: signal() });
    expect(await restarted.processById(a.approved.jobId)).toBe(true); expect(p.source).toHaveBeenCalledTimes(1);
    expect((await p.specs.read(a.approved.id, owners[0])).specification).toEqual(a.content.specification);
    expect(await p.render.artifacts.retrieval(a.approved.jobId, owners[0])).toBeDefined();
  }, 120_000);
  it("crash during FFmpeg retries original durable spec under new ownership", async () => {
    const p = await setup(), a = await p.approve(), actual = processes.executeMediaProcess; let fault = true;
    const spy = vi.spyOn(processes, "executeMediaProcess").mockImplementation(async (...args) => {
      if (fault && args[1] === "ffmpeg" && args[2].at(-1) === "personalized.mp4") { fault = false; throw new CompositionError("COMPOSITION_PROCESS_FAILED"); }
      return actual(...args);
    });
    expect(await p.jobs.processById(a.approved.jobId)).toBe(true);
    expect(await sql(`select status from public.background_jobs where id='${a.approved.jobId}';`)).toBe("retrying");
    expect(await p.render.artifacts.retrieval(a.approved.jobId, owners[0])).toBeUndefined();
    spy.mockRestore(); await readyRetry(a.approved.jobId);
    expect(await createCompositionJobRuntime(client, p.service, { concurrency: 1, signal: signal() }).processById(a.approved.jobId)).toBe(true);
    expect(await p.render.artifacts.retrieval(a.approved.jobId, owners[0])).toBeDefined(); expect(p.source).toHaveBeenCalledTimes(1);
  }, 120_000);
  it("crash after final upload before publication recovers persisted final without another FFmpeg", async () => {
    const original = client.rpc.bind(client); let blocked = false;
    const transport = { rpc: async (name: string, args: Record<string, unknown>) => {
      if (blocked && name === "publish_background_job_result") throw Error("TEST_CRASH_BEFORE_PUBLICATION");
      return original(name, args);
    } } as unknown as typeof client;
    const p = await setup(transport), a = await p.approve(); blocked = true;
    expect(await p.jobs.processById(a.approved.jobId)).toBe(true);
    expect(await sql(`select count(*) from public.background_job_results where job_id='${a.approved.jobId}';`)).toBe("0");
    const intent = await sql(`select artifact_id from public.medical_motion_compositions where job_id='${a.approved.jobId}';`);
    expect(p.metrics.snapshot["composition-complete"]).toBe(1);
    const duplicates = await Promise.all(Array.from({ length: 4 }, () => p.specs.approveAndSchedule(a.content)));
    expect(duplicates.every(v => v.jobId === a.approved.jobId)).toBe(true);
    blocked = false; await readyRetry(a.approved.jobId);
    expect(await createCompositionJobRuntime(transport, p.service, { concurrency: 1, signal: signal() }).processById(a.approved.jobId)).toBe(true);
    expect((await p.render.artifacts.retrieval(a.approved.jobId, owners[0]))!.id).toBe(intent);
    expect(p.metrics.snapshot["composition-complete"]).toBe(1); expect(p.source).toHaveBeenCalledTimes(1);
  }, 120_000);
  it("publication response loss reconciles through worker without duplicate final", async () => {
    const original = client.rpc.bind(client); let lose = false;
    const transport = { rpc: async (name: string, args: Record<string, unknown>) => {
      const r = await original(name, args); if (lose && name === "publish_background_job_result") { lose = false; throw Error("TEST_RESPONSE_LOST"); } return r;
    } } as unknown as typeof client;
    const p = await setup(transport), a = await p.approve(); lose = true;
    expect(await p.jobs.processById(a.approved.jobId)).toBe(true); expect(await p.jobs.processById(a.approved.jobId)).toBe(false);
    expect(p.metrics.snapshot["composition-complete"]).toBe(1); expect(await p.render.artifacts.retrieval(a.approved.jobId, owners[0])).toBeDefined();
  }, 120_000);
  it("active cancellation terminates actual FFmpeg, revokes DB lease and prevents publication", async () => {
    const p = await setup(), a = await p.approve(), actual = processes.executeMediaProcess; let entered!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const spy = vi.spyOn(processes, "executeMediaProcess").mockImplementation(async (config, executable, args, cwd, abort) => {
      if (executable === "ffmpeg" && args.at(-1) === "personalized.mp4") { entered();
        return actual(config, executable, ["-nostdin", "-hide_banner", "-loglevel", "error", "-re", "-f", "lavfi", "-i", "color=s=64x64:r=24:d=30", "-f", "null", "-"], cwd, abort); }
      return actual(config, executable, args, cwd, abort);
    });
    const task = p.jobs.processById(a.approved.jobId); await started;
    // A separate runtime has no in-memory controller for this attempt: DB control
    // polling must propagate cancellation to the actual executing process.
    const remote = createCompositionJobRuntime(client, p.service, { concurrency: 1, signal: signal() });
    expect(await remote.cancel(a.approved.id, owners[0])).toBe(true); expect(await task).toBe(true); spy.mockRestore();
    expect(await sql(`select status from public.background_jobs where id='${a.approved.jobId}';`)).toBe("cancelled");
    expect(await sql(`select count(*) from public.background_job_results where job_id='${a.approved.jobId}';`)).toBe("0");
    expect(p.jobs.capacity().active).toBe(0); expect(p.jobs.metrics().ownershipLost).toBe(1);
  }, 120_000);
  it("version drift and current anatomy gate reject durable replay without media execution", async () => {
    const p = await setup(), a = await p.approve();
    vi.mocked(modules.getOrganModule).mockReturnValue({ ...withTestCacheAnatomy(), assetVersion: "UNAVAILABLE_TEST_VERSION" });
    expect(await p.jobs.processById(a.approved.jobId)).toBe(true);
    expect(await p.render.artifacts.retrieval(a.approved.jobId, owners[0])).toBeUndefined(); expect(p.metrics.snapshot["composition-start"]).toBe(0);
    expect(await sql(`select status from public.background_jobs where id='${a.approved.jobId}';`)).toBe("failed");
  }, 120_000);
  it("isolated programmatic runtime transport reads/claims/replays the new capability", async () => {
    const db = createIsolatedMotionDatabase(process.env), p = await setup(db.client), a = await p.approve();
    expect(await p.jobs.processById(a.approved.jobId)).toBe(true); expect(await p.render.artifacts.retrieval(a.approved.jobId, owners[0])).toBeDefined();
  }, 120_000);
  it("non-executing scheduler queues base first then durable composition; identical reschedule deduplicates", async () => {
    const p = await setup(), scheduler = new PersonalizationSchedulingService(client, p.render.artifacts, p.producer, "development");
    const profile = { aspectRatio: "16:9" as const, policy: "fit" as const, resolution: "720p" as const };
    const first = await scheduler.schedule(owners[0], owners[0], contextContent(), 0, "en", profile, signal());
    expect(first.disposition).toBe("awaiting-base"); expect(p.source).not.toHaveBeenCalled();
    expect(vi.mocked(childProcess.spawn).mock.calls.filter(args => String(args[0]).toLowerCase().includes("blender.exe"))).toHaveLength(0);
    expect(await p.render.worker.processById(first.baseJobId)).toBe(true);
    const second = await scheduler.schedule(owners[0], owners[0], contextContent(), 0, "en", profile, signal());
    expect(second.disposition).toBe("scheduled"); if (second.disposition !== "scheduled") throw Error();
    expect(await p.jobs.processNext()).toBe(true);
    const duplicate = await scheduler.schedule(owners[0], owners[0], contextContent(), 0, "en", profile, signal());
    expect(duplicate).toEqual(second); expect(await p.jobs.processNext()).toBe(false);
    expect(p.metrics.snapshot["composition-complete"]).toBe(1);
  }, 120_000);
  it("myocardium gate rejects scheduling before health data or FFmpeg can override it", async () => {
    const p = await setup(), scheduler = new PersonalizationSchedulingService(client, p.render.artifacts, p.producer, "development");
    await expect(scheduler.schedule(owners[0], owners[0], contextContent("myocardialOxygenDemandSupply"), 0, "ar",
      { aspectRatio: "16:9", policy: "fit", resolution: "720p" }, signal())).rejects.toThrow("COMPOSITION_INVALID");
    expect(p.source).not.toHaveBeenCalled(); expect(p.metrics.snapshot["composition-start"]).toBe(0);
    expect(await sql("select count(*) from public.medical_motion_approved_specs;")).toBe("0");
  }, 120_000);
  it("real isolated private Storage accepts final from durable compose job and confirms exact object cleanup", async () => {
    cloud = isolatedStorageClient({ ...process.env, MEDICAL_MOTION_WORKER_ENVIRONMENT: "isolated-test" });
    const bucket = await cloud.storage.getBucket(MEDICAL_MOTION_BUCKET);
    expect(bucket.error).toBeNull(); expect(bucket.data?.public).toBe(false);
    const storage = new SupabasePrivateArtifactStorage(cloud);
    const tracked: PrivateArtifactStorage = { read: (id, abort) => storage.read(id, abort), put: async (id, bytes, type) => {
      pending.add(id); await storage.put(id, bytes, type); pending.delete(id); committed.add(id);
    } };
    const p = await setup(client, tracked), a = await p.approve(owners[0], "ar");
    expect(await p.jobs.processById(a.approved.jobId)).toBe(true);
    const final = (await p.render.artifacts.retrieval(a.approved.jobId, owners[0]))!;
    expect(final.id).not.toBe(a.base.id); expect(committed.size).toBe(2);
    expect(await p.render.artifacts.retrieval(a.approved.jobId, owners[1])).toBeUndefined();
    expect((await storage.read(final.id))?.contentType).toBe("video/mp4");
  }, 120_000);
  it("same artifact worker host has opt-in composition capability; default render worker cannot claim it", async () => {
    const p = await setup(), a = await p.approve();
    expect(await p.render.worker.processById(a.approved.jobId)).toBe(false);
    let active = 0;
    const combined = createMedicalMotionArtifactRuntime(client, { mode: "development", reuse: true,
      composition: { runtime: p.ffmpeg, concurrency: 1 } }, p.storage, () => { active++; return () => { active--; }; });
    expect(await combined.worker.processById(a.approved.jobId)).toBe(true);
    expect(active).toBe(0); expect(combined.composition?.metrics().published).toBe(1);
    expect(await combined.artifacts.retrieval(a.approved.jobId, owners[0])).toBeDefined();
  }, 120_000);
});
