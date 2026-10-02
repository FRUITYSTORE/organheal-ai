import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { configuration, sql } from "./helpers/medical-motion-postgres";
import { artifactSchema, cleanupArtifactOwner } from "./helpers/medical-motion-artifacts";
import { client } from "./helpers/medical-motion-rpc";
import { contextContent } from "./helpers/medical-motion-context";
import { MedicalMotionJobRepository } from "@/lib/medical-motion/job.repository";
import { BackgroundJobWorkerRepository } from "@/lib/jobs/background-job-worker.repository";
import { createIsolatedMotionDatabase } from "@/lib/medical-motion/worker/local-postgres";
describe("worker recovery real PostgreSQL", () => {
  let owner: string;
  beforeAll(async () => { configuration(); await artifactSchema();
    if (await sql("select to_regprocedure('public.resume_motion_worker_pending(integer)') is null;") === "t")
      await sql(readFileSync("supabase/migrations/20261002130419_medical_motion_worker_pending_recovery.sql", "utf8"));
    expect(await createIsolatedMotionDatabase(process.env).readiness()).toBe(true);
  });
  beforeEach(async () => { owner = randomUUID(); await sql(`insert into auth.users(id) values('${owner}');`); });
  afterEach(async () => { if (owner) await cleanupArtifactOwner(owner); });
  async function awaiting() {
    const queued = await new MedicalMotionJobRepository(client).enqueue(owner, randomUUID(), contextContent(), 0);
    const repository = new BackgroundJobWorkerRepository(client, ["medical-motion-render"]);
    const job = (await repository.claimById(queued.jobId))!;
    await repository.deferCompletion({ jobId: job.id, attemptToken: job.attemptToken }); return job;
  }
  it("resumes awaiting once, invalidates old token, and claims a fresh attempt", async () => {
    const job = await awaiting();
    expect(await sql("set role service_role;select resumed_count from public.resume_motion_worker_pending(1);")).toBe("1");
    expect(await sql("set role service_role;select resumed_count from public.resume_motion_worker_pending(1);")).toBe("0");
    const next = (await new BackgroundJobWorkerRepository(client, ["medical-motion-render"]).claimById(job.id))!;
    expect(next.attemptToken).not.toBe(job.attemptToken);
    expect((await new BackgroundJobWorkerRepository(client).renewLease({ jobId: job.id, attemptToken: job.attemptToken })).outcome).toBe("ownership-lost");
  });
  it("bounds processing and exhausted attempts fail instead of stranding", async () => {
    const a = await awaiting(), b = await awaiting();
    await sql(`update public.background_jobs set attempts=max_attempts-1 where id='${a.id}';`);
    expect(await sql("set role service_role;select resumed_count from public.resume_motion_worker_pending(1);")).toBe("1");
    expect(await sql(`select status from public.background_jobs where id='${a.id}';`)).toBe("failed");
    expect(await sql(`select status from public.background_jobs where id='${b.id}';`)).toBe("awaiting-artifact-publication");
  });
  it.each(["anon", "authenticated"])("denies recovery to %s", async role => {
    await expect(sql(`set role ${role};select * from public.resume_motion_worker_pending(10);`)).rejects.toMatchObject({ code: "42501" });
  });
  it("transport rejects non-render capabilities before SQL", async () => {
    const result = await createIsolatedMotionDatabase(process.env).client.rpc("claim_next_background_job", { p_allowed_job_types: ["pdf-extraction"] });
    expect(result.error).not.toBeNull(); expect(result.data).toBeNull();
  });
  it("single-column recovery RPC preserves its row contract through the actual transport", async () => {
    const response = await createIsolatedMotionDatabase(process.env).client.rpc("resume_motion_worker_pending", { p_limit: 1 });
    expect(response.error).toBeNull(); expect(response.data).toEqual([{ resumed_count: 0 }]);
  });
  it("unexpired running jobs are excluded from both recovery operations", async () => {
    const queued = await new MedicalMotionJobRepository(client).enqueue(owner, randomUUID(), contextContent(), 0);
    const repository = new BackgroundJobWorkerRepository(client, ["medical-motion-render"]), job = (await repository.claimById(queued.jobId))!;
    await new BackgroundJobWorkerRepository(createIsolatedMotionDatabase(process.env).client, ["medical-motion-render"]).recoverStaleJobs(); await sql("set role service_role;select * from public.resume_motion_worker_pending(10);");
    expect(await sql(`select attempt_token::text from public.background_jobs where id='${job.id}';`)).toBe(job.attemptToken);
  });
  it("concurrent recovery skips a locked awaiting job without consuming another attempt", async () => {
    const job = await awaiting(); let locked!: () => void;
    const ready = new Promise<void>(resolve => { locked = resolve; });
    const holding = sql(`begin;select id from public.background_jobs where id='${job.id}' for update;select 'JOB_LOCKED';select pg_sleep(1);commit;`, locked);
    await ready;
    expect(await sql("set role service_role;select resumed_count from public.resume_motion_worker_pending(1);")).toBe("0");
    await holding;
    expect(await sql("set role service_role;select resumed_count from public.resume_motion_worker_pending(1);")).toBe("1");
  });
});
