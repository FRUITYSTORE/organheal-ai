import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, beforeAll, beforeEach, afterEach, it, expect, vi } from "vitest";
import * as childProcess from "node:child_process";
import * as modules from "../../lib/medical-motion/organ-modules";
import { compositionSchema } from "../helpers/composition-postgres";
import { compositionRuntime } from "../helpers/composition-media";
import { cleanupArtifactOwner } from "../helpers/medical-motion-artifacts";
import { sql } from "../helpers/medical-motion-postgres";
import { client } from "../helpers/medical-motion-rpc";
import { contextContent } from "../helpers/medical-motion-context";
import { FileArtifactStorage } from "../helpers/private-artifact-storage";
import { withTestCacheAnatomy } from "../helpers/cache-anatomy-fixture";
import { compositionSpecification } from "../helpers/composition-scene";
import { MedicalMotionJobRepository } from "../../lib/medical-motion/job.repository";
import { createMedicalMotionArtifactRuntime } from "../../lib/medical-motion/artifacts/runtime";
import { BackgroundJobWorkerRepository } from "../../lib/jobs/background-job-worker.repository";
import { MedicalMotionCompositionService } from "../../lib/medical-motion/composition/service";
import { executeOwnedComposition } from "../../lib/medical-motion/composition/operation";
import { CompositionMetrics } from "../../lib/medical-motion/composition/metrics";
import { inspectMedia } from "../../lib/medical-motion/composition/ffmpeg-runtime";
import { isolatedStorageClient } from "../../lib/medical-motion/worker/entry";
import { MEDICAL_MOTION_BUCKET, SupabasePrivateArtifactStorage, type PrivateArtifactStorage } from "../../lib/medical-motion/artifacts/storage";
import { BackgroundJobResultRepository } from "../../lib/jobs/background-job-result.repository";

vi.mock("node:child_process", async original => {
  const actual = await original<typeof childProcess>(); return { ...actual, spawn: vi.fn(actual.spawn) };
});
describe("real Blender + FFmpeg + isolated PostgreSQL durable personalization", () => {
  let owner: string, root: string;
  let cloud: ReturnType<typeof isolatedStorageClient> | undefined;
  const committed = new Set<string>(), pending = new Set<string>();
  beforeAll(compositionSchema);
  beforeEach(async () => {
    owner = randomUUID(); await sql(`insert into auth.users(id) values('${owner}');`);
    root = await mkdtemp(path.join(tmpdir(), "organheal-composition-pipeline-"));
    vi.stubEnv("MEDICAL_MOTION_OUTPUT_ROOT", path.join(root, "render-output"));
    vi.spyOn(modules, "getOrganModule").mockReturnValue(withTestCacheAnatomy());
    vi.stubEnv("MEDICAL_MOTION_RENDER_SCRIPT", path.resolve("tests/fixtures/medical-motion-handler-smoke.py"));
  });
  afterEach(async () => {
    if (pending.size) throw Error("AMBIGUOUS_COMPOSITION_TEST_OBJECT_PRESERVED");
    if (cloud) for (const id of committed) {
      const deletion = await cloud.storage.from(MEDICAL_MOTION_BUCKET).remove([id]);
      if (deletion.error || await new SupabasePrivateArtifactStorage(cloud).read(id)) throw Error("COMPOSITION_TEST_CLEANUP_NOT_CONFIRMED");
    }
    cloud = undefined; committed.clear();
    vi.restoreAllMocks(); vi.unstubAllEnvs(); await cleanupArtifactOwner(owner);
    if (path.dirname(root) === tmpdir() && path.basename(root).startsWith("organheal-composition-pipeline-")) await rm(root, { recursive: true, force: true });
  });
  const signal = () => new AbortController().signal;
  async function prepared(storage: PrivateArtifactStorage = new FileArtifactStorage(root)) {
    const runtime = createMedicalMotionArtifactRuntime(client, { mode: "development", reuse: true }, storage);
    const jobs = new MedicalMotionJobRepository(client), attempts = new BackgroundJobWorkerRepository(client, ["medical-motion-render"]);
    const queued = await jobs.enqueue(owner, randomUUID(), contextContent(), 0); await runtime.worker.processById(queued.jobId);
    const base = (await runtime.artifacts.retrieval(queued.jobId, owner))!;
    expect(base, "BASE_TEST_NOT_PUBLISHED").toBeDefined();
    const final = (await attempts.claimById((await jobs.enqueue(owner, randomUUID(), contextContent(), 0)).jobId))!;
    const spec = compositionSpecification(); spec.baseArtifactId = base.id;
    spec.textOverlays[0] = { ...spec.textOverlays[0], text: "TEST 123", start: 0, end: 0.06 };
    const ffmpeg = await compositionRuntime(root), metrics = new CompositionMetrics();
    const service = new MedicalMotionCompositionService(client, runtime.artifacts, storage, ffmpeg, "development", undefined, metrics.composition);
    return { runtime, base, baseJob: queued.jobId, final, spec, service, metrics, attempts, storage };
  }
  it("one Blender base, two different finals, repeated languages/profiles and fenced publication", async () => {
    const metrics = new CompositionMetrics(), storage = new FileArtifactStorage(root);
    const baseRuntime = createMedicalMotionArtifactRuntime(client, { mode: "development", reuse: true, observeReuse: metrics.reuse }, storage);
    const jobs = new MedicalMotionJobRepository(client), attempts = new BackgroundJobWorkerRepository(client, ["medical-motion-render"]);
    const first = await jobs.enqueue(owner, randomUUID(), contextContent(), 0);
    await baseRuntime.worker.processById(first.jobId);
    const base = (await baseRuntime.artifacts.retrieval(first.jobId, owner))!;
    expect(base.persisted).toBe(true); const before = await storage.read(base.id);
    const ffmpeg = await compositionRuntime(root);
    const service = new MedicalMotionCompositionService(client, baseRuntime.artifacts, storage, ffmpeg, "development", undefined,
      metrics.composition, ["text-value", "subtitle", "voice-segment", "chart"]);
    const finalIds: string[] = [], milliseconds: number[] = [];
    for (let i = 0; i < 5; i++) {
      let baseJobId = first.jobId;
      if (i === 1) {
        const nextBase = await jobs.enqueue(owner, randomUUID(), contextContent(), 0);
        await baseRuntime.worker.processById(nextBase.jobId); baseJobId = nextBase.jobId;
        expect((await baseRuntime.artifacts.retrieval(baseJobId, owner))?.id).toBe(base.id);
      }
      const queued = await jobs.enqueue(owner, randomUUID(), contextContent(), 0);
      const claimed = (await attempts.claimById(queued.jobId))!;
      const spec = compositionSpecification(); spec.baseArtifactId = base.id; spec.language = i % 2 ? "ar" : "en";
      // Existing Blender smoke deliberately contains only two frames; don't claim a five-second render.
      spec.textOverlays[0] = { ...spec.textOverlays[0], start: 0, end: 0.06, text: i % 2 ? `شرح تجريبي ${i}` : `TEST value ${i}` };
      spec.numericOverlays = [{ slot: "text-value", start: 0, end: 0.06, value: 100 + i, unit: "TEST-unit" }];
      if (i === 4) spec.chartOverlays = [{ slot: "chart", start: 0, end: 0.06, kind: "trend", values: [1, 2, 3],
        minimum: 0, maximum: 5, label: "TEST", interpretation: "descriptive-only" }];
      spec.outputProfile.aspectRatio = i === 3 ? "9:16" : i === 4 ? "1:1" : "16:9";
      const started = performance.now(); const result = await executeOwnedComposition(client, service, claimed, baseJobId, spec, signal());
      milliseconds.push(Math.round(performance.now() - started)); expect(result.outcome).toBe("applied");
      finalIds.push(result.artifactId!);
      const final = await baseRuntime.artifacts.retrieval(queued.jobId, owner); expect(final?.id).toBe(result.artifactId);
      expect(await baseRuntime.artifacts.retrieval(queued.jobId, randomUUID())).toBeUndefined();
      if (i === 1) {
        expect(vi.mocked(childProcess.spawn).mock.calls.filter(args => String(args[0]).toLowerCase().includes("blender.exe")).length).toBe(1);
        expect(metrics.snapshot["composition-complete"]).toBe(2); expect(new Set(finalIds).size).toBe(2);
      }
      const media = await storage.read(final!.id); const name = `verify-${i}.mp4`;
      await writeFile(path.join(root, name), media!.bytes);
      expect((await inspectMedia(ffmpeg, name, root, signal())).duration).toBeGreaterThan(0);
    }
    expect(new Set(finalIds).size).toBe(5);
    expect(metrics.snapshot).toMatchObject({ "base-cache-hit": 1, "base-cache-miss": 1, "composition-complete": 5, "composition-failure": 0 });
    expect(vi.mocked(childProcess.spawn).mock.calls.filter(args => String(args[0]).toLowerCase().includes("blender.exe")).length).toBe(1);
    expect((await storage.read(base.id))!.bytes.equals(before!.bytes)).toBe(true);
    expect(await sql(`select count(*) from public.medical_motion_compositions where user_id='${owner}';`)).toBe("5");
    expect(await sql(`select count(*) from public.medical_motion_reuse_keys where artifact_id in(select artifact_id from public.medical_motion_compositions where user_id='${owner}');`)).toBe("0");
    await writeFile(path.join(tmpdir(), "organheal-composition-baseline.json"), JSON.stringify({ blender: 1, compositions: 5,
      finalArtifacts: 5, baseArtifacts: 1, firstPair: { blender: 1, compositions: 2, finalArtifacts: 2 }, milliseconds, metrics: metrics.snapshot }));
  }, 120_000);
  it("lost publication response reconciles identical final without another composition", async () => {
    const p = await prepared(); const original = client.rpc.bind(client); let lost = false;
    const wrapped = { rpc: async (name: string, args: Record<string, unknown>) => {
      const response = await original(name, args);
      if (name === "publish_background_job_result" && !lost) { lost = true; throw Error("TEST_RESPONSE_LOST"); }
      return response;
    } } as unknown as typeof client;
    const result = await executeOwnedComposition(wrapped, p.service, p.final, p.baseJob, p.spec, signal());
    expect(result.outcome).toBe("already-finalized"); expect(p.metrics.snapshot["composition-complete"]).toBe(1);
  }, 120_000);
  it("failed upload never publishes and preserves durable intent", async () => {
    const p = await prepared(); const put = vi.spyOn(p.storage, "put").mockRejectedValue(Error("TEST_UPLOAD_FAILURE"));
    const result = await executeOwnedComposition(client, p.service, p.final, p.baseJob, p.spec, signal());
    expect(result.outcome).toBe("failed"); expect(result.errorCode).toBe("ARTIFACT_STORAGE_UNAVAILABLE");
    expect(await sql(`select count(*) from public.background_job_results where job_id='${p.final.id}';`)).toBe("0");
    expect(await sql(`select count(*) from public.medical_motion_compositions where job_id='${p.final.id}';`)).toBe("1");
    put.mockRestore();
    const before = await sql(`select artifact_id from public.medical_motion_compositions where job_id='${p.final.id}';`);
    await p.attempts.scheduleRetry({ jobId: p.final.id, attemptToken: p.final.attemptToken, errorMessage: "TEST_STORAGE_RESTORED", retryDelayMs: 0 });
    const retry = (await p.attempts.claimById(p.final.id))!;
    const recovered = await executeOwnedComposition(client, p.service, retry, p.baseJob, p.spec, signal());
    expect(recovered.outcome).toBe("applied"); expect(recovered.artifactId).toBe(before);
    expect(p.metrics.snapshot["composition-complete"]).toBe(2);
  }, 120_000);
  it("lost upload response with valid readback succeeds without overwrite", async () => {
    const p = await prepared(), put = p.storage.put.bind(p.storage); let writes = 0;
    vi.spyOn(p.storage, "put").mockImplementation(async (...args) => { writes++; await put(...args); throw Error("TEST_RESPONSE_LOST"); });
    expect((await executeOwnedComposition(client, p.service, p.final, p.baseJob, p.spec, signal())).outcome).toBe("applied");
    expect(writes).toBe(1);
  }, 120_000);
  it("durable persisted final recovers after a new fenced attempt without FFmpeg", async () => {
    const p = await prepared(); const first = await p.service.compose(p.final, p.baseJob, p.spec, signal());
    await p.attempts.scheduleRetry({ jobId: p.final.id, attemptToken: p.final.attemptToken, errorMessage: "TEST_RECOVERY", retryDelayMs: 0 });
    const next = (await p.attempts.claimById(p.final.id))!;
    const result = await executeOwnedComposition(client, p.service, next, p.baseJob, p.spec, signal());
    expect(result.outcome).toBe("applied"); expect(result.artifactId).toBe(first.artifact.id);
    expect(p.metrics.snapshot["composition-complete"]).toBe(1);
    expect((await new BackgroundJobResultRepository(client).publish({ jobId: next.id, attemptToken: p.final.attemptToken,
      manifest: { kind: "artifact", referenceId: first.artifact.id } })).outcome).toBe("ownership-lost");
  }, 120_000);
  it("unavailable myocardium and current patient gate block before reading media", async () => {
    const storage = new FileArtifactStorage(root), runtime = createMedicalMotionArtifactRuntime(client, { mode: "development" }, storage);
    const jobs = new MedicalMotionJobRepository(client), attempts = new BackgroundJobWorkerRepository(client, ["medical-motion-render"]);
    const job = (await attempts.claimById((await jobs.enqueue(owner, randomUUID(), contextContent("myocardialOxygenDemandSupply"), 0)).jobId))!;
    const read = vi.spyOn(storage, "read"), ffmpeg = await compositionRuntime(root);
    for (const mode of ["development", "production"] as const) {
      const service = new MedicalMotionCompositionService(client, runtime.artifacts, storage, ffmpeg, mode);
      await expect(service.compose(job, randomUUID(), compositionSpecification(), signal())).rejects.toThrow("COMPOSITION_INVALID");
    }
    expect(read).not.toHaveBeenCalled();
  }, 60_000);
  it("real isolated Supabase stores final privately using the existing opaque registry", async () => {
    // Exact isolated target guards execute before the first provider request.
    cloud = isolatedStorageClient({ ...process.env, MEDICAL_MOTION_WORKER_ENVIRONMENT: "isolated-test" });
    const provider = new SupabasePrivateArtifactStorage(cloud);
    const storage: PrivateArtifactStorage = { read: provider.read.bind(provider), inspect: provider.inspect.bind(provider),
      put: async (id, bytes, mime) => {
        pending.add(id); await provider.put(id, bytes, mime); const read = await provider.read(id);
        if (!read || read.contentType !== mime || !read.bytes.equals(bytes)) throw Error("AMBIGUOUS_COMPOSITION_TEST_OBJECT_PRESERVED");
        pending.delete(id); committed.add(id);
      } };
    const p = await prepared(storage);
    const result = await executeOwnedComposition(client, p.service, p.final, p.baseJob, p.spec, signal());
    expect(result.outcome).toBe("applied"); expect(committed.size).toBe(2);
    expect((await p.runtime.artifacts.retrieval(p.final.id, owner))?.id).toBe(result.artifactId);
    expect(await p.runtime.artifacts.retrieval(p.final.id, randomUUID())).toBeUndefined();
    expect((await cloud.storage.getBucket(MEDICAL_MOTION_BUCKET)).data?.public).toBe(false);
  }, 120_000);
});
