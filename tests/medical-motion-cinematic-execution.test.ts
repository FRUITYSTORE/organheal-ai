import { expect,it,vi } from "vitest";
import { randomUUID } from "node:crypto";
const ready=vi.hoisted(()=>new WeakSet<object>());
vi.mock("../lib/medical-motion/cinematic-master-runtime",async original=>({
  ...await original<typeof import("../lib/medical-motion/cinematic-master-runtime")>(),
  isReadyCinematicMaster:(v:unknown)=>!!v&&typeof v==="object"&&ready.has(v),
}));
import { CINEMATIC_MASTER_MODULES,CINEMATIC_MASTER_SOURCE_PROFILES,type ReadyCinematicMaster } from "../lib/medical-motion/cinematic-master-runtime";
import { sourceProfileSnapshot } from "../lib/medical-motion/source-profiles";
import { HEART_CINEMATIC_EXPLAINER_V1 } from "../lib/medical-motion/cinematic-guidance";
import { authorizeCinematicTimeline } from "../lib/medical-motion/composition/cinematic-timeline-specification";
import { compileCinematicExecution,isCompiledCinematicExecution } from "../lib/medical-motion/cinematic-scene-compiler";
import { executeOwnedCinematic,type CinematicExecutorConfig } from "../lib/medical-motion/render/cinematic-runtime";
import { ExecutionOwnership } from "../lib/jobs/execution-ownership";
function fixture(){
  const masters=HEART_CINEMATIC_EXPLAINER_V1.scenes.map(s=>{
    const m:ReadyCinematicMaster={module:CINEMATIC_MASTER_MODULES[s.masterId],profile:sourceProfileSnapshot(CINEMATIC_MASTER_SOURCE_PROFILES.resolve(s.sourceProfile)),
      runtimeOutputProfileId:"CINEMATIC_PORTRAIT_1080X1920_24_V1",usage:"internal-review",patientFacing:false,sourcePath:"test-only"};
    ready.add(m);return m;
  });return {masters,timeline:authorizeCinematicTimeline(HEART_CINEMATIC_EXPLAINER_V1,masters)};
}
it("issues exact executable master scenes with one source each",()=>{
  const f=fixture(),c=compileCinematicExecution(f.timeline,f.masters),again=compileCinematicExecution(f.timeline,f.masters);
  expect(c.fingerprint).toBe(again.fingerprint);expect(isCompiledCinematicExecution(c)).toBe(true);
  expect(c.scenes.map(s=>s.sourceCount)).toEqual([1,1,1,1,1,1]);
  expect(c.scenes[2].camera.preset).toBe("GUIDED_APPROACH");expect(c.scenes[5].camera.preset).toBe("CONTROLLED_REORIENT");
  expect(c).toMatchObject({usage:"internal-review",patientFacing:false,timeline:{frameCount:276,duration:11.5}});
  expect(isCompiledCinematicExecution(JSON.parse(JSON.stringify(c)))).toBe(false);
});
it("planner JSON and wrong master readiness cannot compile",()=>{
  const f=fixture();expect(()=>compileCinematicExecution({...f.timeline},f.masters)).toThrow("MASTER_AUTHORITY_INVALID");
  f.masters[0]={...f.masters[0]};expect(()=>compileCinematicExecution(f.timeline,f.masters)).toThrow("MASTER_AUTHORITY_INVALID");
});
it("planner cannot reach ownership operation or process spawn",async()=>{
  const ownership=new ExecutionOwnership({jobId:randomUUID(),attemptToken:randomUUID()},{renewLease:vi.fn(),publish:vi.fn()});
  const run=vi.spyOn(ownership,"run");
  const f=fixture(),c=compileCinematicExecution(f.timeline,f.masters);
  await expect(executeOwnedCinematic(ownership,{...c},{} as CinematicExecutorConfig,new AbortController().signal)).rejects.toThrow("MASTER_AUTHORITY_INVALID");
  expect(run).not.toHaveBeenCalled();
});
