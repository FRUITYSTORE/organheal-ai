import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { client } from "../helpers/medical-motion-rpc";
import { configuration, sql } from "../helpers/medical-motion-postgres";
import { artifactSchema, cleanupArtifactOwner } from "../helpers/medical-motion-artifacts";
import { contextContent } from "../helpers/medical-motion-context";
import { MedicalMotionJobRepository } from "@/lib/medical-motion/job.repository";
import { BackgroundJobWorkerRepository, type DurableBackgroundJob } from "@/lib/jobs/background-job-worker.repository";
import { BackgroundJobResultRepository } from "@/lib/jobs/background-job-result.repository";
import { MedicalMotionArtifactRepository, ArtifactError } from "@/lib/medical-motion/artifacts/repository";
import { MedicalMotionArtifactService } from "@/lib/medical-motion/artifacts/service";
import { SupabasePrivateArtifactStorage, MEDICAL_MOTION_BUCKET } from "@/lib/medical-motion/artifacts/storage";
import { createArtifactOwnership, discardArtifact, type ArtifactOwnership } from "@/lib/medical-motion/render/artifact-output";
import { recordCandidateOwnership } from "@/lib/medical-motion/render/execution-resources";
import { createMedicalMotionArtifactRuntime } from "@/lib/medical-motion/artifacts/runtime";

// Explicit manual acceptance harness: secrets remain in process environment. All HTTP
// requests, including redirects, are confined to the explicitly approved host.
const nativeFetch=globalThis.fetch.bind(globalThis);
function checkedUrl(value:string|undefined){try{return new URL(value!);}catch{throw Error("Unsafe acceptance URL metadata.");}}
const target=checkedUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const productionLine=readFileSync(".env.local","utf8").split(/\r?\n/).find(x=>/^NEXT_PUBLIC_SUPABASE_URL=/.test(x));
const production=checkedUrl(productionLine?.slice(productionLine.indexOf("=")+1).trim().replace(/^["']|["']$/g,""));
if(target.protocol!=="https:"||target.hostname!=="pmjuyyqofkdbgqmrdbuh.supabase.co"||target.hostname===production.hostname||target.username||target.password)throw Error("Unsafe provider acceptance target.");
const safeFetch:typeof fetch=async(input,init)=>{
  const u=new URL(typeof input==="string"?input:input instanceof URL?input.href:input.url);
  if(u.protocol!=="https:"||u.hostname!==target.hostname)throw Error("Unexpected acceptance host.");
  try{return await nativeFetch(input,{...init,redirect:"error",signal:init?.signal??AbortSignal.timeout(20000)});}
  catch{throw Error("Isolated provider request unavailable.");}
};
const make=(key:string)=>createClient(target.href,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:safeFetch}});
const admin=make(process.env.SUPABASE_SERVICE_ROLE_KEY!),anon=make(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
const sha=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const signal=()=>new AbortController().signal;

describe("real isolated Storage + local PostgreSQL acceptance",()=>{
  let owner:string,job:DurableBackgroundJob,repo:MedicalMotionArtifactRepository,storage:SupabasePrivateArtifactStorage,service:MedicalMotionArtifactService;
  let ordinary:SupabaseClient,remoteUser:string|undefined;
  const committed=new Set<string>(),pending=new Set<string>(),owned:ArtifactOwnership[]=[];
  beforeAll(async()=>{
    configuration();expect((await sql("show server_version;")).startsWith("17.11")).toBe(true);await artifactSchema();
    const bucket=await admin.storage.getBucket(MEDICAL_MOTION_BUCKET);expect(!bucket.error&&bucket.data?.id===MEDICAL_MOTION_BUCKET&&bucket.data.public===false).toBe(true);
    const email=`motion-${randomUUID()}@example.test`,password=randomUUID()+randomUUID();
    const created=await admin.auth.admin.createUser({email,password,email_confirm:true});
    if(created.error||!created.data.user)throw Error("Isolated ordinary test user creation failed.");remoteUser=created.data.user.id;
    ordinary=make(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    const login=await ordinary.auth.signInWithPassword({email,password});if(login.error)throw Error("Isolated ordinary test login failed.");
  },60000);
  beforeEach(async()=>{
    if(pending.size)throw Error("Ambiguous provider write preserved; stop further acceptance writes.");
    owner=randomUUID();await sql(`insert into auth.users(id) values('${owner}');`);
    const q=await new MedicalMotionJobRepository(client).enqueue(owner,randomUUID(),contextContent(),0);
    job=(await new BackgroundJobWorkerRepository(client,["medical-motion-render"]).claimById(q.jobId))!;
    repo=new MedicalMotionArtifactRepository(client);storage=new SupabasePrivateArtifactStorage(admin);service=new MedicalMotionArtifactService(repo,storage);
    const put=storage.put.bind(storage);
    vi.spyOn(storage,"put").mockImplementation(async(key,bytes,mime)=>{
      if(!committed.has(key))pending.add(key);
      await put(key,bytes,mime);const read=await storage.read(key);
      if(!read||sha(read.bytes)!==sha(bytes)||read.contentType!==mime)throw Error("Unknown test object outcome; preserve for review.");
      committed.add(key);pending.delete(key);
    });
  });
  afterEach(async()=>{
    // If a write/readback outcome is unknown, retain its row, local candidate
    // and remote object rather than guessing that deletion is safe.
    if(pending.size)throw Error("Ambiguous test resources preserved; scoped reconciliation required.");
    vi.restoreAllMocks();for(const item of owned)await discardArtifact(item);owned.length=0;
    // Never list/broad-delete. Only exact UUIDs read back after our successful writes.
    for(const id of committed){const result=await admin.storage.from(MEDICAL_MOTION_BUCKET).remove([id]);if(result.error)throw Error("Scoped test object cleanup failed.");if(await new SupabasePrivateArtifactStorage(admin).read(id))throw Error("Scoped test object cleanup not confirmed.");}
    committed.clear();if(owner)await cleanupArtifactOwner(owner);
  },60000);
  afterAll(async()=>{if(remoteUser){if(ordinary){const session=await ordinary.auth.signOut({scope:"global"});if(session.error)throw Error("Scoped synthetic session cleanup failed.");}const r=await admin.auth.admin.deleteUser(remoteUser);if(r.error)throw Error("Scoped synthetic auth user cleanup failed.");}},30000);
  async function candidate(color="red"){
    const item=await createArtifactOwnership("acceptance.png","still");owned.push(item);
    const bytes=await sharp({create:{width:8,height:8,channels:3,background:color}}).png().toBuffer();await writeFile(item.outputPath,bytes);
    const c=Object.freeze({localPath:item.outputPath,media:"still" as const,executionSeconds:1,discard:()=>discardArtifact(item)});
    recordCandidateOwnership(c,item,{width:8,height:8},{jobId:job.id,userId:job.userId,attemptToken:job.attemptToken});return {c,bytes};
  }
  const publish=(id:string)=>new BackgroundJobResultRepository(client).publish({jobId:job.id,attemptToken:job.attemptToken,manifest:{kind:"artifact",referenceId:id}});
  it("PNG readback matches actual bytes, SHA, size, MIME and opaque identity",async()=>{
    const {c,bytes}=await candidate(),a=await service.handoff(job,c,signal()),r=await storage.read(a.id);
    expect(a.id).toMatch(/^[0-9a-f-]{36}$/);expect(r?.contentType).toBe("image/png");expect(r?.bytes.equals(bytes)).toBe(true);expect(a.sha256).toBe(sha(bytes));expect(a.byteSize).toBe(bytes.length);
  },30000);
  it("real info returns custom SHA, MIME and size; missing object and private metadata are explicit",async()=>{
    const {c,bytes}=await candidate(),a=await service.handoff(job,c,signal());
    expect(await storage.inspect(a.id)).toEqual({byteSize:bytes.length,contentType:"image/png",sha256:sha(bytes)});
    expect(await storage.inspect(randomUUID())).toBeUndefined();
    const denied=await anon.storage.from(MEDICAL_MOTION_BUCKET).info(a.id);expect(!!denied.error&&!denied.data).toBe(true);
    vi.spyOn(admin.storage,"from").mockImplementationOnce(()=>{throw Error("TEST PRIVATE PROVIDER DIAGNOSTIC");});
    await expect(storage.inspect(a.id)).rejects.toThrow(/^ARTIFACT_STORAGE_UNAVAILABLE$/);
  },30000);
  it("public and anonymous fetch cannot read an existing UUID",async()=>{
    const a=await service.handoff(job,(await candidate()).c,signal());
    const publicRead=await safeFetch(new URL(`/storage/v1/object/public/${MEDICAL_MOTION_BUCKET}/${a.id}`,target));expect(publicRead.ok).toBe(false);
    const r=await anon.storage.from(MEDICAL_MOTION_BUCKET).download(a.id);expect(!!r.error&&!r.data).toBe(true);
  },30000);
  it("ordinary authenticated user cannot list, read, or overwrite artifacts",async()=>{
    const a=await service.handoff(job,(await candidate()).c,signal());
    const listed=await ordinary.storage.from(MEDICAL_MOTION_BUCKET).list();expect(!!listed.error||listed.data?.length===0).toBe(true);
    expect(!!(await ordinary.storage.from(MEDICAL_MOTION_BUCKET).download(a.id)).error).toBe(true);
    expect(!!(await ordinary.storage.from(MEDICAL_MOTION_BUCKET).upload(a.id,Buffer.from("different"),{upsert:true,contentType:"image/png"})).error).toBe(true);
    expect(sha((await storage.read(a.id))!.bytes)).toBe(a.sha256);
  },30000);
  it("actual production adapter prevents service overwrite",async()=>{
    const a=await service.handoff(job,(await candidate()).c,signal());await expect(storage.put(a.id,Buffer.from("different"),"image/png")).rejects.toThrow(/^ARTIFACT_STORAGE_UNAVAILABLE$/);
    expect(sha((await storage.read(a.id))!.bytes)).toBe(a.sha256);
  },30000);
  it("same bytes replay retains one registry identity and object",async()=>{
    const {c}=await candidate(),a=await service.handoff(job,c,signal()),b=await service.handoff(job,c,signal());expect(a.id).toBe(b.id);expect((await repo.list(job)).length).toBe(1);expect(committed.size).toBe(1);
  },30000);
  it("conflicting bytes cannot overwrite, publish, or complete",async()=>{
    const a=await service.handoff(job,(await candidate()).c,signal());await expect(service.handoff(job,(await candidate("blue")).c,signal())).rejects.toThrow(/^ARTIFACT_CONFLICT$/);
    expect(sha((await storage.read(a.id))!.bytes)).toBe(a.sha256);expect(await service.retrieval(job.id,owner)).toBeUndefined();expect(await sql(`select status from public.background_jobs where id='${job.id}';`)).toBe("running");
  },30000);
  it("lost upload response reconciles committed real bytes",async()=>{
    const put=storage.put.bind(storage);vi.spyOn(storage,"put").mockImplementationOnce(async(...args)=>{await put(...args);throw new ArtifactError("ARTIFACT_STORAGE_UNAVAILABLE");});
    const a=await service.handoff(job,(await candidate()).c,signal());expect(a.persisted).toBe(true);expect(committed.size).toBe(1);
  },30000);
  it("upload survives lost registry response and service restart",async()=>{
    const persist=repo.persist.bind(repo);vi.spyOn(repo,"persist").mockImplementationOnce(async(...args)=>{await persist(...args);throw new ArtifactError("ARTIFACT_STATE_UNKNOWN");});
    await expect(service.handoff(job,(await candidate()).c,signal())).rejects.toThrow(/^ARTIFACT_STATE_UNKNOWN$/);
    const a=await new MedicalMotionArtifactService(new MedicalMotionArtifactRepository(client),new SupabasePrivateArtifactStorage(admin)).reconcile(job,signal());expect(a?.persisted).toBe(true);expect(committed.size).toBe(1);
  },30000);
  it("orphan is invisible and wrong owner cannot resolve or adopt it",async()=>{
    vi.spyOn(repo,"persist").mockRejectedValueOnce(new ArtifactError("ARTIFACT_STATE_UNKNOWN"));await expect(service.handoff(job,(await candidate()).c,signal())).rejects.toThrow();
    expect(await service.retrieval(job.id,owner)).toBeUndefined();expect(await service.retrieval(job.id,randomUUID())).toBeUndefined();
    await expect(service.reconcile({...job,userId:randomUUID()},signal())).rejects.toThrow(/^ARTIFACT_OWNERSHIP_LOST$/);expect((await repo.list(job)).length).toBe(1);
  },30000);
  it("real object registry publication completes with actual FK and identical replay",async()=>{
    const a=await service.handoff(job,(await candidate()).c,signal());expect((await publish(a.id)).outcome).toBe("applied");expect((await publish(a.id)).outcome).toBe("already-finalized");
    expect(await sql(`select reference_id=medical_motion_artifact_id from public.background_job_results where job_id='${job.id}';`)).toBe("t");expect(await sql(`select status from public.background_jobs where id='${job.id}';`)).toBe("completed");
    expect((await service.retrieval(job.id,owner))?.id).toBe(a.id);expect(await service.retrieval(job.id,randomUUID())).toBeUndefined();
  },30000);
  it("expired ownership prevents publication of real durable bytes",async()=>{
    const a=await service.handoff(job,(await candidate()).c,signal());await sql(`update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id='${job.id}';`);expect((await publish(a.id)).outcome).toBe("ownership-lost");expect(await service.retrieval(job.id,owner)).toBeUndefined();
  },30000);
  it("late real upload after shutdown cannot register or publish",async()=>{
    const controller=new AbortController(),put=storage.put.bind(storage);vi.spyOn(storage,"put").mockImplementationOnce(async(...args)=>{await put(...args);controller.abort();});
    await expect(service.handoff(job,(await candidate()).c,controller.signal)).rejects.toThrow(/^ARTIFACT_OWNERSHIP_LOST$/);expect((await repo.list(job))[0].persisted).toBe(false);expect(await service.retrieval(job.id,owner)).toBeUndefined();
  },30000);
  it("already lost ownership performs no upload",async()=>{const c=(await candidate()).c,controller=new AbortController();controller.abort();await expect(service.handoff(job,c,controller.signal)).rejects.toThrow(/^ARTIFACT_OWNERSHIP_LOST$/);expect(committed.size).toBe(0);});
  it("actual missing-object response normalizes to absence without diagnostics",async()=>{expect(await storage.read(randomUUID())).toBeUndefined();},30000);
  it("minimal real Blender MP4 persists through real Storage to completed job",async()=>{
    // Requeue the claimed local test job under a fresh valid attempt.
    await new BackgroundJobWorkerRepository(client,["medical-motion-render"]).scheduleRetry({jobId:job.id,attemptToken:job.attemptToken,retryDelayMs:0,errorMessage:"TEST_ACCEPTANCE"});
    vi.stubEnv("MEDICAL_MOTION_RENDER_SCRIPT",path.resolve("tests/fixtures/medical-motion-handler-smoke.py"));
    try{const runtime=createMedicalMotionArtifactRuntime(client,{mode:"development"},storage);await runtime.worker.processById(job.id);
      const a=await runtime.artifacts.retrieval(job.id,owner);
      if(!a){const state=await sql(`select status||':'||coalesce(last_error,'NONE') from public.background_jobs where id='${job.id}';`);if(/^[a-z-]+:[A-Z_]+$/.test(state))throw Error(`BLENDER_PROVIDER_E2E_${state}`);throw Error("BLENDER_PROVIDER_E2E_UNKNOWN");}
      expect(a.media).toBe("video");const bytes=await storage.read(a.id);expect(bytes?.contentType).toBe("video/mp4");expect(bytes?.bytes.length).toBe(a.byteSize);expect(sha(bytes!.bytes)).toBe(a.sha256);
      expect(await sql(`select status from public.background_jobs where id='${job.id}';`)).toBe("completed");
    }finally{vi.unstubAllEnvs();}
  },120000);
});
