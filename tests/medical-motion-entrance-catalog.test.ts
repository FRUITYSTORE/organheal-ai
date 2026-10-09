import { expect,it } from "vitest";
import { HERO_ENTRANCE_V1,heroEntranceRatio,heroEntranceFilter,auditHeroEntrance } from "../lib/medical-motion/render/hero-entrance";
import { ORGANHEAL_VOICE_CATALOG_V1,SUPPORTING_AUDIO_CATALOG_V1,supportingAudioPolicy } from "../lib/medical-motion/composition/audio-catalog";
import { resolveEducationalNarration } from "../lib/medical-motion/composition/narration-foundation";
import { resolveMedicalVoiceProfile } from "../lib/medical-motion/composition/voice-runtime";
const bounds=[.0837550088763237,.2333167940378189,.9065452814102173,.8966831564903259];
it("starts farther away, reaches the approved cap monotonically and settles before transition",()=>{
  const ratios=Array.from({length:344},(_,f)=>heroEntranceRatio(f,344));
  expect(ratios[0]).toBe(.9);expect(ratios[96]).toBe(.99);expect(ratios.at(-1)).toBe(1.095);
  expect(ratios.every((r,i)=>r>=.9&&r<=1.095&&(i===0||r>=ratios[i-1]))).toBe(true);
  expect(Math.max(...ratios.slice(1).map((r,i)=>r-ratios[i]))).toBeLessThan(.002);
  const qa=auditHeroEntrance(bounds,344);expect(qa.end.boundingBoxArea).toBeGreaterThan(qa.start.boundingBoxArea);
  expect(qa.minimumSafeRectangleMargin).toBeGreaterThan(0);expect(qa.completedByFrame).toBe(339);
  expect(qa.cameraDistanceDelta).toBe(0);expect(heroEntranceFilter(344)).not.toMatch(/rotate|perspective|setpts=.*\/|atempo/);
});
it("rejects clipping and invalid entrance duration/frame inputs",()=>{
  expect(()=>auditHeroEntrance([0,0,1,1],344)).toThrow("HERO_PRESENTATION_CLIPPING");
  expect(()=>heroEntranceRatio(-1,344)).toThrow();expect(()=>heroEntranceFilter(70)).toThrow();
  expect(HERO_ENTRANCE_V1).toMatchObject({geometryMutation:false,perspectiveModification:false,patientFacing:false});
});
it("catalogue contains six presentation definitions and exactly one tested Arabic candidate",()=>{
  expect(ORGANHEAL_VOICE_CATALOG_V1.profiles.map(p=>p.id)).toEqual([
    "AR_CLINICAL_CALM_V1","AR_CLINICAL_DEEP_V1","AR_WARM_GUIDE_V1","EN_CLINICAL_CALM_V1","EN_CLINICAL_DEEP_V1","EN_WARM_GUIDE_V1"]);
  expect(ORGANHEAL_VOICE_CATALOG_V1.testedCandidates).toHaveLength(1);
  expect(ORGANHEAL_VOICE_CATALOG_V1.testedCandidates[0]).toMatchObject({voice:"cedar",language:"ar",decision:"owner-accepted-candidate",patientFacing:false});
  expect(ORGANHEAL_VOICE_CATALOG_V1.universalProviderVoice).toBeNull();
  expect(()=>resolveMedicalVoiceProfile("AR_CLINICAL_DEEP_V1")).toThrow("VOICE_PROFILE_UNAVAILABLE");
});
it("presentation changes cannot change approved medical script identity",()=>{
  const before=resolveEducationalNarration({scriptId:"HEART_EDUCATION_AR_V1",version:"1"}).scriptHash;
  resolveMedicalVoiceProfile("AR_CLINICAL_CALM_V1");resolveMedicalVoiceProfile("EN_CLINICAL_CALM_V1");
  expect(resolveEducationalNarration({scriptId:"HEART_EDUCATION_AR_V1",version:"1"}).scriptHash).toBe(before);
});
it("supporting audio is bounded, inactive and OFF by default in clinical review",()=>{
  expect(SUPPORTING_AUDIO_CATALOG_V1.categories).toEqual(["AMBIENCE","SUBTLE_UI_CUE","TRANSITION_CUE","MEDICAL_MOTION_CUE","BACKGROUND_MUSIC"]);
  expect(supportingAudioPolicy({mode:"CLINICAL_REVIEW",categories:[],recipeOptIn:false,licenseCleared:false})).toMatchObject({plannedEnabled:false,executionAvailable:false,narrationDominant:true});
  expect(()=>supportingAudioPolicy({mode:"CLINICAL_REVIEW",categories:["AMBIENCE"],recipeOptIn:true,licenseCleared:true})).toThrow();
  expect(()=>supportingAudioPolicy({mode:"PATIENT_EDUCATION",categories:["EMERGENCY_ALARM"],recipeOptIn:true,licenseCleared:true})).toThrow();
  expect(()=>supportingAudioPolicy({mode:"PATIENT_EDUCATION",categories:["BACKGROUND_MUSIC"],recipeOptIn:false,licenseCleared:true})).toThrow();
  expect(supportingAudioPolicy({mode:"PATIENT_EDUCATION",categories:["AMBIENCE"],recipeOptIn:true,licenseCleared:true}).executionAvailable).toBe(false);
});
