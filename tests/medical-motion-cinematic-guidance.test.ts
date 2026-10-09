import { expect, it } from "vitest";
import { compileCinematicRecipe, HEART_CINEMATIC_EXPLAINER_V1, HEART_APPEARANCE_PROFILE_V1,
  CINEMATIC_GUIDANCE_V1, PRESENTATION_POLICIES, MEDICAL_VISUAL_SAFETY } from "../lib/medical-motion/cinematic-guidance";
import { isCompiledMedicalScene } from "../lib/medical-motion/scene-compiler";
import { isIssuedTimeline } from "../lib/medical-motion/composition/timeline-specification";
const recipe = () => structuredClone(HEART_CINEMATIC_EXPLAINER_V1);

it("compiles deterministic internal-review plans into existing scene and sequence contracts without authority", () => {
  const a = compileCinematicRecipe(recipe()), b = compileCinematicRecipe(recipe());
  expect(a).toEqual(b); expect(a.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  expect(a.totalDuration).toBe(11.5); expect(a.sequence.sceneIndices).toEqual([0,1,2,3,4,5]);
  expect(a.scenes.map(s=>s.phase)).toEqual(CINEMATIC_GUIDANCE_V1.phases);
  expect(a.scenes[0].sourceSha256).toBe("3c117d9d212c5368897b70698c7d6d915868a2a0c7c2d31202a093a5e63e7761");
  expect(a.scenes[3].sourceSha256).toBe("0e52a7fe26bb12a267796b532de2312b1e023d228b7e76b3e40c5c4314bcdc59");
  expect(a.scenes[3].definition.motion.preset).toBe("NORMAL_HEARTBEAT_V1");
  expect(a.scenes[0].definition.motion.preset).toBe("static");
  expect(a.scenes.every(s=>s.definition.highlight.structures.length === 0 && !s.patientFacing)).toBe(true);
  expect(a.scenes[3].definition.focus).toBe("whole-cutaway");
  expect(a.execution).toBe("blocked-until-exact-modules-and-trusted-profiles-exist");
  expect(isCompiledMedicalScene(a.scenes[0])).toBe(false); expect(isIssuedTimeline(a)).toBe(false);
  expect(Object.isFrozen(a.scenes[0].definition)).toBe(true);
  expect(a.recipe.transitions[2].sourceBoundary).toBe("explicit-source-change");
});
it("separates anatomical base appearance from temporary educational attention without claiming medical RGB truth", () => {
  expect(HEART_APPEARANCE_PROFILE_V1.base).toMatchObject({meaning:"anatomical",exactMedicalRgb:null,sourceMaterials:"authoritative",preserveTextureMeaning:true});
  expect(HEART_APPEARANCE_PROFILE_V1.highlight).toMatchObject({meaning:"educational",temporary:true,indicatesPathology:false});
  expect(PRESENTATION_POLICIES.PATIENT_EDUCATION.maxSimultaneousLabels).toBeLessThan(PRESENTATION_POLICIES.CLINICAL_REVIEW.maxSimultaneousLabels);
  expect(PRESENTATION_POLICIES.CLINICAL_REVIEW.music).toBe("disabled");
  for (const mode of Object.values(PRESENTATION_POLICIES)) expect(mode.removesImportantContext).toBe(false);
  for (const regions of Object.values(CINEMATIC_GUIDANCE_V1.safeRegions)) for (const r of Object.values(regions)) {
    expect(r.every(v=>v >= 0 && v <= 1)).toBe(true); expect(r[0]).toBeLessThan(r[2]); expect(r[1]).toBeLessThan(r[3]);
  }
});
it("allows reviewed narration duration to drive a planning scene without storing prose or minting audio authority", () => {
  const r = recipe(); r.scenes[4].timing = "narration-duration"; r.scenes[4].narrationDuration = 4; r.scenes[4].narrationRef = "reviewed-segment-v1";
  const a = compileCinematicRecipe(r); expect(a.scenes[4].definition.durationSeconds).toBe(4); expect(a.totalDuration).toBe(12.5);
});
it.each(["riskIsDiagnosis","symptomIsConfirmedDisease","labAbnormalityIsVisiblePathology","diseaseLabelsAlterHeartbeat",
  "highLdlAcceleratesHeartbeat","elevatedBpImpliesTachycardia","riskDeformsAnatomy","highlightsIndicatePathology"] as const)("locks safety rule %s", key => {
  expect(MEDICAL_VISUAL_SAFETY[key]).toBe(false);
});
it.each([
  ["phase order", (r: ReturnType<typeof recipe>)=>{r.scenes[1].phase="FOCUS";}],
  ["unsupported target", (r: ReturnType<typeof recipe>)=>{r.scenes[3].targets=["heart.leftVentricle"];r.scenes[3].focus="structure";}],
  ["highlight", (r: ReturnType<typeof recipe>)=>{r.scenes[3].highlight.enabled=true;}],
  ["pathology meaning", (r: ReturnType<typeof recipe>)=>Object.assign(r.scenes[3].highlight,{meaning:"pathological"})],
  ["morph", (r: ReturnType<typeof recipe>)=>Object.assign(r.transitions[2],{kind:"morph"})],
  ["hidden boundary", (r: ReturnType<typeof recipe>)=>{r.transitions[2].sourceBoundary="same-source";}],
  ["wrong profile", (r: ReturnType<typeof recipe>)=>{r.scenes[3].sourceProfile.profileId=r.scenes[0].sourceProfile.profileId;}],
  ["extra source", (r: ReturnType<typeof recipe>)=>Object.assign(r.scenes[3],{otherSource:"HEART_HERO_V1"})],
  ["unknown master", (r: ReturnType<typeof recipe>)=>Object.assign(r.scenes[3],{masterId:"unknown"})],
  ["zoom", (r: ReturnType<typeof recipe>)=>{r.scenes[2].camera.zoomRatio=2;}],
  ["proximity", (r: ReturnType<typeof recipe>)=>{r.scenes[2].camera.proximityInOrganExtents=.5;}],
  ["context", (r: ReturnType<typeof recipe>)=>{r.scenes[2].camera.contextMargin=.01;}],
  ["coverage", (r: ReturnType<typeof recipe>)=>{r.scenes[2].camera.targetCoverage=.99;}],
  ["too-fast approach", (r: ReturnType<typeof recipe>)=>{r.scenes[2].camera.duration=.1;}],
  ["clipping", (r: ReturnType<typeof recipe>)=>Object.assign(r.scenes[2].camera,{clipping:"allowed"})],
  ["shake", (r: ReturnType<typeof recipe>)=>Object.assign(r.scenes[2].camera,{shake:true})],
  ["doctor music", (r: ReturnType<typeof recipe>)=>Object.assign(r,{mode:"CLINICAL_REVIEW",music:"optional-ducked"})],
  ["patient-facing", (r: ReturnType<typeof recipe>)=>Object.assign(r,{patientFacing:true})],
  ["clinical data", (r: ReturnType<typeof recipe>)=>Object.assign(r,{ldl:220})],
  ["disease label", (r: ReturnType<typeof recipe>)=>Object.assign(r,{disease:"AF"})],
  ["risk-driven motion", (r: ReturnType<typeof recipe>)=>Object.assign(r.scenes[4],{heartRate:130})],
  ["sensitive text", (r: ReturnType<typeof recipe>)=>Object.assign(r.scenes[4],{narrationText:"patient name"})],
] as const)("rejects %s", (_,mutate) => {const r=recipe();mutate(r);expect(()=>compileCinematicRecipe(r)).toThrow("CINEMATIC_RECIPE_INVALID");});
