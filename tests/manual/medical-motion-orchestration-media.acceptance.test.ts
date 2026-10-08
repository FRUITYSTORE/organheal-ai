import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { orchestrationSchema, orchestrationFixture, client } from "../helpers/orchestration";
import { compositionRuntime } from "../helpers/composition-media";
import { cleanupArtifactOwner } from "../helpers/medical-motion-artifacts";
import { sql } from "../helpers/medical-motion-postgres";
import { FileArtifactStorage } from "../helpers/private-artifact-storage";
import { MedicalMotionExecutionContextRepository } from "../../lib/medical-motion/execution-context.repository";
import { MedicalMotionArtifactRepository } from "../../lib/medical-motion/artifacts/repository";
import { MedicalMotionArtifactService } from "../../lib/medical-motion/artifacts/service";
import { ReusableArtifactRepository, reusableArtifactIdentity } from "../../lib/medical-motion/artifacts/reuse";
import { BackgroundJobWorkerRepository } from "../../lib/jobs/background-job-worker.repository";
import { BackgroundJobResultRepository } from "../../lib/jobs/background-job-result.repository";
import { TrustedMultiSceneOrchestrationService } from "../../lib/medical-motion/orchestration/service";
import { SceneSequenceRegistry } from "../../lib/medical-motion/orchestration/sequence";
import { TrustedTimelineProducer } from "../../lib/medical-motion/composition/timeline-producer";
import { MedicalMotionCompositionService } from "../../lib/medical-motion/composition/service";
import { createCompositionJobRuntime } from "../../lib/medical-motion/composition/job-runtime";
import { prepareCompositionScene } from "../../lib/medical-motion/composition/authorization";
import { createArtifactOwnership, discardArtifact } from "../../lib/medical-motion/render/artifact-output";
import { recordCandidateOwnership } from "../../lib/medical-motion/render/execution-resources";
import type { LocalArtifactCandidate } from "../../lib/jobs/handlers/medical-motion-render.handler";
import { executeMediaProcess, inspectMedia } from "../../lib/medical-motion/composition/ffmpeg-runtime";

// Only the clinical scene authorization boundary is replaced by compiler-issued,
// explicitly hypothetical test profiles. All workflow, SQL, ledger, media,
// storage readback, publication and producer/compositor code is real.
vi.mock("../../lib/medical-motion/composition/authorization", () => ({ prepareCompositionScene: vi.fn() }));

describe("REAL isolated internal multi-scene orchestration (synthetic media only)", () => {
 let f: Awaited<ReturnType<typeof orchestrationFixture>>, root: string;
 beforeAll(orchestrationSchema);
 afterEach(async () => {
  vi.mocked(prepareCompositionScene).mockReset(); vi.unstubAllEnvs();
  if (f) await cleanupArtifactOwner(f.owner);
  // Keep only synthetic media/evidence in TEMP for owner inspection.
 });
 it.each([false, true])("durable real-media workflow; invalidate before publication=%s", async invalidate => {
  f = await orchestrationFixture();
  root = await mkdtemp(path.join(tmpdir(), "organheal-mm-prod-4c-acceptance-"));
  const storageRoot = path.join(root, "private-objects"); await mkdir(storageRoot, { mode: 0o700 });
  vi.stubEnv("MEDICAL_MOTION_OUTPUT_ROOT", path.join(root, "owned-media"));
  const runtime = await compositionRuntime(root);
  const definition = { ...f.definition, transitions: [{ boundaryIndex: 0, kind: "fade-through-neutral" as const, duration: .4 }] };
  const sequences = new SceneSequenceRegistry([definition]);
  const selection = sequences.resolve(definition.sequenceId, definition.sequenceVersion, f.owner, f.contextId);
  vi.mocked(prepareCompositionScene).mockImplementation(async (_client, owner, contextId, index) => {
   const context = await new MedicalMotionExecutionContextRepository(client, f.profiles).read(contextId, owner);
   if (contextId !== f.contextId || owner !== f.owner || !f.scenes[index]) throw Error("TEST_SCENE_NOT_AUTHORIZED");
   return { context, presentation: f.scenes[index], checked: { ok: true, request: { renderSignature: f.segments[index].renderSignature } } } as unknown as Awaited<ReturnType<typeof prepareCompositionScene>>;
  });
  const artifacts = new MedicalMotionArtifactService(new MedicalMotionArtifactRepository(client), new FileArtifactStorage(storageRoot));
  const restart = () => {
   const storage = new FileArtifactStorage(storageRoot);
   const freshArtifacts = new MedicalMotionArtifactService(new MedicalMotionArtifactRepository(client), storage);
   return new TrustedMultiSceneOrchestrationService(client, freshArtifacts,
    new TrustedTimelineProducer(client, freshArtifacts, storage, runtime), sequences, f.profiles);
  };
  const signal = () => new AbortController().signal;
  const checkpoints: Record<string, unknown>[] = [];
  const counts = () => sql(`select (select count(*) from public.medical_motion_orchestrations where user_id='${f.owner}'),
   (select count(*) from public.background_jobs where user_id='${f.owner}' and job_type='medical-motion-render'),
   (select count(*) from public.medical_motion_approved_specs where user_id='${f.owner}'),
   (select count(*) from public.background_jobs where user_id='${f.owner}' and job_type='medical-motion-compose'),
   (select count(*) from public.medical_motion_artifacts where user_id='${f.owner}');`);
  const checkpoint = async (stage: string, expected: string) => {
   const row = await restart().read(f.owner, f.request);
   expect(await counts()).toBe(expected); checkpoints.push({ stage, status: row.status, counts: expected, baseJobIds: row.base_job_ids });
   return row;
  };
  expect((await restart().create(f.owner, f.request, selection, "en", "16:9")).status).toBe("queued");
  await checkpoint("A: record created before advancement", "1|1|0|0|0");
  await restart().advancePending(signal());
  let row = await checkpoint("A: restarted and mapped bases", "1|2|0|0|0");
  const baseJobs = row.base_job_ids, baseArtifacts: string[] = [], reuseDisposition: string[] = [];
  const worker = new BackgroundJobWorkerRepository(client, ["medical-motion-render"]);
  for (let i = 0; i < 2; i++) {
   const job = (await worker.claimById(baseJobs[i]))!; expect(job).toBeDefined();
   const identity = reusableArtifactIdentity(f.scenes[i], f.segments[i].renderSignature, "video")!;
   const reuse = new ReusableArtifactRepository(client), reservation = await reuse.operation(job, "reserve", identity);
   reuseDisposition.push(reservation.outcome);
   const owner = await createArtifactOwnership(`base-${i}.mp4`, "video");
   // Synthetic candidate bookkeeping; this fixture does not assert render latency.
   const candidate = { localPath: owner.outputPath, media: "video" as const, executionSeconds: 0,
    discard: () => discardArtifact(owner) } satisfies LocalArtifactCandidate;
   recordCandidateOwnership(candidate, owner, { width: 128, height: 128 }, { jobId: job.id, userId: job.userId, attemptToken: job.attemptToken });
   try {
    await executeMediaProcess(runtime, "ffmpeg", ["-nostdin", "-hide_banner", "-loglevel", "error", "-n", "-f", "lavfi", "-i",
     `color=c=${i ? "blue" : "red"}:s=128x128:r=25:d=3`, "-c:v", "libx264", "-threads", "1", "-pix_fmt", "yuv420p", "-an", owner.outputPath], owner.directory, signal());
    const artifact = await artifacts.handoff(job, candidate, signal()); baseArtifacts.push(artifact.id);
    await reuse.operation(job, "ready", identity, reservation.epoch, artifact.id);
    expect((await new BackgroundJobResultRepository(client).publish({ jobId: job.id, attemptToken: job.attemptToken,
     manifest: { kind: "artifact", referenceId: artifact.id } })).outcome).toBe("applied");
   } finally { await candidate.discard(); }
   if (i === 0) {
    await restart().advancePending(signal()); await checkpoint("B: partial base completion after restart", "1|2|0|0|1");
   }
  }
  await checkpoint("C: both bases published before approval", "1|2|0|0|2");
  await restart().advancePending(signal());
  row = await checkpoint("D: V2 approved and compose scheduled", "1|2|1|1|2");
  expect(row.status).toBe("composing"); expect(row.spec_id).not.toBeNull(); expect(row.compose_job_id).not.toBeNull();
  await restart().advancePending(signal()); expect((await restart().read(f.owner, f.request)).spec_id).toBe(row.spec_id);
  const freshStorage = new FileArtifactStorage(storageRoot), freshArtifacts = new MedicalMotionArtifactService(new MedicalMotionArtifactRepository(client), freshStorage);
  const compositionService = new MedicalMotionCompositionService(client, freshArtifacts, freshStorage, runtime, "development");
  if (invalidate) {
   const claimed = (await new BackgroundJobWorkerRepository(client, ["medical-motion-compose"]).claimById(row.compose_job_id!))!;
   const specification = { compositionVersion: "2", baseAudio: "silence", language: "en", outputProfile: { aspectRatio: "16:9", resolution: "720p", policy: "fit" },
    textOverlays: [], numericOverlays: [], chartOverlays: [], audioSegments: [], dynamicNarrationSlots: [] };
   const composed = await compositionService.compose(claimed, baseJobs[0], specification, signal());
   expect(composed.artifact.persisted).toBe(true);
   await sql(`update public.medical_motion_reuse_keys set epoch=epoch+1 where producer_job_id='${baseJobs[0]}';`);
   // Both the service's final revalidation and the actual database publication
   // trigger reject the stale dependency, even though private media is persisted.
   await expect(compositionService.assertCurrent(claimed, baseJobs[0], specification,
    { artifactId: composed.artifact.id, fingerprint: composed.fingerprint }, signal())).rejects.toThrow();
   expect(await sql(`select status='running' and attempt_token='${claimed.attemptToken}'::uuid and lease_expires_at>clock_timestamp() from public.background_jobs where id='${claimed.id}';`)).toBe("t");
   const rejected = await client.rpc("publish_background_job_result", { p_job_id: claimed.id, p_attempt_token: claimed.attemptToken,
    p_result_kind: "artifact", p_reference_id: composed.artifact.id });
   expect(rejected.error?.code).toBe("OM409");
   await expect(new BackgroundJobResultRepository(client).publish({ jobId: claimed.id, attemptToken: claimed.attemptToken,
    manifest: { kind: "artifact", referenceId: composed.artifact.id } })).rejects.toThrow();
   expect(await freshArtifacts.retrieval(claimed.id, f.owner)).toBeUndefined();
   expect(await sql(`select count(*) from public.background_job_results where job_id='${claimed.id}';`)).toBe("0");
   await restart().advancePending(signal());
   const failed = await restart().read(f.owner, f.request);
   expect(failed.status).toBe("failed"); expect(failed.final_artifact_id).toBeNull();
   await restart().advancePending(signal()); expect(await restart().read(f.owner, f.request)).toEqual(failed);
   expect(await counts()).toBe("1|2|1|1|3");
   expect(await sql(`select count(*) from public.background_jobs where user_id='${f.owner}' and job_type='medical-motion-render' and status='completed';`)).toBe("2");
   expect(await sql(`select count(*) from public.medical_motion_artifacts where user_id='${f.owner}' and persisted_at is not null;`)).toBe("3");
   await writeFile(path.join(root, "negative-acceptance-evidence.json"), JSON.stringify({ orchestrationId: f.request, executionContextId: f.contextId,
    baseJobIds: baseJobs, baseArtifactIds: baseArtifacts, timelineSpecId: row.spec_id, composeJobId: row.compose_job_id,
    persistedUnpublishedArtifactId: composed.artifact.id, status: failed.status, finalArtifactId: failed.final_artifact_id,
    serviceRevalidationRejected: true, databasePublicationRejected: true, publishedResults: 0, baseJobsPreserved: 2,
    counts: "1|2|1|1|3", restartStable: true, productionConnection: false }, null, 2), { mode: 0o600 });
   return;
  }
  const composition = createCompositionJobRuntime(client, compositionService,
   { concurrency: 1, signal: signal() });
  expect(await composition.processById(row.compose_job_id!)).toBe(true);
  expect(composition.metrics()).toMatchObject({ executions: 1, published: 1, failures: 0 });
  const final = (await freshArtifacts.retrieval(row.compose_job_id!, f.owner))!;
  expect(final).toBeDefined(); expect(final.persisted).toBe(true); expect(baseArtifacts).not.toContain(final.id);
  const beforeObservation = await checkpoint("E: compose completed before orchestration observation", "1|2|1|1|3");
  expect(beforeObservation.status).toBe("composing");
  await restart().advancePending(signal());
  const ready = await checkpoint("E: final observed after restart", "1|2|1|1|3");
  expect(ready.status).toBe("ready"); expect(ready.final_artifact_id).toBe(final.id);
  const writes = freshStorage.writes;
  await restart().advancePending(signal()); expect(await restart().read(f.owner, f.request)).toEqual(ready);
  expect(await composition.processById(row.compose_job_id!)).toBe(false); expect(freshStorage.writes).toBe(writes);
  expect(await counts()).toBe("1|2|1|1|3");
  // A new private request reuses the same exact base jobs and approved timeline.
  const secondRequest = randomUUID(); await restart().create(f.owner, secondRequest, selection, "en", "16:9");
  await restart().advancePending(signal()); await restart().advancePending(signal());
  const second = await restart().read(f.owner, secondRequest);
  expect(second.base_job_ids).toEqual(baseJobs); expect(second.spec_id).toBe(ready.spec_id); expect(second.final_artifact_id).toBe(final.id);
  expect(await counts()).toBe("2|2|1|1|3");
  expect(await sql(`select count(*) from public.medical_motion_timeline_segments where artifact_id='${final.id}';`)).toBe("2");
  expect(await sql(`select count(distinct identity->'sourceProfile'->>'sourceId') from public.medical_motion_timeline_segments where artifact_id='${final.id}';`)).toBe("2");
  expect(await sql(`select count(*) from public.medical_motion_reuse_keys where artifact_id='${final.id}';`)).toBe("0");
  const stored = (await freshStorage.read(final.id))!;
  const output = path.join(root, "final-private-review.mp4"); await writeFile(output, stored.bytes, { mode: 0o600, flag: "wx" });
  const media = await inspectMedia(runtime, output, root, signal());
  expect(media).toEqual({ width: 1280, height: 720, duration: 6, audio: false, frameRate: 25, frameCount: 150 });
  expect((await readFile(output)).length).toBe(final.byteSize);
  await writeFile(path.join(root, "acceptance-evidence.json"), JSON.stringify({ orchestrationId: f.request, executionContextId: f.contextId,
   baseJobIds: baseJobs, baseArtifactIds: baseArtifacts, initialReuseDisposition: reuseDisposition, repeatRequest: "same published bases/spec/final; no new jobs or objects",
   timelineSpecId: ready.spec_id, composeJobId: ready.compose_job_id, finalArtifactId: final.id, transition: definition.transitions[0],
   ...media, outputBytes: final.byteSize, outputPath: output, checkpoints, productionConnection: false, anatomy: "synthetic color media; not medical approval" }, null, 2), { mode: 0o600 });
  // Exact owner cleanup is independently checked after afterEach, not global deletion.
 }, 120000);
});
