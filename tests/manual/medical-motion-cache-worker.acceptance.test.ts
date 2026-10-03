import {fork,spawn,type ChildProcess} from "node:child_process";
import {randomUUID} from "node:crypto";
import {writeFile,mkdtemp,realpath,lstat,rm} from "node:fs/promises";
import path from "node:path";
import {tmpdir} from "node:os";
import {beforeAll,beforeEach,afterEach,describe,it,expect} from "vitest";
import {artifactSchema,cleanupArtifactOwner} from "../helpers/medical-motion-artifacts";
import {configuration,sql} from "../helpers/medical-motion-postgres";
import {client} from "../helpers/medical-motion-rpc";
import {contextContent} from "../helpers/medical-motion-context";
import {MedicalMotionJobRepository} from "../../lib/medical-motion/job.repository";
import {isolatedStorageClient} from "../../lib/medical-motion/worker/entry";
import {SupabasePrivateArtifactStorage,MEDICAL_MOTION_BUCKET} from "../../lib/medical-motion/artifacts/storage";
type Probe={type:string;operation?:string;stage?:string;pid?:number;state?:{activeJobCount:number};resources?:{rssBytes:number;activeResources:number}};
type Running={child:ChildProcess;probes:Probe[];events:{disposition?:string;event:string;at:number}[];logs:string;exit:Promise<number|null>};
const environment={...process.env,MEDICAL_MOTION_WORKER_ENVIRONMENT:"isolated-test",MEDICAL_MOTION_WORKER_REUSE:"enabled",
 BLENDER_EXECUTABLE_PATH:"C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe",MEDICAL_MOTION_RENDER_SCRIPT:path.resolve("tests/fixtures/medical-motion-handler-smoke.py"),
 MEDICAL_MOTION_WORKER_IDLE_MS:"100",MEDICAL_MOTION_WORKER_RECOVERY_MS:"1000"};
const cloud=isolatedStorageClient(environment),storage=new SupabasePrivateArtifactStorage(cloud);
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function until(check:()=>boolean|Promise<boolean>,ms=120000){const end=Date.now()+ms;while(Date.now()<end){if(await check())return;await wait(100);}throw Error("ISOLATED_CACHE_ACCEPTANCE_TIMEOUT");}
describe("real provider packaged isolated cache worker acceptance",()=>{
 let owner:string,workspace:string;const workers:Running[]=[];
 beforeAll(async()=>{configuration();await artifactSchema();const bucket=await cloud.storage.getBucket(MEDICAL_MOTION_BUCKET);expect(bucket.data?.public).toBe(false);});
 beforeEach(async()=>{owner=randomUUID();workspace=await mkdtemp(path.join(tmpdir(),"organheal-cache-workspace-"));await sql(`insert into auth.users(id) values('${owner}');`);});
 function start(extra:Record<string,string|undefined>={}){
  const child=fork(path.resolve("scripts/medical-motion-worker.cjs"),[],{cwd:tmpdir(),env:{...environment,...extra,MEDICAL_MOTION_OUTPUT_ROOT:workspace},execArgv:["--require",path.resolve("tests/fixtures/medical-motion-cache-packaged-supervisor.cjs")],silent:true,...{windowsHide:true}});
  const w:Running={child,probes:[],events:[],logs:"",exit:new Promise(r=>child.once("exit",r))};let pending="";
  child.on("message",p=>w.probes.push(p as Probe));child.stdout!.on("data",chunk=>{w.logs+=String(chunk);pending+=String(chunk);const lines=pending.split("\n");pending=lines.pop()!;for(const line of lines){try{w.events.push({...JSON.parse(line),at:Date.now()});}catch{throw Error("UNSAFE_WORKER_OUTPUT");}}});
  child.stderr!.on("data",chunk=>{w.logs+=String(chunk);});workers.push(w);return w;
 }
 async function ready(w:Running){await until(()=>w.events.some(e=>e.event==="READY")||w.child.exitCode!==null);expect(w.child.exitCode).toBeNull();}
 async function stop(w:Running){if(w.child.exitCode===null){w.child.send("shutdown");await until(()=>w.child.exitCode!==null,35000);}expect(await w.exit).toBe(0);}
 async function kill(w:Running){if(w.child.exitCode!==null)return;const pid=w.child.pid;if(!pid||!workers.includes(w))throw Error("UNOWNED_PROCESS");await new Promise<void>((resolve,reject)=>{const p=spawn("taskkill",["/PID",String(pid),"/T","/F"],{windowsHide:true,stdio:"ignore"});p.on("error",()=>reject(Error("OWNED_TREE_CLEANUP_FAILED")));p.on("exit",()=>resolve());});await w.exit;}
 async function enqueue(){return (await new MedicalMotionJobRepository(client).enqueue(owner,randomUUID(),contextContent(),0)).jobId;}
 async function completed(id:string){await until(async()=>{const status=await sql(`select status from public.background_jobs where id='${id}';`);if(status==="failed")throw Error("CACHE_WORKER_JOB_FAILED");return status==="completed";});expect(await sql(`select count(*) from public.background_job_results where job_id='${id}';`)).toBe("1");}
 const count=(operation:string)=>workers.flatMap(w=>w.probes).filter(p=>p.type==="storage"&&p.operation===operation).length;
 const renders=()=>workers.flatMap(w=>w.probes).filter(p=>p.type==="blender").length;
 afterEach(async()=>{
  for(const w of workers){await kill(w);expect(w.logs).not.toMatch(/sb_secret_|sb_publishable_|postgres(?:ql)?:|supabase\.co|clinicalMessage|localPath/);for(const secret of [process.env.SUPABASE_SERVICE_ROLE_KEY,decodeURIComponent(configuration().url.password)])if(secret)expect(w.logs.includes(secret)).toBe(false);
   for(const probe of w.probes.filter(p=>p.type==="blender")){let alive=false;try{process.kill(probe.pid!,0);alive=true;}catch{}expect(alive).toBe(false);}}
  workers.length=0;
  const rows=JSON.parse(await sql(`select coalesce(json_agg(id),'[]'::json)::text from public.medical_motion_artifacts where user_id='${owner}';`)) as string[];
  for(const id of rows){if(!/^[a-f0-9-]{36}$/.test(id))throw Error("UNSAFE_CLEANUP_ID");if(await storage.read(id)){const r=await cloud.storage.from(MEDICAL_MOTION_BUCKET).remove([id]);if(r.error)throw Error("EXACT_OBJECT_CLEANUP_FAILED");}expect(await storage.read(id)).toBeUndefined();}
  await cleanupArtifactOwner(owner);
  // Only our unique local root, after provider/registry outcomes and process
  // termination are confirmed. A failed/ambiguous prior check preserves it.
  const resolved=await realpath(workspace),parent=await realpath(tmpdir());
  if((await lstat(workspace)).isSymbolicLink()||path.dirname(resolved)!==parent||!path.basename(resolved).startsWith("organheal-cache-workspace-"))throw Error("UNSAFE_WORKSPACE_CLEANUP");
  await rm(resolved,{recursive:true});
 },120000);
 it("real miss, hit, three repeated hits, metadata-first/deep verification and bounded resources",async()=>{
  const w=start();await ready(w);const begin=Date.now(),a=await enqueue();await completed(a);const renderMs=Date.now()-begin;
  const ids=[a],hitMs:number[]=[];for(let i=0;i<4;i++){const before=Date.now(),id=await enqueue();ids.push(id);await completed(id);hitMs.push(Date.now()-before);w.child.send("health");}
  expect(renders()).toBe(1);expect(count("put")).toBe(1);expect(count("inspect")).toBe(5);
  expect(await sql(`select count(distinct reference_id),count(*) from public.background_job_results where job_id in(${ids.map(id=>`'${id}'`).join(",")});`)).toBe("1|5");
  const reads=count("read");await sql(`update public.medical_motion_reuse_keys set verified_at=clock_timestamp()-interval '16 minutes' where producer_job_id='${a}';`);
  const deep=await enqueue();await completed(deep);expect(count("read")).toBe(reads+1);expect(renders()).toBe(1);
  await until(()=>w.probes.filter(p=>p.type==="health").length>=4);const samples=w.probes.filter(p=>p.type==="health");
  expect(Math.max(...samples.map(p=>p.resources!.rssBytes))-Math.min(...samples.map(p=>p.resources!.rssBytes))).toBeLessThan(64*1024*1024);
  const resourceDelta=Math.max(...samples.map(p=>p.resources!.activeResources))-Math.min(...samples.map(p=>p.resources!.activeResources));expect(resourceDelta).toBeLessThanOrEqual(12);
  const cache=w.events.filter(e=>e.event==="MEDICAL_MOTION_CACHE"),hits=cache.filter(e=>e.disposition==="CACHE_HIT").length,misses=cache.filter(e=>e.disposition==="CACHE_MISS").length;
  expect(hits).toBe(5);expect(misses).toBe(1);expect(Math.max(...hitMs)).toBeLessThan(30000);
  const lookupMs:number[]=[];let lookupAt=0;for(const event of cache){if(event.disposition==="CACHE_LOOKUP")lookupAt=event.at;if(event.disposition==="CACHE_HIT")lookupMs.push(event.at-lookupAt);}
  const totals=await sql(`select (select count(*) from public.background_jobs where user_id='${owner}'),(select count(*) from public.medical_motion_artifacts where user_id='${owner}'),(select count(*) from public.background_job_results where job_id in(select id from public.background_jobs where user_id='${owner}'));`);
  const [jobs,durableArtifacts,publishedResults]=totals.split("|").map(Number);
  await writeFile(path.join(tmpdir(),"organheal-cache-runtime-baseline.json"),JSON.stringify({jobs,blenderExecutions:renders(),storageUploads:count("put"),durableArtifacts,publishedResults,hits,misses,renderMs,hitMs,lookupMs,resourceDelta,metadataInspections:count("inspect"),storageReads:count("read")}));await stop(w);
 },240000);
 it("concurrent packaged jobs converge on one render and independent publication",async()=>{
  const w=start({MEDICAL_MOTION_WORKER_CONCURRENCY:"2",MEDICAL_MOTION_WORKER_POLL_BATCH:"2"});await ready(w);const ids=await Promise.all([enqueue(),enqueue()]);for(const id of ids)await completed(id);
  expect(renders()).toBe(1);expect(count("put")).toBe(1);expect(await sql(`select count(*) from public.medical_motion_reuse_keys where producer_job_id in('${ids[0]}','${ids[1]}') and state='ready';`)).toBe("1");
  expect(w.events.some(e=>e.disposition==="CACHE_CONFLICT")).toBe(true);await stop(w);
 },240000);
 it.each(["reservation","render","after-upload","ready"])("real restart recovers interruption at %s",async stage=>{
  const w=start({ORGANHEAL_WORKER_TEST_STAGE:stage,...(stage==="render"?{ORGANHEAL_HANDLER_SMOKE_CANCEL:"1"}:{})});await ready(w);const id=await enqueue();await until(()=>w.probes.some(p=>p.stage===stage));
  const token=await sql(`select attempt_token::text from public.background_jobs where id='${id}';`);await kill(w);
  await sql(`update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second',available_at=clock_timestamp() where id='${id}' and status='running';`);
  const restart=start();await ready(restart);await completed(id);expect(count("put")).toBe(1);expect(await sql(`select count(*) from public.medical_motion_artifacts where user_id='${owner}';`)).toBe("1");
  expect(renders()).toBe(stage==="render"?2:1);
  expect(await sql(`set role service_role;select outcome from public.publish_background_job_result('${id}','${token}','artifact',(select reference_id from public.background_job_results where job_id='${id}'));`)).toBe("ownership-lost");await stop(restart);
 },240000);
 it("restart before reused publication fences old attempt without another render",async()=>{
  const initial=start();await ready(initial);await completed(await enqueue());await stop(initial);
  const paused=start({ORGANHEAL_WORKER_TEST_STAGE:"before-publication"});await ready(paused);const id=await enqueue();await until(()=>paused.probes.some(p=>p.stage==="before-publication"));await kill(paused);
  await sql(`update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id='${id}';`);
  const recovered=start();await ready(recovered);await completed(id);expect(renders()).toBe(1);expect(count("put")).toBe(1);await stop(recovered);
 },240000);
 it.each(["size","mime","digest","missing"])("real provider hit rejects %s integrity without publication",async fault=>{
  const initial=start();await ready(initial);const producer=await enqueue();await completed(producer);await stop(initial);
  if(fault==="missing"){const id=await sql(`select id::text from public.medical_motion_artifacts where job_id='${producer}';`);expect((await cloud.storage.from(MEDICAL_MOTION_BUCKET).remove([id])).error).toBeNull();}
  const rejecting=start({ORGANHEAL_CACHE_TEST_INTEGRITY:fault});await ready(rejecting);const id=await enqueue();await until(()=>rejecting.events.some(e=>e.disposition==="CACHE_INVALID"));await stop(rejecting);
  expect(await sql(`select count(*) from public.background_job_results where job_id='${id}';`)).toBe("0");expect(renders()).toBe(1);
 },240000);
 it.each(["metadata-loss","registry","publication"])("response loss %s reconciles without duplicate render/upload",async fault=>{
  if(fault==="metadata-loss"){const seed=start();await ready(seed);await completed(await enqueue());await stop(seed);}
  const w=start(fault==="metadata-loss"?{ORGANHEAL_CACHE_TEST_INTEGRITY:fault}:{ORGANHEAL_CACHE_TEST_RESPONSE_LOSS:fault});await ready(w);await completed(await enqueue());expect(renders()).toBe(1);expect(count("put")).toBe(1);await stop(w);
 },240000);
 it("explicit cache disable uses the normal packaged render path",async()=>{
  const w=start({MEDICAL_MOTION_WORKER_REUSE:"disabled"});await ready(w);await completed(await enqueue());await completed(await enqueue());expect(renders()).toBe(2);expect(count("put")).toBe(2);
  expect(w.events.some(e=>e.event==="MEDICAL_MOTION_CACHE")).toBe(false);expect(await sql(`select count(*) from public.medical_motion_reuse_keys where producer_job_id in(select id from public.background_jobs where user_id='${owner}');`)).toBe("0");await stop(w);
 },240000);
 it("invalid cache configuration refuses readiness and claims",async()=>{
  const id=await enqueue(),w=start({MEDICAL_MOTION_WORKER_REUSE:"true"});await until(()=>w.child.exitCode!==null,30000);
  expect(await w.exit).toBe(64);expect(w.events.some(e=>e.event==="READY"||e.event==="CLAIM")).toBe(false);
  expect(await sql(`select status from public.background_jobs where id='${id}';`)).toBe("pending");expect(renders()).toBe(0);expect(count("put")).toBe(0);
 },60000);
 it("actual unverified heart remains ineligible while normal development rendering works",async()=>{
  const w=start({ORGANHEAL_CACHE_TEST_ANATOMY:"actual"});await ready(w);await completed(await enqueue());await completed(await enqueue());
  expect(w.events.filter(e=>e.disposition==="CACHE_INELIGIBLE")).toHaveLength(2);expect(renders()).toBe(2);expect(count("put")).toBe(2);await stop(w);
 },240000);
 it("missing myocardium fails before cache or Blender in the packaged worker",async()=>{
  const w=start();await ready(w);const id=(await new MedicalMotionJobRepository(client).enqueue(owner,randomUUID(),contextContent("myocardialOxygenDemandSupply"),0)).jobId;
  await until(async()=>await sql(`select status from public.background_jobs where id='${id}';`)==="failed");
  expect(renders()).toBe(0);expect(count("put")).toBe(0);expect(w.events.some(e=>e.event==="MEDICAL_MOTION_CACHE")).toBe(false);await stop(w);
 },120000);
 it.each(["license","anatomy","asset"])("current TEST %s revocation/version change cannot use old artifact",async kind=>{
  const initial=start();await ready(initial);const first=await enqueue();await completed(first);await stop(initial);
  const changed=start({ORGANHEAL_CACHE_TEST_REVOCATION:kind});await ready(changed);const id=await enqueue();
  await until(async()=>["failed","completed"].includes(await sql(`select status from public.background_jobs where id='${id}';`)));
  expect(changed.events.some(e=>e.disposition==="CACHE_HIT")).toBe(false);
  expect(await sql(`select count(*) from public.background_job_results a join public.background_job_results b on a.reference_id=b.reference_id where a.job_id='${first}' and b.job_id='${id}';`)).toBe("0");
  if(kind==="license")expect(await sql(`select status from public.background_jobs where id='${id}';`)).toBe("failed");await stop(changed);
 },240000);
 it("invalidated canonical artifact gets a new generation without overwriting old bytes",async()=>{
  const w=start();await ready(w);const first=await enqueue();await completed(first);
  await sql(`update public.medical_motion_reuse_keys set state='invalid' where producer_job_id='${first}';`);
  const second=await enqueue();await completed(second);expect(renders()).toBe(2);expect(count("put")).toBe(2);
  expect(await sql(`select count(*) from public.medical_motion_reuse_keys where producer_job_id='${second}' and state='ready' and epoch=2;`)).toBe("1");await stop(w);
 },240000);
});
