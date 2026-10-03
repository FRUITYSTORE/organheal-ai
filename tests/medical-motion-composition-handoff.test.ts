import { randomUUID, createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import { MedicalMotionArtifactService } from "../lib/medical-motion/artifacts/service";
import { ArtifactError, type ArtifactRecord, type MedicalMotionArtifactRepository } from "../lib/medical-motion/artifacts/repository";
import { createArtifactOwnership, discardArtifact, registerComposedAudio, type ArtifactOwnership } from "../lib/medical-motion/render/artifact-output";
import { recordCandidateOwnership } from "../lib/medical-motion/render/execution-resources";
import type { DurableBackgroundJob } from "../lib/jobs/background-job-worker.repository";
import type { LocalArtifactCandidate } from "../lib/jobs/handlers/medical-motion-render.handler";
import { FileArtifactStorage } from "./helpers/private-artifact-storage";
import { mp4Fixture } from "./fixtures/medical-motion-artifact";
import { CompositionMetrics } from "../lib/medical-motion/composition/metrics";
describe("existing artifact handoff for private composition recovery", () => {
  let root: string, owner: ArtifactOwnership, job: DurableBackgroundJob, candidate: LocalArtifactCandidate, record: ArtifactRecord;
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "organheal-composition-handoff-")); vi.stubEnv("MEDICAL_MOTION_OUTPUT_ROOT", path.join(root, "output"));
    job = { id: randomUUID(), userId: randomUUID(), attemptToken: randomUUID(), type: "medical-motion-render" } as DurableBackgroundJob;
    owner = await createArtifactOwnership("final.mp4", "video"); const bytes = mp4Fixture(); await writeFile(owner.outputPath, bytes);
    candidate = Object.freeze({ localPath: owner.outputPath, media: "video", executionSeconds: 1, discard: () => discardArtifact(owner) });
    recordCandidateOwnership(candidate, owner, { width: 1920, height: 1080 }, { jobId: job.id, userId: job.userId, attemptToken: job.attemptToken });
    record = { id: randomUUID(), userId: job.userId, jobId: job.id, originAttempt: randomUUID(), media: "video",
      byteSize: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), persisted: false };
  });
  afterEach(async () => { vi.unstubAllEnvs(); if (owner) await discardArtifact(owner);
    if (root && path.dirname(root) === tmpdir() && path.basename(root).startsWith("organheal-composition-handoff-")) await rm(root, { recursive: true, force: true }); });
  function service(value = record) {
    const repository = { list: vi.fn(async () => [value]), reserve: vi.fn(), persist: vi.fn(async () => ({ ...value, persisted: true })) };
    const storage = new FileArtifactStorage(root);
    return { repository, storage, service: new MedicalMotionArtifactService(repository as unknown as MedicalMotionArtifactRepository, storage) };
  }
  it("new attempt reproduces original immutable intent and uses the current fenced persist", async () => {
    const s = service(); const final = await s.service.handoff(job, candidate, new AbortController().signal, record.id);
    expect(final.id).toBe(record.id); expect(s.repository.reserve).not.toHaveBeenCalled();
    expect(s.repository.persist).toHaveBeenCalledWith(job, record.id); expect(s.storage.writes).toBe(1);
  });
  it.each(["owner", "job", "sha", "size", "media", "missing"])("rejects %s mismatch before storage write", async kind => {
    const other = { ...record };
    if (kind === "owner") other.userId = randomUUID();
    if (kind === "job") other.jobId = randomUUID();
    if (kind === "sha") other.sha256 = "a".repeat(64);
    if (kind === "size") other.byteSize++;
    if (kind === "media") other.media = "still";
    const s = service(other);
    await expect(s.service.handoff(job, candidate, new AbortController().signal, kind === "missing" ? randomUUID() : record.id)).rejects.toThrow("ARTIFACT_CONFLICT");
    expect(s.repository.reserve).not.toHaveBeenCalled(); expect(s.storage.writes).toBe(0);
  });
  it("lost lease during current fenced list cannot upload", async () => {
    const s = service(); s.repository.list.mockRejectedValue(new ArtifactError("ARTIFACT_OWNERSHIP_LOST"));
    await expect(s.service.handoff(job, candidate, new AbortController().signal, record.id)).rejects.toThrow("ARTIFACT_OWNERSHIP_LOST");
    expect(s.storage.writes).toBe(0);
  });
  it("invalid reserved UUID never silently allocates another artifact", async () => {
    const s = service(); await expect(s.service.handoff(job, candidate, new AbortController().signal, "")).rejects.toThrow("ARTIFACT_INVALID");
    expect(s.repository.reserve).not.toHaveBeenCalled(); expect(s.storage.writes).toBe(0);
  });
  it("copied filesystem ownership cannot enable audio validation", () => {
    expect(() => registerComposedAudio({ ...owner })).toThrow("Invalid composition ownership.");
    expect(() => registerComposedAudio(owner)).not.toThrow();
  });
  it("metrics contain fixed counters and no patient/fingerprint dimensions", () => {
    const metrics = new CompositionMetrics(); metrics.reuse({ event: "MEDICAL_MOTION_CACHE", disposition: "CACHE_HIT" });
    metrics.composition("composition-complete"); expect(metrics.snapshot["Blender-avoided"]).toBe(1);
    expect(metrics.snapshot["composition-complete"]).toBe(1); expect(Object.isFrozen(metrics.snapshot)).toBe(true);
    expect(JSON.stringify(metrics.snapshot)).not.toContain(record.id);
  });
  it("aggregates bounded media measurements without accepting malformed telemetry", () => {
    const metrics = new CompositionMetrics();
    metrics.reuse({ event: "MEDICAL_MOTION_CACHE", disposition: "RENDER_CREATED" });
    metrics.composition("composition-complete", { ffmpegMilliseconds: 12, outputBytes: 100 });
    metrics.composition("composition-complete", { ffmpegMilliseconds: NaN, outputBytes: 100 });
    metrics.composition("composition-start", { ffmpegMilliseconds: 99, outputBytes: 100 });
    metrics.composition("composition-complete", { ffmpegMilliseconds: 12, outputBytes: 67108865 });
    expect(metrics.snapshot).toMatchObject({ "base-render-created": 1, ffmpegMilliseconds: 12, outputBytes: 100 });
  });
});
