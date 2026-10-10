import { expect,it } from "vitest";
import { randomUUID } from "node:crypto";
import { HEART_COVERAGE_MATRIX_V1,HEART_VISUAL_AUTHORITY_V1,HEART_REVIEW_MODULES_V1 } from "../lib/medical-motion/heart-knowledge/coverage";
import { HEART_SCENE_LIBRARY_V1,HEART_VISUAL_RECIPE_REGISTRY_V1,HEART_VISUAL_COVERAGE_SCORE_V1 } from "../lib/medical-motion/heart-knowledge/library";
import { mapHeartQuery,planHeartKnowledgeExplanation } from "../lib/medical-motion/heart-knowledge/resolver";
import { compileHeartReviewScene,renderHeartReviewFrame } from "../lib/medical-motion/heart-knowledge/review-graphics";
import { readMedicalExplanationContext } from "../lib/medical-motion/medical-explanation-planner";
import { MEDICAL_EXPLANATION_DEMOS_V1 } from "../lib/medical-motion/explanation-planner-demos";
import type { MedicalEvidenceAuthority } from "../lib/medical-motion/contracts/medical-explanation-plan";
const request=(target:string)=>({...MEDICAL_EXPLANATION_DEMOS_V1[0].request,teachingTargets:[target]});
async function context(topic:string,authority:MedicalEvidenceAuthority="EDUCATIONAL_CONTEXT"){
  const ownerId=randomUUID();return readMedicalExplanationContext(ownerId,"heart",async()=>({ownerId,revision:"1",evidence:[{reference:"record",topic,authority}]}));
}
const options=(topicId:string,authorityLevel:"GENERAL_EDUCATIONAL"|"PERSONALIZED_SAFE"|"CONFIRMED_PATHOLOGY_REQUIRED"="GENERAL_EDUCATIONAL")=>({topicId,authorityLevel,durationSeconds:20,cacheSceneIdentities:[]});
it("matrix covers every required category with unique IDs and explicit bilingual safety",()=>{
  const t=HEART_COVERAGE_MATRIX_V1.topics;
  expect(new Set(t.map(t=>t.topicId)).size).toBe(t.length);
  expect(new Set(t.map(t=>t.category)).size).toBe(11);
  for(const row of t){expect(row.requiredEvidenceAuthority.education).toBe("EDUCATIONAL_CONTEXT");expect(row.terminology.ar).toBeTruthy();expect(row.terminology.en).toBeTruthy();expect(row.safetyNotes.length).toBeGreaterThan(0);expect(row.patientFacing).toBe(false);}
});
it.each([["ما هو LDL؟","ldl"],["لماذا ضغط الدم يؤثر على القلب؟","blood-pressure"],["ما هو Heart Age؟","heart-age"],["ما هو troponin؟","troponin"],["ماذا يعني تخطيط القلب؟","ecg"],["ما هو echo؟","echo"],["ما معنى EF؟","ef"],["كيف يعمل statin؟","statin"]])("maps %s deterministically",(query,id)=>{
  expect(mapHeartQuery(query)).toBe(id);expect(mapHeartQuery(query)).toBe(mapHeartQuery(query));
});
it.each(["ldl","heart-age","blood-pressure"])("selects concept-specific scene for %s rather than generic heartbeat",async topic=>{
  const p=planHeartKnowledgeExplanation(request(topic),await context(topic),options(topic));
  expect(p.scene.moduleId).toBe(topic==="ldl"?"ldl-particles":topic==="heart-age"?"heart-age-risk":"pressure-mechanics");
  expect(p.recipe.topicId).toBe(topic);expect(p.patientPathologyClaim).toBe(false);
});
it.each(["LAB_VERIFIED","RISK_ESTIMATE","USER_STATED"] as const)("%s cannot authorize patient plaque",async authority=>{
  const p=planHeartKnowledgeExplanation(request("atherosclerosis"),await context("atherosclerosis",authority),options("atherosclerosis","CONFIRMED_PATHOLOGY_REQUIRED"));
  expect(p.status).toBe("BLOCKED");expect(p.patientPathologyClaim).toBe(false);expect(p.renderAuthority).toBe(false);
});
it("even a confirmed diagnosis does not bypass the finding-specific clinical and asset gate",async()=>{
  const p=planHeartKnowledgeExplanation(request("mi"),await context("mi","CONFIRMED_DIAGNOSIS"),options("mi","CONFIRMED_PATHOLOGY_REQUIRED"));expect(p.status).toBe("BLOCKED");
});
it("lab topic matching is required for personalized planning; user prose is never confirmation",async()=>{
  const p=planHeartKnowledgeExplanation(request("ldl"),await context("ldl","USER_STATED"),options("ldl","PERSONALIZED_SAFE"));expect(p.status).toBe("BLOCKED");
  const wrong=planHeartKnowledgeExplanation(request("ldl"),await context("troponin","LAB_VERIFIED"),options("ldl","PERSONALIZED_SAFE"));expect(wrong.status).toBe("BLOCKED");
  const good=planHeartKnowledgeExplanation(request("ldl"),await context("ldl","LAB_VERIFIED"),options("ldl","PERSONALIZED_SAFE"));expect(good.personalizedPlanning).toBe(true);expect(good.patientSpecificAllowed).toBe(false);
});
it("copied owner context and mismatched teaching target cannot plan execution",async()=>{
  const c=await context("ldl");expect(()=>planHeartKnowledgeExplanation(request("ldl"),JSON.parse(JSON.stringify(c)),options("ldl"))).toThrow();
  expect(()=>planHeartKnowledgeExplanation(request("heart-age"),c,options("ldl"))).toThrow("HEART_TOPIC_TARGET_MISMATCH");
});
it("troponin does not diagnose MI and symptoms require existing urgent safety authority",async()=>{
  const p=planHeartKnowledgeExplanation(request("troponin"),await context("troponin","LAB_VERIFIED"),options("troponin"));
  expect(p.scene.conceptId).toBe("troponin");expect(p.scene.moduleId).toBeNull();expect(p.patientPathologyClaim).toBe(false);
  const s=planHeartKnowledgeExplanation(request("chest-pain"),await context("chest-pain","USER_STATED"),options("chest-pain"));expect(s.status).toBe("BLOCKED");
});
it("unsupported anatomy and rhythm modules fail safely, never deforming the normal master",()=>{
  for(const topic of ["healthy-artery","atherosclerosis","af","valve-disease","septum","sinus-rhythm"]){
    const scene=HEART_SCENE_LIBRARY_V1.scenes.find(s=>s.conceptId===topic)!;expect(scene.moduleId).toBeNull();expect(scene.productionExecutable).toBe(false);
  }
  expect(HEART_VISUAL_AUTHORITY_V1.CONFIRMED_PATHOLOGY_REQUIRED.allowed).toEqual([]);
  expect(()=>compileHeartReviewScene("atherosclerosis" as keyof typeof HEART_REVIEW_MODULES_V1,"en","MOBILE_VERTICAL_9_16")).toThrow();
});
it("scene/recipe/cache identities remain concept-specific and independent of narration",()=>{
  expect(new Set(HEART_VISUAL_RECIPE_REGISTRY_V1.recipes.map(r=>r.recipeId)).size).toBe(HEART_COVERAGE_MATRIX_V1.topics.length);
  const a=compileHeartReviewScene("ldl-particles","en","MOBILE_VERTICAL_9_16"),b=compileHeartReviewScene("pressure-mechanics","en","MOBILE_VERTICAL_9_16");
  expect(a.cacheIdentity).toBe(compileHeartReviewScene("ldl-particles","en","MOBILE_VERTICAL_9_16").cacheIdentity);expect(a.cacheIdentity).not.toBe(b.cacheIdentity);
  expect(a).toMatchObject({width:1080,height:1920,fps:24,patientFacing:false,anatomicalGeometry:false,physiologicalTiming:false});
  expect(compileHeartReviewScene("ldl-particles","en","DESKTOP_16_9")).toMatchObject({width:1920,height:1080});
});
it("copied scene JSON cannot render and catalogue count does not imply completeness",async()=>{
  const s=compileHeartReviewScene("heart-age-risk","en","MOBILE_VERTICAL_9_16");
  await expect(renderHeartReviewFrame({scene:JSON.parse(JSON.stringify(s)),base:Buffer.alloc(0),nodePlates:[],cacheIdentity:"copied"},0)).rejects.toThrow("HEART_REVIEW_FRAME_INVALID");
  expect(HEART_VISUAL_COVERAGE_SCORE_V1.complete).toBe(false);expect(HEART_VISUAL_COVERAGE_SCORE_V1.medicalReviewCoverage.covered).toBe(0);
  expect(HEART_VISUAL_COVERAGE_SCORE_V1.executableCoverage.production).toBe(0);
});
