import { fork, spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { tmpdir } from "node:os";
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
type Running = { child: ChildProcess; messages: { type: string; stage?: string; pid?: number; resources?:{rssBytes:number;activeResources:number};state?: { activeJobCount: number;phase?:string;ready?:boolean;lastSuccessfulPoll?:string;recoveryComplete?:boolean } }[]; logs: string; exited: Promise<number | null> };
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
  function start(stage?: string, extra: Record<string, string | undefined> = {}, standalone = false, supervised=false) {
    const explicit:NodeJS.ProcessEnv={NODE_ENV:"test"};
    for(const name of ["SystemRoot","WINDIR","PATH","TEMP","TMP","USERPROFILE","ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL","ORGANHEAL_TEST_PSQL","NEXT_PUBLIC_SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY",
      "MEDICAL_MOTION_WORKER_ENVIRONMENT","BLENDER_EXECUTABLE_PATH","MEDICAL_MOTION_RENDER_SCRIPT","MEDICAL_MOTION_WORKER_IDLE_MS","MEDICAL_MOTION_WORKER_RECOVERY_MS"])explicit[name]=env[name as keyof typeof env];
    const child = fork(path.resolve(standalone ? "scripts/medical-motion-worker.cjs" : "tests/fixtures/medical-motion-worker-process.cjs"), [], {
      env: { ...(supervised?explicit:env), ...extra, ...(stage ? { ORGANHEAL_WORKER_TEST_STAGE: stage } : {}) },
      ...(supervised?{cwd:tmpdir(),execArgv:["--require",path.resolve("tests/fixtures/medical-motion-packaged-supervisor.cjs")]}:{}),silent: true,...{windowsHide:true} });
    const item: Running = { child, messages: [], logs: "", exited: new Promise(resolve => child.once("exit", resolve)) };
    child.on("message", message => { item.messages.push(message as Running["messages"][number]); });
    child.stdout!.on("data", chunk => { item.logs = (item.logs+String(chunk)).slice(-262144); });
    // Inspect both streams privately for safe logging; never print diagnostics.
    child.stderr!.on("data", chunk => { item.logs = (item.logs+String(chunk)).slice(-262144); }); children.push(item); return item;
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
  async function ready(worker:Running){await until(()=>worker.logs.includes('"event":"READY"'));worker.child.send("health");await until(()=>worker.messages.some(m=>m.state?.phase==="ready"));}
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
  it.each([
    {name:"workspace",extra:{MEDICAL_MOTION_OUTPUT_ROOT:path.resolve("package.json")},code:78},
    {name:"database",extra:{ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL:(()=>{const target=new URL(process.env.ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL!);target.port="1";return target.href;})()},code:75},
    {name:"storage",extra:{},stage:"startup-storage-outage",code:76},
  ])("packaged startup $name failure is fatal before readiness or claims",async test=>{
    const id=await enqueue(),worker=start(test.stage,test.extra,true,true);
    await until(()=>worker.child.exitCode!==null,35000);expect(await worker.exited).toBe(test.code);
    expect(worker.logs).not.toContain('"event":"READY"');expect(worker.logs).not.toContain('"event":"CLAIM"');expect(await state(id)).toBe("pending");
  },60000);
  it("external supervisor gracefully deploys/restarts the packaged command",async()=>{
    const worker=start(undefined,{ORGANHEAL_HANDLER_SMOKE_CANCEL:"1"},true,true);await ready(worker);const id=await enqueue();
    await until(()=>worker.messages.some(m=>m.stage==="render"));await stop(worker);expect(await worker.exited).toBe(0);
    expect(await sql(`select count(*) from public.background_job_results where job_id='${id}';`)).toBe("0");
    await sql(`update public.background_jobs set available_at=clock_timestamp(),lease_expires_at=clock_timestamp()-interval '1 second' where id='${id}' and status in ('running','retrying');`);
    await delay(500);const restarted=start(undefined,{},true,true);await ready(restarted);await complete(id);await stop(restarted);expect(await restarted.exited).toBe(0);
  },240000);
  it.each(["render","after-upload","registry","published"])("external supervisor recovers packaged abrupt death at %s without duplicate publication",async point=>{
    const worker=start(point,point==="render"?{ORGANHEAL_HANDLER_SMOKE_CANCEL:"1"}:{},true,true);await ready(worker);const id=await enqueue();
    await until(()=>worker.messages.some(m=>m.stage===point));const token=await sql(`select attempt_token::text from public.background_jobs where id='${id}';`);await kill(worker);
    if(point!=="published")await sql(`update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id='${id}' and status='running';`);
    await delay(500);const restarted=start(undefined,{},true,true);await ready(restarted);await complete(id);await stop(restarted);
    if(point!=="published")expect(await sql(`set role service_role;select outcome from public.publish_background_job_result('${id}','${token}','artifact',(select medical_motion_artifact_id from public.background_job_results where job_id='${id}'));`)).toBe("ownership-lost");
    expect(restarted.messages.filter(m=>m.type==="blender")).toHaveLength(point==="render"?1:0);expect(await restarted.exited).toBe(0);
  },240000);
  it.each(["claim","after-upload"])("packaged restart recovers awaiting publication at %s",async point=>{
    const worker=start(point,{},true,true);await ready(worker);const id=await enqueue();await until(()=>worker.messages.some(m=>m.stage===point));
    const token=await sql(`select attempt_token::text from public.background_jobs where id='${id}';`);await kill(worker);
    await sql(`set role service_role;select * from public.defer_background_job_completion('${id}','${token}');`);
    await delay(500);const restarted=start(undefined,{},true,true);await ready(restarted);await complete(id);await stop(restarted);
    expect(restarted.messages.filter(m=>m.type==="blender")).toHaveLength(point==="claim"?1:0);expect(await restarted.exited).toBe(0);
  },240000);
  it("packaged neutral-cwd explicit-environment worker remains bounded for a 180-second three-job soak",async()=>{
    const worker=start(undefined,{MEDICAL_MOTION_WORKER_IDLE_MS:"1000",MEDICAL_MOTION_WORKER_RECOVERY_MS:"5000"},true,true);await ready(worker);
    const started=Date.now(),ids:string[]=[];const completions:number[]=[];
    for(let i=0;i<3;i++){const before=Date.now(),id=await enqueue();ids.push(id);await complete(id);completions.push(Date.now()-before);worker.child.send("health");}
    const baseline=worker.messages.length;
    while(Date.now()-started<180000){expect(worker.child.exitCode).toBeNull();worker.child.send("health");await delay(5000);}
    worker.child.send("health");await until(()=>worker.messages.length>baseline);await delay(300);
    const samples=worker.messages.slice(baseline).filter(m=>m.type==="health"&&m.state?.activeJobCount===0);
    expect(samples.length).toBeGreaterThan(3);expect(samples.every(m=>m.state?.ready&&m.state.recoveryComplete&&m.state.lastSuccessfulPoll)).toBe(true);
    const rss=samples.map(m=>m.resources!.rssBytes),resources=samples.map(m=>m.resources!.activeResources);
    expect(Math.max(...rss)-Math.min(...rss)).toBeLessThan(64*1024*1024);
    const median=(values:number[])=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
    const middle=Math.floor(resources.length/2);
    // SQL process/pipe and provider sockets are transient. Compare steady-state
    // medians as well as bounding the observed range; peaks alone are not leaks.
    expect(median(resources.slice(middle))-median(resources.slice(0,middle))).toBeLessThanOrEqual(2);
    expect(Math.max(...resources)-Math.min(...resources)).toBeLessThanOrEqual(8);
    const events=worker.logs.trim().split(/\r?\n/).map(line=>JSON.parse(line));
    expect(events.filter(e=>e.event==="CLAIM")).toHaveLength(3);expect(events.filter(e=>e.event==="JOB_STARTED")).toHaveLength(3);
    expect(events.filter(e=>e.event==="PUBLICATION_RECONCILED")).toHaveLength(3);expect(Math.max(...events.map(e=>e.activeJobCount??0))).toBe(1);
    expect(events.length).toBeLessThan(120);expect(worker.messages.filter(m=>m.type==="blender")).toHaveLength(3);
    await stop(worker);expect(await worker.exited).toBe(0);
    // Restart completed work: startup recovery must not start another Blender.
    const restarted=start(undefined,{},true,true);await ready(restarted);await delay(2500);await stop(restarted);
    expect(restarted.messages.filter(m=>m.type==="blender")).toHaveLength(0);for(const id of ids)await complete(id);
    console.log(JSON.stringify({event:"SUPERVISOR_SOAK_ACCEPTED",durationMs:Date.now()-started,jobs:3,completionMs:completions,rssSpreadBytes:Math.max(...rss)-Math.min(...rss),resourceSpread:Math.max(...resources)-Math.min(...resources),events:events.length}));
  },360000);
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
    await until(() => worker.child.exitCode !== null, 35000); expect(await worker.exited).toBe(invalid.BLENDER_EXECUTABLE_PATH?69:64);
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
