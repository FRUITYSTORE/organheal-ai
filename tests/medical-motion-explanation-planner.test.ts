import { expect,it,vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { ExplanationRequest,ExplanationEvidence } from "../lib/medical-motion/contracts/medical-explanation-plan";
import { readMedicalExplanationContext,planMedicalExplanation,MEDICAL_VIDEO_DURATION_POLICY_V1 } from "../lib/medical-motion/medical-explanation-planner";
import { audioIdentity } from "../lib/medical-motion/composition/narration-foundation";
import { MEDICAL_EXPLANATION_DEMOS_V1 } from "../lib/medical-motion/explanation-planner-demos";
const ready=vi.hoisted(()=>new WeakSet<object>());
vi.mock("../lib/medical-motion/cinematic-master-runtime",async original=>({...await original<typeof import("../lib/medical-motion/cinematic-master-runtime")>(),
  isReadyCinematicMaster:(v:unknown)=>!!v&&typeof v==="object"&&ready.has(v)}));
import { CINEMATIC_MASTER_MODULES,CINEMATIC_MASTER_SOURCE_PROFILES,type ReadyCinematicMaster } from "../lib/medical-motion/cinematic-master-runtime";
import { sourceProfileSnapshot } from "../lib/medical-motion/source-profiles";
import { HEART_CINEMATIC_EXPLAINER_V1 } from "../lib/medical-motion/cinematic-guidance";
import { authorizeCinematicTimeline } from "../lib/medical-motion/composition/cinematic-timeline-specification";
import { compileCinematicExecution } from "../lib/medical-motion/cinematic-scene-compiler";
function visual(){const masters=HEART_CINEMATIC_EXPLAINER_V1.scenes.map(s=>{const m:ReadyCinematicMaster={module:CINEMATIC_MASTER_MODULES[s.masterId],
  profile:sourceProfileSnapshot(CINEMATIC_MASTER_SOURCE_PROFILES.resolve(s.sourceProfile)),runtimeOutputProfileId:"CINEMATIC_PORTRAIT_1080X1920_24_V1",
  usage:"internal-review",patientFacing:false,sourcePath:"test-only"};ready.add(m);return m;});return compileCinematicExecution(authorizeCinematicTimeline(HEART_CINEMATIC_EXPLAINER_V1,masters),masters);}
export const base:ExplanationRequest={requestType:"EXPLAIN_THIS_RESULT",organ:"heart",audienceMode:"PATIENT",lane:"PERSONAL_HEALTH_MOTION",
  explanationDepth:"QUICK",language:"en",teachingTargets:["LDL"],safetyQualifierCount:0,crossOrganDependencyCount:0,
  terminologyDensity:"LOW",requiresComparison:false,requiresNextAction:false,estimatedNarrationWords:40};
async function context(evidence:readonly ExplanationEvidence[]=[]){const owner=randomUUID();return readMedicalExplanationContext(owner,"demo-context",async()=>({ownerId:owner,revision:"1",evidence}));}
it.each(["QUICK","STANDARD","DETAILED","COMPREHENSIVE"] as const)("honors bounded %s depth",async explanationDepth=>{
  const p=planMedicalExplanation({...base,explanationDepth},await context());const range=MEDICAL_VIDEO_DURATION_POLICY_V1.ranges[explanationDepth];
  expect(p.recommendedDurationSeconds).toBeGreaterThanOrEqual(range[0]);expect(p.recommendedDurationSeconds).toBeLessThanOrEqual(range[1]);
  expect(p.scenePlan.reduce((n,s)=>n+s.durationSeconds,0)).toBe(p.recommendedDurationSeconds);
});
it("raises complexity and duration transparently as targets/evidence/safety grow",async()=>{
  const c=await context();const a=planMedicalExplanation(base,c),b=planMedicalExplanation({...base,teachingTargets:["LDL","blood-pressure","heart-age"],safetyQualifierCount:3,requiresNextAction:true},c);
  expect(b.totalPlannedSeconds).toBeGreaterThan(a.totalPlannedSeconds);expect(b.complexityScore).toBeGreaterThan(a.complexityScore);
  expect(b.durationReasoning.safetyAdjustment).toBe(9);
});
it("splits long explanations into bounded coherent chapters",async()=>{
  const p=planMedicalExplanation({...base,estimatedNarrationWords:1500},await context());expect(p.recommendedDurationSeconds).toBeNull();
  expect(p.chapterPlan!.length).toBeGreaterThan(1);expect(p.chapterPlan!.every(c=>c.targetDurationSeconds<=240&&c.teachingTargets.includes("LDL"))).toBe(true);
  expect(p.chapterPlan!.reduce((n,c)=>n+c.targetDurationSeconds,0)).toBe(p.totalPlannedSeconds);
});
it("same authorized input is deterministic and version participates in identity",async()=>{
  const c=await context();expect(planMedicalExplanation(base,c).identity).toBe(planMedicalExplanation(base,c).identity);
  expect(audioIdentity({plannerVersion:"1"})).not.toBe(audioIdentity({plannerVersion:"2"}));
});
it("language policy and measured speech override estimates without rhythm mutations",async()=>{
  const c=await context();const en=planMedicalExplanation(base,c),ar=planMedicalExplanation({...base,language:"ar"},c);
  expect(ar.durationReasoning.narrationEstimateSeconds).toBeGreaterThan(en.durationReasoning.narrationEstimateSeconds);
  const measured=planMedicalExplanation(base,c,[],100);expect(measured.totalPlannedSeconds).toBeGreaterThanOrEqual(102);
  expect(measured.scenePlan.every(s=>s.motionSpeedRatio===1)).toBe(true);
});
it.each(["USER_STATED","LAB_VERIFIED","RISK_ESTIMATE"] as const)("%s LDL never selects plaque/diagnosis",async authority=>{
  const p=planMedicalExplanation(base,await context([{reference:"demo-ldl",authority,topic:"LDL"}]));
  expect(p.scenePlan.every(s=>!s.pathology&&!s.highlightAllowed)).toBe(true);expect(p.patientFacing).toBe(false);
  expect(p.safetyDisclaimers).toContain("LAB_ABNORMALITY_IS_NOT_DISEASE");
});
it("symptom request remains educational and requires the existing safety gate",async()=>{
  const p=planMedicalExplanation({...base,requestType:"EXPLAIN_SYMPTOM_SAFELY"},await context());
  expect(p.safetyDisclaimers).toContain("EXISTING_CLINICAL_SAFETY_GATE_REQUIRED");expect(p.renderAuthority).toBe(false);
});
it("prefers opaque locked masters while unsupported kidney targets fall back to narration",async()=>{
  const c=await context(),v=visual();const p=planMedicalExplanation(base,c,[v]);expect(p.estimatedRenderClass).toBe("CACHED_SCENE_COMPOSE");
  expect(p.sourceRequirements[0].sourceSha256).toBe(CINEMATIC_MASTER_MODULES.HEART_MASTER_VISUAL_V1.sourceSha256);
  expect(planMedicalExplanation({...base,organ:"kidney"},c,[v]).visualFocusStrategy).toBe("NARRATION_ONLY");
  expect(()=>planMedicalExplanation(base,c,[JSON.parse(JSON.stringify(v))])).toThrow("EXPLANATION_AUTHORITY_INVALID");
});
it("rejects copied evidence authority and cross-owner context reads",async()=>{
  const c=await context();expect(()=>planMedicalExplanation(base,JSON.parse(JSON.stringify(c)))).toThrow("EXPLANATION_AUTHORITY_INVALID");
  await expect(readMedicalExplanationContext(randomUUID(),"demo",async()=>({ownerId:randomUUID(),revision:"1",evidence:[]}))).rejects.toThrow();
});
it("keeps creator education separate from personal data",async()=>{
  const creator={...base,lane:"MEDICAL_CREATOR_MOTION",audienceMode:"CREATOR",requestType:"GENERAL_MEDICAL_EDUCATION"};
  expect(planMedicalExplanation(creator,await context()).lane).toBe("MEDICAL_CREATOR_MOTION");
  const personal=await context([{reference:"demo-lab",authority:"LAB_VERIFIED",topic:"LDL"}]);
  expect(()=>planMedicalExplanation(creator,personal)).toThrow("CREATOR_PATIENT_DATA_FORBIDDEN");
  expect(()=>planMedicalExplanation({...base,audienceMode:"CREATOR"},personal)).toThrow("EXPLANATION_REQUEST_INVALID");
});
it("six versioned demos have different durations, chapter plans and educational fallbacks",async()=>{
  const c=await context();const plans=MEDICAL_EXPLANATION_DEMOS_V1.map(d=>planMedicalExplanation(d.request,c,[visual()]));
  expect(plans).toHaveLength(6);expect(new Set(plans.map(p=>p.totalPlannedSeconds)).size).toBeGreaterThan(3);
  expect(plans[2].visualFocusStrategy).toBe("NARRATION_ONLY");expect(plans[4].chapterPlan).not.toBeNull();
  expect(plans.every(p=>!p.patientFacing&&!p.renderAuthority&&!p.narrationAuthority)).toBe(true);
});
