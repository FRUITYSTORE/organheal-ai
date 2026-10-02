import { spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, writeFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { statfs,writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it,vi } from "vitest";
import vm from "node:vm";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { MedicalMotionWorkerHost } from "@/lib/medical-motion/worker/host";
import { readWorkerConfig } from "@/lib/medical-motion/worker/config";
import { verifyWorkerWorkspace } from "@/lib/medical-motion/worker/workspace";
vi.mock("node:fs/promises",async()=>{const actual=await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");return {...actual,statfs:vi.fn(actual.statfs),writeFile:vi.fn(actual.writeFile)};});

describe("supervised worker packaging",()=>{
  it("rejects an unrelated telemetry credential before worker imports",()=>{
    const exports:{load?:()=>unknown}={};vm.runInNewContext(readFileSync("scripts/medical-motion-package.cjs","utf8"),{
      require:createRequire(path.resolve("scripts/medical-motion-package.cjs")),__dirname:path.resolve("scripts"),exports,process:{versions:{node:"24.16.0"},env:{SENTRY_DSN:"sentinel"}}});
    try{exports.load!();throw Error("UNEXPECTED_ACCEPTANCE");}catch(error){expect((error as {workerExitCode:number}).workerExitCode).toBe(64);}
  });
  it.each(["traversal","hash","symlink"])("rejects package %s before execution",fault=>{
    const exports:{load?:()=>unknown}={};
    const realRequire=createRequire(path.resolve("scripts/medical-motion-package.cjs"));
    const hash=fault==="hash"?"0".repeat(64):createHash("sha256").update("not executable").digest("hex");
    const fakeFs={lstatSync:()=>({isSymbolicLink:()=>fault==="symlink",isDirectory:()=>true,isFile:()=>true}),statSync:()=>({size:1}),realpathSync:(file:string)=>file,
      readFileSync:(file:string)=>file.endsWith("manifest.json")?JSON.stringify({schemaVersion:1,nodeMajor:24,files:[{file:"lib/medical-motion/worker/entry.js",sha256:hash},...(fault==="traversal"?[{file:"lib/../../escape.js",sha256:hash}]:[])]}):"not executable"};
    vm.runInNewContext(readFileSync("scripts/medical-motion-package.cjs","utf8"),{require:(name:string)=>name==="node:fs"?fakeFs:realRequire(name),__dirname:path.resolve("scripts"),exports,process:{versions:{node:"24.16.0"},env:{}}});
    expect(()=>exports.load!()).toThrow();
  });
  it.each(["22.16.0","24.15.9","25.0.0"])("fails fast on unsupported Node %s",version=>{
    const exports:{load?:()=>unknown}={};vm.runInNewContext(readFileSync("scripts/medical-motion-package.cjs","utf8"),{
      require:createRequire(path.resolve("scripts/medical-motion-package.cjs")),__dirname:path.resolve("scripts"),exports,process:{versions:{node:version},env:{}}});
    try{exports.load!();throw Error("UNEXPECTED_ACCEPTANCE");}catch(error){expect((error as {workerExitCode:number}).workerExitCode).toBe(64);}
  });
  it("emits a deterministic JS closure and loads from neutral cwd without TypeScript",()=>{
    const build=path.resolve("scripts/build-medical-motion-worker.cjs"),launcher=path.resolve("scripts/medical-motion-package.cjs");
    expect(spawnSync(process.execPath,[build],{windowsHide:true}).status).toBe(0);
    const manifest=readFileSync("dist/medical-motion-worker/manifest.json","utf8");
    expect(spawnSync(process.execPath,[build],{windowsHide:true}).status).toBe(0);
    expect(readFileSync("dist/medical-motion-worker/manifest.json","utf8")).toBe(manifest);
    const code=`const M=require('module'),r=M._resolveFilename;M._resolveFilename=function(s,...a){if(s==='typescript'||s.endsWith('.ts'))throw Error();return r.call(this,s,...a)};const p=require(${JSON.stringify(launcher)}).load();if(typeof p.runIsolatedWorker!=='function')process.exit(1);`;
    expect(spawnSync(process.execPath,["-e",code],{cwd:tmpdir(),windowsHide:true,encoding:"utf8",env:{...process.env,PATH:"",NODE_PATH:"",ORGANHEAL_TEST_PSQL:undefined}}).status).toBe(0);
  },20000);
  it.each([64,69,75,76,78])("preserves sanitized startup exit category %s before claims",async workerExitCode=>{
    let claims=0;const host=new MedicalMotionWorkerHost(readWorkerConfig({}),{preflight:async()=>{throw Object.assign(Error("secret"),{workerExitCode});},recover:async()=>{},processNext:async()=>{claims++;return false;}});
    expect(host.health().phase).toBe("starting");expect((await host.run()).exitCode).toBe(workerExitCode);expect(host.health().phase).toBe("fatal");expect(claims).toBe(0);
  });
  it("rejects an unwritable output root without replacing existing content",async()=>{
    const directory=mkdtempSync(path.join(tmpdir(),"motion-package-test-")),file=path.join(directory,"occupied");
    try{writeFileSync(file,"sentinel");await expect(verifyWorkerWorkspace({MEDICAL_MOTION_OUTPUT_ROOT:file},1)).rejects.toThrow();expect(readFileSync(file,"utf8")).toBe("sentinel");}
    finally{if(directory.startsWith(path.join(tmpdir(),"motion-package-test-")))rmSync(directory,{recursive:true});}
  });
  it("rejects relative output roots",async()=>{await expect(verifyWorkerWorkspace({MEDICAL_MOTION_OUTPUT_ROOT:"relative"},1)).rejects.toThrow("WORKSPACE_UNAVAILABLE");});
  it("fails before writing a probe on insufficient free space",async()=>{
    vi.mocked(statfs).mockResolvedValueOnce({type:0,bsize:4096,blocks:0,bfree:0,bavail:0,files:0,ffree:0});
    const writes=vi.mocked(writeFile).mock.calls.length;
    await expect(verifyWorkerWorkspace({},1)).rejects.toThrow("WORKSPACE_UNAVAILABLE");expect(vi.mocked(writeFile).mock.calls.length).toBe(writes);
  });
  it("fails closed on service-account write denial",async()=>{
    vi.mocked(writeFile).mockRejectedValueOnce(Object.assign(Error("denied"),{code:"EACCES"}));
    await expect(verifyWorkerWorkspace({},1)).rejects.toThrow("denied");
  });
  it("removes its owned probes after successful workspace validation",async()=>{
    const directory=mkdtempSync(path.join(tmpdir(),"motion-package-test-"));
    try{await verifyWorkerWorkspace({MEDICAL_MOTION_OUTPUT_ROOT:directory},1);expect(readdirSync(directory)).toEqual([]);}
    finally{if(directory.startsWith(path.join(tmpdir(),"motion-package-test-")))rmSync(directory,{recursive:true});}
  });
  it("has a build-time TypeScript dependency only",()=>{
    expect(readFileSync("scripts/medical-motion-worker.cjs","utf8")).not.toContain("medical-motion-loader");
    const manifest=JSON.parse(readFileSync("dist/medical-motion-worker/manifest.json","utf8"));
    expect(manifest.files.every((item:{file:string})=>item.file.endsWith(".js")&&existsSync(path.join("dist/medical-motion-worker",item.file)))).toBe(true);
  });
});
