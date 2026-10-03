import { randomUUID } from "node:crypto";
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { approvedSpecSchema } from "./helpers/approved-personalization";
import { client, literal } from "./helpers/medical-motion-rpc";
import { sql, configuration } from "./helpers/medical-motion-postgres";
import { cleanupArtifactOwner } from "./helpers/medical-motion-artifacts";
import { contextContent } from "./helpers/medical-motion-context";
import { compositionScene, compositionSpecification } from "./helpers/composition-scene";
import { MedicalMotionJobRepository } from "../lib/medical-motion/job.repository";
import { MedicalMotionArtifactRepository, type ArtifactRecord } from "../lib/medical-motion/artifacts/repository";
import { BackgroundJobWorkerRepository, type DurableBackgroundJob } from "../lib/jobs/background-job-worker.repository";
import { BackgroundJobResultRepository } from "../lib/jobs/background-job-result.repository";
import { ReusableArtifactRepository, reusableArtifactIdentity } from "../lib/medical-motion/artifacts/reuse";
import { validatePersonalization } from "../lib/medical-motion/composition/specification";
import { issueApprovedSpec, privateHash } from "../lib/medical-motion/composition/approved-spec";
import { ApprovedPersonalizationRepository } from "../lib/medical-motion/composition/approved-spec.repository";

describe("real local PostgreSQL approved private jobs, coordination and replay", () => {
  let owner: string, baseJob: DurableBackgroundJob, base: ArtifactRecord;
  const specs = new ApprovedPersonalizationRepository(client), artifacts = new MedicalMotionArtifactRepository(client);
  const render = new BackgroundJobWorkerRepository(client, ["medical-motion-render"]), compose = new BackgroundJobWorkerRepository(client, ["medical-motion-compose"]);
  const identity = reusableArtifactIdentity(compositionScene(), "b".repeat(64), "video")!;
  beforeAll(approvedSpecSchema);
  beforeEach(async () => {
    owner = randomUUID(); await sql(`insert into auth.users(id) values('${owner}');`);
    const q = await new MedicalMotionJobRepository(client).enqueue(owner, randomUUID(), contextContent(), 0);
    baseJob = (await render.claimById(q.jobId))!;
    const reuse = new ReusableArtifactRepository(client), miss = await reuse.operation(baseJob, "reserve", identity);
    base = await artifacts.reserve(baseJob, { media: "video", byteSize: 123, sha256: "a".repeat(64) });
    await artifacts.persist(baseJob, base.id); await reuse.operation(baseJob, "ready", identity, miss.epoch, base.id);
    await new BackgroundJobResultRepository(client).publish({ jobId: baseJob.id, attemptToken: baseJob.attemptToken,
      manifest: { kind: "artifact", referenceId: base.id } });
  });
  afterEach(async () => { await cleanupArtifactOwner(owner); });
  function content(value = 42) {
    const contextId = (baseJob.payload as { executionContextId: string }).executionContextId;
    const spec = compositionSpecification(); spec.baseArtifactId = base.id;
    spec.numericOverlays = [{ slot: "text-value", start: 0, end: 2, value, unit: "%" }];
    const cap = validatePersonalization(spec, compositionScene(), { userId: owner, contextId, baseSha256: base.sha256, duration: 5 });
    const data = { schemaVersion: "1" as const, producerVersion: "1" as const, compositionVersion: "1" as const,
      userId: owner, contextId, sceneIndex: 0, baseJobId: baseJob.id, baseArtifactId: base.id,
      baseFingerprint: identity.baseFingerprint, baseOutputFingerprint: identity.outputFingerprint, renderSignature: identity.renderSignature,
      baseSha256: base.sha256, duration: 5, fingerprint: cap.fingerprint, approvalDisposition: "structured-source" as const,
      source: { kind: "health-check-in" as const, id: "71234567-89ab-4def-8123-456789abcdef", field: "wellnessScore" as const, fingerprint: "c".repeat(64) },
      specification: cap.specification };
    return issueApprovedSpec({ ...data, logicalIdentity: privateHash(data) });
  }
  it("guard passes before real PostgreSQL execution", () => expect(() => configuration()).not.toThrow());
  it("atomic approval creates immutable snapshot and minimal owner/context-bound job", async () => {
    const diagnostic = await client.rpc("approve_motion_personalization", { p_user_id: owner, p_content: content() });
    expect(diagnostic.error?.code, "APPROVAL_SQL_CODE").toBeUndefined();
    const a = await specs.approveAndSchedule(content());
    expect(await specs.read(a.id, owner)).toEqual(a);
    const job = (await compose.claimById(a.jobId))!;
    expect(job.type).toBe("medical-motion-compose"); expect(job.payload).toEqual({ approvedPersonalizationSpecId: a.id, compositionVersion: "1" });
    expect(await sql(`select execution_context_id='${a.contextId}'::uuid from public.background_jobs where id='${a.jobId}';`)).toBe("t");
  });
  it("six concurrent duplicate requests produce one durable spec/job", async () => {
    const c = content(), all = await Promise.all(Array.from({ length: 6 }, () => specs.approveAndSchedule(c)));
    expect(new Set(all.map(a => a.jobId)).size).toBe(1); expect(new Set(all.map(a => a.id)).size).toBe(1);
    expect(await sql(`select count(*) from public.medical_motion_approved_specs where user_id='${owner}';`)).toBe("1");
  });
  it("lost approval response replays exact approved content without another job", async () => {
    const c = content(), a = await specs.approveAndSchedule(c), b = await specs.approveAndSchedule(c);
    expect(a).toEqual(b);
  });
  it("transaction crash between spec and work leaves no orphan", async () => {
    await sql(`begin; set role service_role; select * from public.approve_motion_personalization('${owner}',${literal(JSON.stringify(content()))}::jsonb); rollback;`);
    expect(await sql(`select count(*) from public.medical_motion_approved_specs where user_id='${owner}';`)).toBe("0");
    expect(await sql(`select count(*) from public.background_jobs where user_id='${owner}' and job_type='medical-motion-compose';`)).toBe("0");
  });
  it("different approved source/value creates separate private logical work", async () => {
    const a = await specs.approveAndSchedule(content()), b = await specs.approveAndSchedule(content(43)); expect(a.jobId).not.toBe(b.jobId);
  });
  it("another owner cannot read, cancel or approve this private context", async () => {
    const a = await specs.approveAndSchedule(content()), other = randomUUID();
    await expect(specs.read(a.id, other)).rejects.toThrow(); expect(await specs.cancel(a.id, other)).toBe(false);
    expect((await client.rpc("approve_motion_personalization", { p_user_id: other, p_content: content() })).error).not.toBeNull();
  });
  it("conflicting exact identity never overwrites approved values", async () => {
    const c = content(), a = await specs.approveAndSchedule(c);
    const r = await client.rpc("approve_motion_personalization", { p_user_id: owner, p_content: { ...c, duration: 6 } });
    expect(r.error?.code).toBe("OM409"); expect((await specs.read(a.id, owner)).duration).toBe(5);
  });
  it("direct server-role insert/update/delete cannot mutate private specs", async () => {
    const a = await specs.approveAndSchedule(content());
    await expect(sql(`set role service_role; update public.medical_motion_approved_specs set content='{}' where id='${a.id}';`)).rejects.toThrow();
    await expect(sql(`update public.medical_motion_approved_specs set content='{}' where id='${a.id}';`)).rejects.toThrow();
    await expect(sql(`delete from public.medical_motion_approved_specs where id='${a.id}';`)).rejects.toThrow();
  });
  it("RLS and RPC grants deny anon/authenticated/direct service reads", async () => {
    expect(await sql("select relrowsecurity from pg_class where oid='public.medical_motion_approved_specs'::regclass;")).toBe("t");
    for (const role of ["anon", "authenticated", "service_role"]) await expect(sql(`set role ${role}; select * from public.medical_motion_approved_specs;`)).rejects.toThrow();
    for (const role of ["anon", "authenticated"]) await expect(sql(`set role ${role}; select * from public.approve_motion_personalization('${owner}',${literal(JSON.stringify(content()))}::jsonb);`)).rejects.toThrow();
  });
  it("request workers and render-only workers cannot claim heavy composition", async () => {
    const a = await specs.approveAndSchedule(content());
    expect(await new BackgroundJobWorkerRepository(client).claimById(a.jobId)).toBeNull(); expect(await render.claimById(a.jobId)).toBeNull();
  });
  it("simultaneous claims execute equivalent private job once", async () => {
    const a = await specs.approveAndSchedule(content()), all = await Promise.all([compose.claimById(a.jobId), compose.claimById(a.jobId)]);
    expect(all.filter(Boolean)).toHaveLength(1);
  });
  it("database-wide capacity permits four leases and queues the fifth", async () => {
    const all = []; for (let i = 0; i < 5; i++) all.push(await specs.approveAndSchedule(content(i)));
    const claimed = await Promise.all(all.map(a => compose.claimById(a.jobId)));
    expect(claimed.filter(Boolean)).toHaveLength(4);
    const active = claimed.find(Boolean)!;
    await compose.scheduleRetry({ jobId: active.id, attemptToken: active.attemptToken, retryDelayMs: 10000, errorMessage: "TEST_CAPACITY_RELEASE" });
    const pending = all[claimed.findIndex(v => !v)]; expect(await compose.claimById(pending.jobId)).not.toBeNull();
  });
  it("completion without persisted private composition publication fails", async () => {
    const a = await specs.approveAndSchedule(content()), job = (await compose.claimById(a.jobId))!;
    await expect(compose.markCompleted({ jobId: job.id, attemptToken: job.attemptToken })).rejects.toThrow();
    await expect(new BackgroundJobResultRepository(client).publish({ jobId: job.id, attemptToken: job.attemptToken, manifest: { kind: "artifact", referenceId: base.id } })).rejects.toThrow();
    expect(await sql(`select count(*) from public.background_job_results where job_id='${job.id}';`)).toBe("0");
  });
  it("queued cancellation is durable/idempotent and never claimed", async () => {
    const a = await specs.approveAndSchedule(content()); expect(await specs.cancel(a.id, owner)).toBe(true); expect(await specs.cancel(a.id, owner)).toBe(true);
    expect(await compose.claimById(a.jobId)).toBeNull(); expect((await specs.approveAndSchedule(content())).jobId).toBe(a.jobId);
  });
  it("running cancellation revokes lease/fencing before publication", async () => {
    const a = await specs.approveAndSchedule(content()), job = (await compose.claimById(a.jobId))!;
    expect(await specs.cancel(a.id, owner)).toBe(true);
    expect((await compose.renewLease({ jobId: job.id, attemptToken: job.attemptToken })).outcome).toBe("ownership-lost");
    expect((await new BackgroundJobResultRepository(client).publish({ jobId: job.id, attemptToken: job.attemptToken, manifest: { kind: "artifact", referenceId: base.id } })).outcome).toBe("ownership-lost");
  });
  it("restart/retry claims new attempt and exactly the durable original spec", async () => {
    const a = await specs.approveAndSchedule(content()), first = (await compose.claimById(a.jobId))!;
    await compose.scheduleRetry({ jobId: first.id, attemptToken: first.attemptToken, errorMessage: "TEST_RESTART", retryDelayMs: 0 });
    const second = (await compose.claimById(a.jobId))!; expect(second.attemptToken).not.toBe(first.attemptToken);
    expect(await specs.read(a.id, owner)).toEqual(a);
    expect((await compose.renewLease({ jobId: first.id, attemptToken: first.attemptToken })).outcome).toBe("ownership-lost");
  });
  it("cancellation probe is owner/current-token bound and never extends a lease", async () => {
    const a = await specs.approveAndSchedule(content()), job = (await compose.claimById(a.jobId))!, abort = new AbortController().signal;
    const before = await sql(`select lease_expires_at from public.background_jobs where id='${job.id}';`);
    expect(await specs.currentAttempt(a.id, owner, job.attemptToken, abort)).toBe(true);
    expect(await specs.currentAttempt(a.id, owner, randomUUID(), abort)).toBe(false);
    expect(await specs.currentAttempt(a.id, randomUUID(), job.attemptToken, abort)).toBe(false);
    expect(await sql(`select lease_expires_at from public.background_jobs where id='${job.id}';`)).toBe(before);
    await specs.cancel(a.id, owner); expect(await specs.currentAttempt(a.id, owner, job.attemptToken, abort)).toBe(false);
  });
});
