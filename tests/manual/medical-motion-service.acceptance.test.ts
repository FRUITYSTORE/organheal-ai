import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { configuration, sql } from "../helpers/medical-motion-postgres";
import { cleanupArtifactOwner } from "../helpers/medical-motion-artifacts";
import { client } from "../helpers/medical-motion-rpc";
import { contextContent } from "../helpers/medical-motion-context";
import { MedicalMotionJobRepository } from "@/lib/medical-motion/job.repository";
import { isolatedStorageClient } from "@/lib/medical-motion/worker/entry";
import { MEDICAL_MOTION_BUCKET, SupabasePrivateArtifactStorage } from "@/lib/medical-motion/artifacts/storage";
const root=path.join(process.env.ProgramData!,"OrganHealMedicalMotionTest");
const script=path.resolve("scripts/medical-motion-worker-service.ps1");
const cloud=isolatedStorageClient({...process.env,MEDICAL_MOTION_WORKER_ENVIRONMENT:"isolated-test"});
const storage=new SupabasePrivateArtifactStorage(cloud);
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check:()=>boolean|Promise<boolean>,timeout=90000){const end=Date.now()+timeout;while(Date.now()<end){if(await check())return;await wait(200);}throw Error("SERVICE_ACCEPTANCE_TIMEOUT");}
function ps(command:string){return execFileSync("powershell.exe",["-NoProfile","-Command",command],{encoding:"utf8",stdio:"pipe",timeout:60000});}
function service(action:string,...args:string[]){return execFileSync("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",script,"-Action",action,...args],{encoding:"utf8",stdio:"pipe",timeout:60000});}
function health(){try{return JSON.parse(readFileSync(path.join(root,"state/health.json"),"utf8"));}catch{return {};}}
function probes():{type:string;stage?:string;pid?:number}[]{try{return JSON.parse(readFileSync(path.join(root,"state/acceptance-probes.json"),"utf8"));}catch{return [];}}
function logs():Record<string,unknown>[]{const file=path.join(root,"logs/operations.jsonl");return existsSync(file)?readFileSync(file,"utf8").replace(/^\uFEFF/,"").trim().split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line)):[];}
function reset(){ps("$r=Join-Path $env:ProgramData 'OrganHealMedicalMotionTest';foreach($f in @('state/restart.json','state/acceptance-probes.json','state/health.json')){$p=Join-Path $r $f;if(Test-Path -LiteralPath $p){Remove-Item -LiteralPath $p}}");}
async function ready(){await until(()=>health().ready===true);expect(health()).toMatchObject({phase:"ready",recoveryComplete:true,sessionId:0,nonAdmin:true,blenderAvailable:true,dbReachable:true,storageConfigured:true});expect(JSON.parse(service("Status")).OperationalState).toBe('ready');}
function killWorker(){const h=health();if(!Number.isInteger(h.workerPid)||h.workerPid<1)throw Error("INVALID_OWNED_WORKER");ps(`$p=Get-CimInstance Win32_Process -Filter "ProcessId=${h.workerPid}";if($p.ParentProcessId -ne ${h.supervisorPid}){throw 'UNOWNED_WORKER'};Stop-Process -Id ${h.workerPid} -Force`);return h.workerPid;}
describe("actual isolated SCM service acceptance",()=>{
 let owner:string;
 beforeAll(async()=>{configuration();expect(ps("[Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)").trim()).toBe("True");expect(service("Install","-Acceptance")).toContain("SERVICE_INSTALLED");const bucket=await cloud.storage.getBucket(MEDICAL_MOTION_BUCKET);expect(bucket.data?.public).toBe(false);});
 beforeEach(async()=>{service("Stop");reset();service("Configure","-Acceptance");owner=randomUUID();await sql(`insert into auth.users(id) values('${owner}');`);});
 afterEach(async()=>{service("Stop");const captured=JSON.stringify(logs());expect(captured).not.toMatch(/sb_secret_|supabase\.co|postgres(?:ql)?:|clinicalMessage|localPath|stdout|stderr/);for(const secret of [process.env.SUPABASE_SERVICE_ROLE_KEY,decodeURIComponent(configuration().url.password)])if(secret)expect(captured.includes(secret)).toBe(false);
   for(const probe of probes().filter(p=>p.type==='blender')){let alive=false;try{process.kill(probe.pid!,0);alive=true;}catch{}expect(alive).toBe(false);}
   const ids=JSON.parse(await sql(`select coalesce(json_agg(id),'[]'::json)::text from public.medical_motion_artifacts where user_id='${owner}';`));for(const id of ids){if(!/^[0-9a-f-]{36}$/.test(id))throw Error("UNSAFE_CLEANUP_ID");if(await storage.read(id)){const deleted=await cloud.storage.from(MEDICAL_MOTION_BUCKET).remove([id]);if(deleted.error)throw Error("SCOPED_STORAGE_CLEANUP_FAILED");}}
   await cleanupArtifactOwner(owner);reset();service("Configure","-Acceptance");
 },120000);
 async function enqueue(){return (await new MedicalMotionJobRepository(client).enqueue(owner,randomUUID(),contextContent(),0)).jobId;}
 async function complete(id:string){await until(async()=>await sql(`select status from public.background_jobs where id='${id}';`)==="completed",150000);expect(await sql(`select count(*) from public.background_job_results where job_id='${id}';`)).toBe("1");expect(await sql(`select count(*) from public.medical_motion_artifacts where job_id='${id}' and persisted_at is not null;`)).toBe("1");}
 it("SCM Session 0 restricted account completes one real isolated job",async()=>{service("Start");await ready();const id=await enqueue();await complete(id);expect(probes().filter(p=>p.type==='blender')).toHaveLength(1);},180000);
 it("multiple service jobs retain concurrency one and exactly one result",async()=>{service("Start");await ready();const ids=[await enqueue(),await enqueue(),await enqueue()];for(const id of ids)await complete(id);expect(probes().filter(p=>p.type==='blender')).toHaveLength(3);expect(Math.max(...logs().map(e=>Number(e.activeJobCount)||0))).toBe(1);},240000);
 it.each(["render","after-upload","registry","before-publication"])("worker crash at %s auto-restarts and fences stale publication",async stage=>{
   service("Configure","-Acceptance","-TestStage",stage);service("Start");await ready();const id=await enqueue();await until(()=>probes().some(p=>p.stage===stage));const token=await sql(`select attempt_token::text from public.background_jobs where id='${id}';`);
   const oldBlender=probes().filter(p=>p.type==='blender').map(p=>p.pid!);
   await sql(`update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id='${id}' and status='running';`);const old=killWorker();await until(()=>health().workerPid!==old&&health().ready===true);await complete(id);
   for(const pid of oldBlender){let alive=false;try{process.kill(pid,0);alive=true;}catch{}expect(alive).toBe(false);}
   expect(await sql(`set role service_role;select outcome from public.publish_background_job_result('${id}','${token}','artifact',(select medical_motion_artifact_id from public.background_job_results where job_id='${id}'));`)).toBe("ownership-lost");
 },240000);
 it("graceful SCM stop cancels active rendering and restart recovers",async()=>{service("Configure","-Acceptance","-TestStage","render");service("Start");await ready();const id=await enqueue();await until(()=>probes().some(p=>p.stage==='render'));const before=Date.now();service("Stop");expect(Date.now()-before).toBeLessThan(35000);expect(JSON.parse(service("Status")).OperationalState).toBe('stopped');expect(health().ready).toBe(false);expect(await sql(`select count(*) from public.background_job_results where job_id='${id}';`)).toBe("0");await sql(`update public.background_jobs set available_at=clock_timestamp(),lease_expires_at=clock_timestamp()-interval '1 second' where id='${id}' and status in ('running','retrying');`);service("Configure","-Acceptance");service("Start");await ready();await complete(id);},240000);
 it.each(["blender","workspace","secret","database","storage"])("startup %s failure refuses claims and exhausts bounded retries",async failure=>{service("Configure","-Acceptance","-Failure",failure);const id=await enqueue();const before=logs().length;service("Start");await until(()=>service("Status").includes('"State":"Stopped"'),120000);expect(health().ready).toBe(false);expect(await sql(`select status from public.background_jobs where id='${id}';`)).toBe("pending");const emitted=logs().slice(before);expect(emitted.filter(e=>e.code==='RESTART_BUDGET_EXHAUSTED')).toHaveLength(1);expect(emitted.some(e=>e.event==='CLAIM')).toBe(false);expect(JSON.parse(readFileSync(path.join(root,"state/restart.json"),"utf8"))).toHaveLength(3);
   const expected:Record<string,string>={blender:'BLENDER_UNAVAILABLE',workspace:'DISK_RESERVE_LOW',secret:'SERVICE_CONFIGURATION_FAILED',database:'DATABASE_READINESS_FAILED',storage:'STORAGE_READINESS_FAILED'};
   expect(emitted.filter(e=>e.code===expected[failure]&&e.severity==='CRITICAL')).toHaveLength(1);expect(emitted.filter(e=>e.code==='UNUSUAL_RESTART')).toHaveLength(1);
 },180000);
 it("native host crash triggers SCM restart and kills the owned process tree",async()=>{
   service("Start");await ready();const oldHealth=health(),oldService=JSON.parse(service("Status")).ProcessId;
   ps(`$s=Get-CimInstance Win32_Service -Filter "Name='OrganHealMedicalMotionTest'";if($s.ProcessId -ne ${oldService}){throw 'UNOWNED_SERVICE_PROCESS'};Stop-Process -Id ${oldService} -Force`);
   await until(()=>JSON.parse(service("Status")).ProcessId!==oldService&&health().workerPid!==oldHealth.workerPid&&health().ready===true);
   for(const pid of [oldHealth.workerPid,oldHealth.supervisorPid]){let alive=false;try{process.kill(pid,0);alive=true;}catch{}expect(alive).toBe(false);}
 },120000);
 it("service configuration and ACL exclude broad readers and secret arguments",()=>{
   const status=JSON.parse(ps("$s=Get-CimInstance Win32_Service -Filter \"Name='OrganHealMedicalMotionTest'\";[pscustomobject]@{Account=$s.StartName;Auto=$s.StartMode;Command=$s.PathName}|ConvertTo-Json -Compress"));
   expect(status.Account).toBe('NT SERVICE\\OrganHealMedicalMotionTest');expect(status.Auto).toBe('Auto');expect(status.Command.replaceAll('"','')).toBe(path.join(root,'MedicalMotionServiceHost.exe'));
   const acl=JSON.parse(ps("$r=Join-Path $env:ProgramData 'OrganHealMedicalMotionTest';@((Get-Acl -LiteralPath (Join-Path $r 'service-config.bin')).Access|ForEach-Object {$_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value})|ConvertTo-Json -Compress"));
   expect(acl).not.toContain('S-1-1-0');expect(acl).not.toContain('S-1-5-11');expect(acl).not.toContain('S-1-5-32-545');
 });
 it("unexpected Node supervisor death uses the bounded SCM recovery path",async()=>{
   service("Start");await ready();const old=health(),native=JSON.parse(service("Status")).ProcessId;
   ps(`$p=Get-CimInstance Win32_Process -Filter "ProcessId=${old.supervisorPid}";if($p.ParentProcessId -ne ${native}){throw 'UNOWNED_SUPERVISOR'};Stop-Process -Id ${old.supervisorPid} -Force`);
   await until(()=>JSON.parse(service("Status")).ProcessId!==native&&health().supervisorPid!==old.supervisorPid&&health().ready===true);
   let alive=false;try{process.kill(old.workerPid,0);alive=true;}catch{}expect(alive).toBe(false);
 },120000);
 it("owned install stop uninstall reinstall is idempotent",async()=>{expect(service("Install","-Acceptance")).toContain('SERVICE_INSTALLED');service("Start");await ready();expect(service("Install","-Acceptance")).toContain('SERVICE_ALREADY_INSTALLED');service("Restart");await ready();service("Stop");service("Uninstall");expect(service("Status")).toContain('"Installed":false');service("Install","-Acceptance");service("Start");await ready();},180000);
});
