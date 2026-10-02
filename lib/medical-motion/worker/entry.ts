import "server-only";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createMedicalMotionArtifactRuntime } from "../artifacts/runtime";
import { MEDICAL_MOTION_BUCKET, SupabasePrivateArtifactStorage, type PrivateArtifactStorage } from "../artifacts/storage";
import { readWorkerConfig } from "./config";
import { MedicalMotionWorkerHost, type WorkerEvent } from "./host";
import { createIsolatedMotionDatabase } from "./local-postgres";
import { verifyWorkerWorkspace } from "./workspace";

const TEST_HOST = "pmjuyyqofkdbgqmrdbuh.supabase.co";
export function isolatedStorageClient(env: NodeJS.ProcessEnv) {
  let target: URL;
  try { target = new URL(env.NEXT_PUBLIC_SUPABASE_URL!); } catch { throw Error("INVALID_ISOLATED_STORAGE"); }
  if (env.MEDICAL_MOTION_WORKER_ENVIRONMENT !== "isolated-test" || target.protocol !== "https:" ||
      target.hostname !== TEST_HOST || target.port || target.username || target.password ||
      target.pathname !== "/" || target.search || target.hash || !env.SUPABASE_SERVICE_ROLE_KEY) throw Error("INVALID_ISOLATED_STORAGE");
  return createClient(target.origin, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const destination = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      if (destination.protocol !== "https:" || destination.hostname !== TEST_HOST || destination.port || destination.username || destination.password)
        throw Error("STORAGE_TARGET_REJECTED");
      const timeout = AbortSignal.timeout(20000);
      const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
      try { return await fetch(input, { ...init, signal, redirect: "error" }); }
      catch { throw Error("ISOLATED_STORAGE_UNAVAILABLE"); }
    } },
  });
}
async function blenderReady(executable: string | undefined): Promise<boolean> {
  if (!executable || !existsSync(executable)) return false;
  return new Promise(resolve => {
    const child = spawn(executable, ["--version"], { windowsHide: true });
    let output = "";
    const timer = setTimeout(() => { child.kill(); resolve(false); }, 10000);
    child.stdout.on("data", chunk => { if (output.length < 4096) output += String(chunk); });
    child.stderr.resume();
    child.on("error", () => { clearTimeout(timer); resolve(false); });
    child.on("close", status => { clearTimeout(timer); resolve(status === 0 && /^Blender 5\.2\.1\b/.test(output)); });
  });
}
/** Trusted composition seams for process acceptance; never populated from a job payload. */
export type WorkerOverrides = { client?: SupabaseClient; storage?: PrivateArtifactStorage; log?: (event: WorkerEvent) => void };
export async function runIsolatedWorker(env: NodeJS.ProcessEnv = process.env, overrides: WorkerOverrides = {}) {
  let config: ReturnType<typeof readWorkerConfig>, database: ReturnType<typeof createIsolatedMotionDatabase>, cloud: SupabaseClient;
  try { config = readWorkerConfig(env); database = createIsolatedMotionDatabase(env); cloud = isolatedStorageClient(env); }
  catch { throw Object.assign(Error("INVALID_WORKER_CONFIGURATION"), {workerExitCode:64}); }
  const original = overrides.client ?? database.client;
  let claimTail = Promise.resolve();
  let host: MedicalMotionWorkerHost;
  // Serialize only claim RPCs; rendering/renewal retain their existing contracts.
  const client = { rpc: async (name: string, parameters: Record<string, unknown>) => {
    if (!name.startsWith("claim_")) {
      const response=await original.rpc(name, parameters);
      if(name==="publish_background_job_result"&&!response.error&&Array.isArray(response.data)&&response.data.some(row=>["applied","already-finalized"].includes(row.outcome)))host.log("PUBLICATION_RECONCILED",String(parameters.p_job_id));
      return response;
    }
    const previous = claimTail;
    let unlock!: () => void;
    claimTail = new Promise<void>(resolve => { unlock = resolve; });
    await previous;
    try { const response=host.signal.aborted ? { data: [], error: null } : await original.rpc(name, parameters);
      if(!response.error&&Array.isArray(response.data))for(const row of response.data)host.log("CLAIM",String(row.id));return response; }
    finally { unlock(); }
  } } as unknown as SupabaseClient;
  const storage = overrides.storage ?? new SupabasePrivateArtifactStorage(cloud);
  let runtime: ReturnType<typeof createMedicalMotionArtifactRuntime>;
  host = new MedicalMotionWorkerHost(config, {
    preflight: async () => {
      const blenderAvailable = await blenderReady(env.BLENDER_EXECUTABLE_PATH);
      host.dependenciesReady({blenderAvailable});
      if(!blenderAvailable)throw Object.assign(Error("BLENDER_UNAVAILABLE"),{workerExitCode:69});
      try { await verifyWorkerWorkspace(env,config.concurrency); } catch { throw Object.assign(Error("WORKSPACE_UNAVAILABLE"),{workerExitCode:78}); }
      const dbReachable = await database.readiness().catch(() => false);
      host.dependenciesReady({dbReachable});
      if(!dbReachable)throw Object.assign(Error("DATABASE_UNAVAILABLE"),{workerExitCode:75});
      const bucket = await cloud.storage.getBucket(MEDICAL_MOTION_BUCKET).catch(() => null);
      host.dependenciesReady({storageConfigured:!!bucket?.data&&!bucket.error&&bucket.data.public===false});
      if(!bucket?.data||bucket.error||bucket.data.public!==false)throw Object.assign(Error("STORAGE_UNAVAILABLE"),{workerExitCode:76});
      return { blenderAvailable, dbReachable, storageConfigured: !!bucket?.data && !bucket.error && bucket.data.public === false };
    },
    recover: async () => {
      await runtime.repository.recoverStaleJobs({ maximumJobs: config.pollBatch });
      const response = await client.rpc("resume_motion_worker_pending", { p_limit: config.pollBatch });
      if (response.error || !Array.isArray(response.data) || response.data.length !== 1 ||
          !Number.isInteger(response.data[0].resumed_count)) throw Error("RECOVERY_UNAVAILABLE");
    },
    processNext: () => runtime.worker.processNext(),
    log: overrides.log ?? (event => { process.stdout.write(JSON.stringify(event) + "\n"); }),
  });
  runtime = createMedicalMotionArtifactRuntime(client, { mode: "development", signal: host.signal }, storage, id => host.beginJob(id));
  const stop = () => host.stop();
  const message = (value: unknown) => {
    if (value === "shutdown") stop();
    if (value === "health" && process.connected && process.send) {
      try { process.send({ type: "health", state: host.health(),resources:{rssBytes:process.memoryUsage().rss,activeResources:process.getActiveResourcesInfo().length} }, () => {}); }
      catch { /* A diagnostic channel failure cannot alter execution ownership. */ }
    }
  };
  process.on("SIGINT", stop); process.on("SIGTERM", stop); process.on("message", message);
  try { return await host.run(); }
  finally { process.off("SIGINT", stop); process.off("SIGTERM", stop); process.off("message", message); }
}
