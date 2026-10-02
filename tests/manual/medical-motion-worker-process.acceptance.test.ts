import { fork, spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { configuration, sql } from "../helpers/medical-motion-postgres";
import { cleanupArtifactOwner } from "../helpers/medical-motion-artifacts";
import { client } from "../helpers/medical-motion-rpc";
import { contextContent } from "../helpers/medical-motion-context";
import { MedicalMotionJobRepository } from "@/lib/medical-motion/job.repository";
import { isolatedStorageClient } from "@/lib/medical-motion/worker/entry";
import { MEDICAL_MOTION_BUCKET, SupabasePrivateArtifactStorage } from "@/lib/medical-motion/artifacts/storage";
const env = { ...process.env, MEDICAL_MOTION_WORKER_ENVIRONMENT: "isolated-test",
  BLENDER_EXECUTABLE_PATH: "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe",
  MEDICAL_MOTION_RENDER_SCRIPT: path.resolve("tests/fixtures/medical-motion-handler-smoke.py"),
  MEDICAL_MOTION_WORKER_IDLE_MS: "100", MEDICAL_MOTION_WORKER_RECOVERY_MS: "1000" };
const cloud = isolatedStorageClient(env), storage = new SupabasePrivateArtifactStorage(cloud);
type Running = { child: ChildProcess; messages: { type: string; stage?: string; pid?: number; state?: { activeJobCount: number } }[]; logs: string; exited: Promise<number | null> };
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function until(check: () => Promise<boolean> | boolean, timeout = 90000) {
  const end = Date.now() + timeout; while (Date.now() < end) { if (await check()) return; await delay(100); }
  throw Error("WORKER_PROCESS_ACCEPTANCE_TIMEOUT");
}
describe("real isolated worker process acceptance", () => {
  let owner: string; const children: Running[] = [];
  beforeAll(async () => { configuration(); expect((await sql("show server_version;")).startsWith("17.11")).toBe(true);
    expect(await sql("select to_regprocedure('public.resume_motion_worker_pending(integer)') is not null;")).toBe("t");
    const bucket = await cloud.storage.getBucket(MEDICAL_MOTION_BUCKET); expect(!!bucket.data && !bucket.error && !bucket.data.public).toBe(true);
  });
  beforeEach(async () => { owner = randomUUID(); await sql(`insert into auth.users(id) values('${owner}');`); });
  function start(stage?: string, extra: Record<string, string | undefined> = {}, standalone = false) {
    const child = fork(path.resolve(standalone ? "scripts/medical-motion-worker.cjs" : "tests/fixtures/medical-motion-worker-process.cjs"), [], {
      env: { ...env, ...extra, ...(stage ? { ORGANHEAL_WORKER_TEST_STAGE: stage } : {}) }, silent: true });
    const item: Running = { child, messages: [], logs: "", exited: new Promise(resolve => child.once("exit", resolve)) };
    child.on("message", message => { item.messages.push(message as Running["messages"][number]); });
    child.stdout!.on("data", chunk => { item.logs += String(chunk); });
    // Inspect both streams privately for safe logging; never print diagnostics.
    child.stderr!.on("data", chunk => { item.logs += String(chunk); }); children.push(item); return item;
  }
  async function kill(item: Running) {
    if (item.child.exitCode !== null) return;
    const pid = item.child.pid; if (!pid || !children.includes(item)) throw Error("UNOWNED_PROCESS_REJECTED");
    await new Promise<void>((resolve, reject) => { const cleanup = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      cleanup.on("error", () => reject(Error("OWNED_PROCESS_TREE_CLEANUP_FAILED"))); cleanup.on("exit", () => resolve()); });
    await item.exited;
  }
  async function stop(item: Running) { if (item.child.exitCode === null) { item.child.send("shutdown"); await until(() => item.child.exitCode !== null, 35000); } }
  afterEach(async () => {
    for (const child of children) { await kill(child); expect(child.logs).not.toMatch(/sb_secret_|sb_publishable_|postgres(?:ql)?:|supabase\.co|clinicalMessage|localPath|stderr|stdout/);
      const password = decodeURIComponent(configuration().url.password);
      for (const secret of [process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, password]) {
        if (secret) expect(child.logs.includes(secret)).toBe(false);
      }
      for (const process of child.messages.filter(message => message.type === "blender")) {
        let alive = false; try { globalThis.process.kill(process.pid!, 0); alive = true; } catch { /* confirmed absent */ }
        expect(alive).toBe(false);
      }
    }
    children.length = 0;
    // Only registry UUIDs belonging to this exact synthetic test owner.
    const result = await sql(`select coalesce(json_agg(id),'[]'::json)::text from public.medical_motion_artifacts where user_id='${owner}';`);
    const ids = JSON.parse(result) as string[];
    for (const id of ids) { if (!/^[0-9a-f-]{36}$/.test(id)) throw Error("INVALID_TEST_OBJECT_ID");
      const existing = await storage.read(id); if (existing) { const removed = await cloud.storage.from(MEDICAL_MOTION_BUCKET).remove([id]); if (removed.error) throw Error("SCOPED_CLEANUP_FAILED"); expect(await storage.read(id)).toBeUndefined(); } }
    await cleanupArtifactOwner(owner);
  }, 120000);
  async function enqueue() { return (await new MedicalMotionJobRepository(client).enqueue(owner, randomUUID(), contextContent(), 0)).jobId; }
  const state = (id: string) => sql(`select status from public.background_jobs where id='${id}';`);
  async function complete(id: string) {
    try { await until(async () => {
      const status = await state(id);
      if (status === "completed") return true;
      const worker = children.at(-1)!;
      if (status === "failed" || worker.child.exitCode !== null) throw Error("WORKER_STOPPED_BEFORE_COMPLETION");
      return false;
    }, 150000); } catch {
      const code = await sql(`select status||':'||coalesce(last_error,'NONE') from public.background_jobs where id='${id}';`);
      const safe = /^[a-z-]+:[A-Z_]+$/.test(code) ? code : "UNKNOWN";
      const worker = children.at(-1)!;
      throw Error(`WORKER_COMPLETION_${safe}_EXIT_${worker.child.exitCode ?? "ACTIVE"}_STARTUP_FAILED_${worker.logs.includes('"event":"STARTUP_FAILED"')}`);
    }
    expect(await sql(`select count(*) from public.background_job_results where job_id='${id}';`)).toBe("1");
    expect(await sql(`select count(*) from public.medical_motion_artifacts where job_id='${id}' and persisted_at is not null;`)).toBe("1"); }
  it("multiple real Blender jobs complete through the polling loop with one active job", async () => {
    const a = await enqueue(), b = await enqueue(), worker = start();
    await until(() => worker.messages.some(message => message.type === "blender"));
    expect(await state(a)).toBe("running"); expect(await state(b)).toBe("pending");
    await complete(a); await complete(b); await stop(worker);
    const events = worker.logs.trim().split(/\r?\n/).map(line => JSON.parse(line));
    expect(events.filter(e => e.event === "JOB_STARTED")).toHaveLength(2);
    expect(Math.max(...events.map(e => e.activeJobCount ?? 0))).toBe(1);
    expect(worker.messages.filter(m => m.type === "blender")).toHaveLength(2); expect(await worker.exited).toBe(0);
  }, 180000);
  it("standalone CLI completes a real job without process fault overrides", async () => {
    const id = await enqueue(), worker = start(undefined, {}, true); await complete(id); await stop(worker);
    expect(await worker.exited).toBe(0); expect(worker.logs).toContain('"event":"READY"');
    const artifact = await sql(`select medical_motion_artifact_id::text from public.background_job_results where job_id='${id}';`);
    const object = await storage.read(artifact); expect(object?.contentType).toBe("video/mp4"); expect((object?.bytes.length ?? 0) > 0).toBe(true);
  }, 180000);
  it.each([
    { BLENDER_EXECUTABLE_PATH: "C:\\missing-blender.exe" },
    { ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL: "" },
    { SUPABASE_SERVICE_ROLE_KEY: "" },
    { MEDICAL_MOTION_WORKER_CONCURRENCY: "99" },
  ])("standalone startup fails before claiming with invalid dependency configuration", async invalid => {
    const id = await enqueue(), worker = start(undefined, invalid, true);
    await until(() => worker.child.exitCode !== null, 35000); expect(await worker.exited).toBe(1);
    expect(await state(id)).toBe("pending"); expect(worker.logs).toContain("STARTUP_FAILED");
  }, 60000);
  it.each(["claim", "context", "render", "before-upload", "after-upload", "registry", "published"])("process interruption at %s recovers once under fenced ownership", async point => {
    const id = await enqueue(), worker = start(point, point === "render" ? { ORGANHEAL_HANDLER_SMOKE_CANCEL: "1" } : {});
    await until(() => worker.messages.some(m => m.type === "stage" && m.stage === point));
    const token = await sql(`select attempt_token::text from public.background_jobs where id='${id}';`);
    await kill(worker);
    if (point !== "published") await sql(`update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id='${id}' and status='running';`);
    const restarted = start(); await complete(id); await stop(restarted);
    if (point !== "published") {
      expect(await sql(`set role service_role;select outcome from public.mutate_background_job_attempt('${id}','${token}','renew');`)).toBe("ownership-lost");
      expect(await sql(`set role service_role;select outcome from public.publish_background_job_result('${id}','${token}','artifact',
        (select medical_motion_artifact_id from public.background_job_results where job_id='${id}'));`)).toBe("ownership-lost");
    }
    if (["after-upload", "registry", "published"].includes(point)) expect(restarted.messages.filter(m => m.type === "blender")).toHaveLength(0);
  }, 180000);
  it("awaiting publication with a lost candidate is recovered by a real restarted worker", async () => {
    const id = await enqueue(), worker = start("claim"); await until(() => worker.messages.some(m => m.stage === "claim"));
    const token = await sql(`select attempt_token::text from public.background_jobs where id='${id}';`);
    await kill(worker); await sql(`set role service_role;select * from public.defer_background_job_completion('${id}','${token}');`);
    const restarted = start(); await complete(id); await stop(restarted);
    expect(restarted.messages.filter(m => m.type === "blender")).toHaveLength(1);
  }, 180000);
  it.each(["after-upload", "registry"])("awaiting publication with durable bytes at %s reconciles without another Blender process", async point => {
    const id = await enqueue(), worker = start(point); await until(() => worker.messages.some(m => m.stage === point));
    const token = await sql(`select attempt_token::text from public.background_jobs where id='${id}';`);
    await kill(worker); await sql(`set role service_role;select * from public.defer_background_job_completion('${id}','${token}');`);
    const restarted = start(); await complete(id); await stop(restarted);
    expect(restarted.messages.filter(m => m.type === "blender")).toHaveLength(0);
  }, 180000);
  it("platform shutdown aborts Blender and never publishes a canceled attempt", async () => {
    const id = await enqueue(), worker = start("render", { ORGANHEAL_HANDLER_SMOKE_CANCEL: "1" });
    await until(() => worker.messages.some(m => m.stage === "render")); worker.child.send("health");
    await until(() => worker.messages.some(m => m.type === "health"));
    expect(worker.messages.find(m => m.type === "health")?.state).toMatchObject({ started: true, ready: true, blenderAvailable: true, dbReachable: true, storageConfigured: true, activeJobCount: 1 });
    await stop(worker);
    expect(await worker.exited).toBe(0); expect(await state(id)).not.toBe("completed");
    expect(await sql(`select count(*) from public.background_job_results where job_id='${id}';`)).toBe("0");
  }, 90000);
  it("forced interruption during shutdown is recovered by the supervised restart", async () => {
    const id = await enqueue(), worker = start("render", { ORGANHEAL_HANDLER_SMOKE_CANCEL: "1" });
    await until(() => worker.messages.some(m => m.stage === "render")); worker.child.send("shutdown"); await kill(worker);
    expect(await sql(`select count(*) from public.background_job_results where job_id='${id}';`)).toBe("0");
    await sql(`update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id='${id}' and status='running';`);
    const restarted = start(); await complete(id); await stop(restarted);
  }, 180000);
  it("conflicting durable bytes fail recovery without overwrite or another render", async () => {
    const id = await enqueue(), worker = start("after-upload"); await until(() => worker.messages.some(m => m.stage === "after-upload"));
    const artifact = await sql(`select id::text from public.medical_motion_artifacts where job_id='${id}' and user_id='${owner}';`);
    await kill(worker);
    const altered = await cloud.storage.from(MEDICAL_MOTION_BUCKET).upload(artifact, Buffer.from("synthetic conflict"), { upsert: true, contentType: "video/mp4" });
    expect(!altered.error).toBe(true); // Test fault only; the application adapter never exposes upsert.
    await sql(`update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id='${id}';`);
    const restarted = start(); await until(async () => await state(id) === "failed"); await stop(restarted);
    expect(restarted.messages.filter(m => m.type === "blender")).toHaveLength(0);
    expect(await sql(`select count(*) from public.background_job_results where job_id='${id}';`)).toBe("0");
    expect((await storage.read(artifact))?.bytes.equals(Buffer.from("synthetic conflict"))).toBe(true);
  }, 180000);
  it("storage outage cannot complete, restoration reconciles a single result", async () => {
    const id = await enqueue(), worker = start("storage-outage"); await until(async () => await state(id) === "retrying"); await stop(worker);
    expect(await sql(`select count(*) from public.background_job_results where job_id='${id}';`)).toBe("0");
    await sql(`update public.background_jobs set available_at=clock_timestamp() where id='${id}';`);
    const restarted = start(); await complete(id); await stop(restarted);
  }, 180000);
  it("renewal RPC outage suspends execution and cannot publish", async () => {
    const id = await enqueue(), worker = start("db-outage"); await until(() => worker.logs.includes('"event":"JOB_FINISHED"')); await stop(worker);
    expect(await sql(`select count(*) from public.background_job_results where job_id='${id}';`)).toBe("0");
    expect(worker.messages.filter(m => m.type === "blender")).toHaveLength(0);
    await sql(`update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id='${id}' and status='running';`);
    const restarted = start(); await complete(id); await stop(restarted);
  }, 180000);
});
