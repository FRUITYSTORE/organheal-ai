import { randomUUID, createHash } from "node:crypto";
import { describe, beforeAll, beforeEach, afterEach, it, expect } from "vitest";
import { cleanupArtifactOwner } from "./helpers/medical-motion-artifacts";
import { compositionSchema } from "./helpers/composition-postgres";
import { configuration, sql } from "./helpers/medical-motion-postgres";
import { client, literal } from "./helpers/medical-motion-rpc";
import { contextContent } from "./helpers/medical-motion-context";
import { compositionScene } from "./helpers/composition-scene";
import { MedicalMotionJobRepository } from "../lib/medical-motion/job.repository";
import { BackgroundJobWorkerRepository, type DurableBackgroundJob } from "../lib/jobs/background-job-worker.repository";
import { MedicalMotionArtifactRepository, type ArtifactRecord } from "../lib/medical-motion/artifacts/repository";
import { ReusableArtifactRepository, reusableArtifactIdentity } from "../lib/medical-motion/artifacts/reuse";
import { BackgroundJobResultRepository } from "../lib/jobs/background-job-result.repository";

describe("real isolated PostgreSQL private composition provenance and fencing", () => {
  let user: string, baseJob: DurableBackgroundJob, finalJob: DurableBackgroundJob, base: ArtifactRecord, final: ArtifactRecord;
  const artifacts = new MedicalMotionArtifactRepository(client), reuse = new ReusableArtifactRepository(client), results = new BackgroundJobResultRepository(client);
  let identity: NonNullable<ReturnType<typeof reusableArtifactIdentity>>;
  const attempts = new BackgroundJobWorkerRepository(client, ["medical-motion-render"]);
  beforeAll(compositionSchema);
  beforeEach(async () => {
    identity = reusableArtifactIdentity(compositionScene(), createHash("sha256").update(randomUUID()).digest("hex"), "video")!;
    user = randomUUID(); await sql(`insert into auth.users(id) values('${user}');`);
    const jobs = new MedicalMotionJobRepository(client);
    baseJob = (await attempts.claimById((await jobs.enqueue(user, randomUUID(), contextContent(), 0)).jobId))!;
    finalJob = (await attempts.claimById((await jobs.enqueue(user, randomUUID(), contextContent(), 0)).jobId))!;
    const miss = await reuse.operation(baseJob, "reserve", identity);
    expect(miss.outcome).toBe("CACHE_MISS");
    base = await artifacts.reserve(baseJob, { media: "video", byteSize: 123, sha256: createHash("sha256").update("TEST BASE").digest("hex") });
    await artifacts.persist(baseJob, base.id); await reuse.operation(baseJob, "ready", identity, miss.epoch, base.id);
    await results.publish({ jobId: baseJob.id, attemptToken: baseJob.attemptToken, manifest: { kind: "artifact", referenceId: base.id } });
    final = await artifacts.reserve(finalJob, { media: "video", byteSize: 124, sha256: "c".repeat(64) });
  });
  afterEach(async () => { if (user) await cleanupArtifactOwner(user); });
  const provenance = () => ({ compositionVersion: "1", fingerprint: "d".repeat(64), overlaySpecFingerprint: "d".repeat(64), baseSha256: base.sha256,
    baseFingerprint: identity.baseFingerprint, baseOutputFingerprint: identity.outputFingerprint, baseRenderSignature: identity.renderSignature,
    outputProfile: "16:9", language: "ar", audioComponents: [], disposition: "private-composed" });
  const args = () => ({ p_job_id: finalJob.id, p_user_id: user, p_attempt_token: finalJob.attemptToken,
    p_artifact_id: final.id, p_base_job_id: baseJob.id, p_base_artifact_id: base.id,
    p_context_id: (finalJob.payload as { executionContextId: string }).executionContextId, p_provenance: provenance() });
  const record = async (changes: Record<string, unknown> = {}) => client.rpc("motion_composition_provenance", { ...args(), ...changes });
  it("target guard passes before connecting; no credentials are reported", () => expect(() => configuration()).not.toThrow());
  it("authorized immutable base is eligible only for its medical identity", async () => {
    const values = { p_job_id: finalJob.id, p_user_id: user, p_attempt_token: finalJob.attemptToken,
      p_base_job_id: baseJob.id, p_base_artifact_id: base.id, p_base_fingerprint: identity.baseFingerprint,
      p_output_fingerprint: identity.outputFingerprint, p_render_signature: identity.renderSignature };
    expect((await client.rpc("check_motion_composition_base", values)).data).toBe(true);
    expect((await client.rpc("check_motion_composition_base", { ...values, p_base_fingerprint: "f".repeat(64) })).data).toBe(false);
  });
  it("records provenance idempotently without raw patient prose", async () => {
    expect((await record()).data).toBe(true); expect((await record()).data).toBe(true);
    expect(await sql(`select count(*) from public.medical_motion_compositions where job_id='${finalJob.id}';`)).toBe("1");
  });
  it.each(["p_user_id", "p_attempt_token", "p_context_id", "p_base_artifact_id", "p_artifact_id"])("rejects incorrect %s", async key => {
    expect((await record({ [key]: randomUUID() })).error).toBeTruthy();
  });
  it.each(["filter", "clinicalMessage", "diagnosis", "patientName"])("rejects extra shared metadata %s", async key => {
    expect((await record({ p_provenance: { ...provenance(), [key]: "TEST" } })).error).toBeTruthy();
  });
  it("rejects conflicting identity replay", async () => {
    expect((await record()).data).toBe(true);
    expect((await record({ p_provenance: { ...provenance(), fingerprint: "f".repeat(64) } })).error).toBeTruthy();
  });
  it("expired lease cannot record provenance", async () => {
    await sql(`update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id='${finalJob.id}';`);
    expect((await record()).error?.code).toBe("OM403");
  });
  it("private final cannot become a shared reusable artifact", async () => {
    expect((await record()).data).toBe(true); await artifacts.persist(finalJob, final.id);
    const different = { ...identity, key: "e".repeat(64), baseFingerprint: "e".repeat(64) };
    await expect(reuse.operation(finalJob, "reserve", different)).rejects.toThrow();
  });
  it("a reserved cache producer job cannot be relabelled as a private final", async () => {
    await reuse.operation(finalJob, "reserve", { ...identity, key: "e".repeat(64), baseFingerprint: "e".repeat(64) });
    expect((await record()).error).toBeTruthy();
  });
  it("private final publishes through existing registry; another user cannot retrieve", async () => {
    expect((await record()).data).toBe(true); await artifacts.persist(finalJob, final.id);
    expect((await results.publish({ jobId: finalJob.id, attemptToken: finalJob.attemptToken, manifest: { kind: "artifact", referenceId: final.id } })).outcome).toBe("applied");
    expect((await artifacts.published(finalJob.id, user))?.id).toBe(final.id);
    expect(await artifacts.published(finalJob.id, randomUUID())).toBeUndefined();
  });
  it("invalidated base generation blocks final publication", async () => {
    expect((await record()).data).toBe(true); await artifacts.persist(finalJob, final.id);
    await sql(`update public.medical_motion_reuse_keys set state='invalid' where cache_key='${identity.key}';`);
    await expect(results.publish({ jobId: finalJob.id, attemptToken: finalJob.attemptToken, manifest: { kind: "artifact", referenceId: final.id } })).rejects.toThrow();
  });
  it("RLS/direct access revoked for all application roles", async () => {
    expect(await sql("select relrowsecurity from pg_class where oid='public.medical_motion_compositions'::regclass;")).toBe("t");
    for (const role of ["anon", "authenticated", "service_role"]) {
      expect(await sql(`select has_table_privilege('${role}','public.medical_motion_compositions','select,insert,update,delete');`)).toBe("f");
    }
    await expect(sql(`set role anon; select public.check_motion_composition_base('${finalJob.id}','${user}','${finalJob.attemptToken}','${baseJob.id}','${base.id}',${literal(identity.baseFingerprint)},${literal(identity.outputFingerprint)},${literal(identity.renderSignature)});`)).rejects.toThrow();
  });
  it("provenance remains immutable", async () => {
    expect((await record()).data).toBe(true);
    await expect(sql(`delete from public.medical_motion_compositions where artifact_id='${final.id}';`)).rejects.toThrow();
  });
});
