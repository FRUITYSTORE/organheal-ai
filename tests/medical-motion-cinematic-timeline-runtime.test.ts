import { expect, it, vi } from "vitest";
const trusted=vi.hoisted(()=>new WeakSet<object>());
// Isolate timeline compilation from filesystem readiness. The actual readiness
// boundary has independent negative/source tests in cinematic-runtime.test.ts.
vi.mock("../lib/medical-motion/cinematic-master-runtime",async importOriginal=>{
  const original=await importOriginal<typeof import("../lib/medical-motion/cinematic-master-runtime")>();
  return {...original,isReadyCinematicMaster:(v:unknown)=>!!v && typeof v==="object" && trusted.has(v)};
});
import { CINEMATIC_MASTER_MODULES, CINEMATIC_MASTER_SOURCE_PROFILES, type ReadyCinematicMaster } from "../lib/medical-motion/cinematic-master-runtime";
import { sourceProfileSnapshot } from "../lib/medical-motion/source-profiles";
import { HEART_CINEMATIC_EXPLAINER_V1 } from "../lib/medical-motion/cinematic-guidance";
import { authorizeCinematicTimeline,isAuthorizedCinematicTimeline } from "../lib/medical-motion/composition/cinematic-timeline-specification";
import { cinematicCompositionFilters } from "../lib/medical-motion/composition/cinematic-composition-contract";
function masters(){return HEART_CINEMATIC_EXPLAINER_V1.scenes.map(s=>{
  const value:ReadyCinematicMaster={module:CINEMATIC_MASTER_MODULES[s.masterId],
    profile:sourceProfileSnapshot(CINEMATIC_MASTER_SOURCE_PROFILES.resolve(s.sourceProfile)),
    runtimeOutputProfileId:"CINEMATIC_PORTRAIT_1080X1920_24_V1",usage:"internal-review",patientFacing:false,sourcePath:"test-fixture-only"};
  trusted.add(value);return value;
});}
it("compiles deterministic 276-frame cinematic-1 specification with exact source boundaries",()=>{
  const a=authorizeCinematicTimeline(HEART_CINEMATIC_EXPLAINER_V1,masters()),b=authorizeCinematicTimeline(HEART_CINEMATIC_EXPLAINER_V1,masters());
  expect(a).toEqual(b);expect(a).toMatchObject({duration:11.5,frameCount:276,timelineVersion:"cinematic-1",patientFacing:false});
  expect(a.scenes.map(s=>s.phase)).toEqual(["ESTABLISH","ORIENT","APPROACH","FOCUS","EXPLAIN","REORIENT"]);
  expect(a.scenes.map(s=>s.frameCount)).toEqual([60,36,36,36,72,36]);
  expect(a.scenes.map(s=>s.startFrame)).toEqual([0,60,96,132,168,240]);
  expect(a.transitions[2]).toMatchObject({kind:"fade-through-neutral",sourceBoundary:"explicit-source-change"});
  expect(a.scenes[3].focusDisposition).toBe("NEUTRAL_WHOLE_CUTAWAY_FOCUS");
  expect(a.scenes[0].sourceProfile.assetVersion).not.toBe(a.scenes[3].sourceProfile.assetVersion);
  expect(a.fingerprint).toMatch(/^[a-f0-9]{64}$/);expect(isAuthorizedCinematicTimeline(a)).toBe(true);
  expect(isAuthorizedCinematicTimeline(JSON.parse(JSON.stringify(a)))).toBe(false);
  expect(JSON.stringify(a)).not.toContain("test-fixture-only");
});
it("requires opaque readiness for every exact scene master",()=>{
  const m=masters();m[0]={...m[0]};
  expect(()=>authorizeCinematicTimeline(HEART_CINEMATIC_EXPLAINER_V1,m)).toThrow("MASTER_AUTHORITY_INVALID");
  const swapped=masters();swapped[0]=swapped[3];
  expect(()=>authorizeCinematicTimeline(HEART_CINEMATIC_EXPLAINER_V1,swapped)).toThrow("MASTER_AUTHORITY_INVALID");
});
it.each(["morph","retarget","merge","cut"])("rejects missing/unsafe cross-source boundary %s",kind=>{
  const r=JSON.parse(JSON.stringify(HEART_CINEMATIC_EXPLAINER_V1));r.transitions[2]={boundaryIndex:2,kind,duration:0,sourceBoundary:"same-source"};
  expect(()=>authorizeCinematicTimeline(r,masters())).toThrow("CINEMATIC_RECIPE_INVALID");
});
it("rejects unsafe camera target and zoom before issuing specification",()=>{
  for(const change of [{targets:["heart.coronary.lad"]},{camera:{...HEART_CINEMATIC_EXPLAINER_V1.scenes[2].camera,zoomRatio:2}}]){
    const r=JSON.parse(JSON.stringify(HEART_CINEMATIC_EXPLAINER_V1));Object.assign(r.scenes[2],change);
    expect(()=>authorizeCinematicTimeline(r,masters())).toThrow("CINEMATIC_RECIPE_INVALID");
  }
});
it("requires exact portrait native fps and uses neutral fades without overlap",()=>{
  const c=authorizeCinematicTimeline(HEART_CINEMATIC_EXPLAINER_V1,masters());
  const media=c.scenes.map(s=>({width:1080,height:1920,frameRate:24,frameCount:s.frameCount,duration:s.duration,audio:false}));
  const filters=cinematicCompositionFilters(c,media);
  expect(filters[2]).toContain("fade=t=out:st=1.3:d=0.2:color=black");
  expect(filters[3]).toContain("fade=t=in:st=0:d=0.2:color=black");
  expect(filters.join(";")).not.toMatch(/fps=|scale=|xfade|morph/);
  expect(()=>cinematicCompositionFilters(c,media.map(m=>({...m,frameRate:25})))).toThrow("OUTPUT_PROFILE_INVALID");
  expect(()=>cinematicCompositionFilters({...c},media)).toThrow("CINEMATIC_TIMELINE_INVALID");
});
