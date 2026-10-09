import { it,expect } from "vitest";
import { ORGANHEAL_VOICE_CATALOG_V1 } from "../lib/medical-motion/composition/audio-catalog";
import { VOICE_AUDITION_V1,MEDICAL_PRONUNCIATION_REGISTRY_V1,voiceAuditionRecord,resolveSupportingAudioMix } from "../lib/medical-motion/composition/audio-quality";
import { resolveMedicalVoiceProfile } from "../lib/medical-motion/composition/voice-runtime";
import { resolveEducationalNarration,audioIdentity } from "../lib/medical-motion/composition/narration-foundation";
import { VOICE_AUDITION_EVIDENCE_V1, OWNER_VOICE_SELECTION_V1 } from "../lib/medical-motion/composition/voice-audition-evidence";
const record={candidateId:"AUDITION_AR_MARIN",profileId:"AR_CLINICAL_CALM_V1",sourceSha256:"a".repeat(64),durationSeconds:12,
  latencyMs:1000,providerReference:"existing-speech-service",voiceRevision:"marin",transcriptMatches:true,cost:null};
it("locks only approved marin preferences and accepted cedar fallbacks without erasing auditions",()=>{
  for(const language of ["ar","en"]){
    expect(OWNER_VOICE_SELECTION_V1.candidates.filter(c=>c.language===language&&c.active)).toEqual([
      expect.objectContaining({voice:"marin",preferred:true,ownerListeningApproved:true,accepted:true})]);
    expect(OWNER_VOICE_SELECTION_V1.candidates.filter(c=>c.language===language&&c.fallbackEligible)).toEqual([
      expect.objectContaining({voice:"cedar",preferred:false,accepted:true,active:false})]);
  }
  expect(OWNER_VOICE_SELECTION_V1.candidates.find(c=>c.voice==="onyx")).toMatchObject({accepted:false,active:false,fallbackEligible:false,status:"REJECTED_CONTENT_MISMATCH"});
  expect(OWNER_VOICE_SELECTION_V1).toMatchObject({cost:null,pronunciationApproval:"unreviewed",pronunciationReviewNeeded:true,patientFacing:false});
  expect(VOICE_AUDITION_EVIDENCE_V1.every(c=>!c.active&&c.cost===null)).toBe(true);
});
it("keeps the curated six roles and accepted cedar without creating signature authority",()=>{
  expect(VOICE_AUDITION_V1.profiles).toHaveLength(6);expect(ORGANHEAL_VOICE_CATALOG_V1.testedCandidates[0].voice).toBe("cedar");
  expect(voiceAuditionRecord(record)).toMatchObject({active:false,finalSignature:false,ownerListeningRequired:true,subjectiveScores:null});
  expect(()=>resolveMedicalVoiceProfile("AR_CLINICAL_DEEP_V1")).toThrow();
});
it("does not modify medical script identity when recording auditions",()=>{
  const s=resolveEducationalNarration({scriptId:"HEART_EDUCATION_AR_V1",version:"1"});voiceAuditionRecord(record);
  expect(resolveEducationalNarration({scriptId:s.scriptId,version:"1"}).scriptHash).toBe(s.scriptHash);
});
it("pins a bounded pronunciation registry with both languages and requested terms",()=>{
  expect(audioIdentity(MEDICAL_PRONUNCIATION_REGISTRY_V1)).toBe(audioIdentity(JSON.parse(JSON.stringify(MEDICAL_PRONUNCIATION_REGISTRY_V1))));
  const terms=MEDICAL_PRONUNCIATION_REGISTRY_V1.entries.map(e=>e.canonicalTerm);
  for(const term of ["القلب","البطين","الشريان الأبهر","الشرايين التاجية","ضغط الدم","الكوليسترول","LDL","HDL","HbA1c","mmHg","atrium","ventricle","aorta","coronary artery","triglycerides","creatinine"])expect(terms).toContain(term);
  expect(terms.length).toBeLessThan(40);
});
it.each(["CLINICAL_REVIEW","PATIENT_EDUCATION"])("supporting audio defaults OFF for %s",mode=>{
  const result=resolveSupportingAudioMix({mode,category:null,assetId:null,recipeOptIn:false});
  expect(result.enabled).toBe(false);expect(result.mix).toMatchObject({narrationDominant:true,supportMaximumGainDb:-24,duckedMaximumGainDb:-36,executionAvailable:false,arbitraryFilters:false});
});
it.each(["AMBIENCE","BACKGROUND_MUSIC","EMERGENCY_ALARM"])("cannot authorize an unverified %s cue",category=>{
  expect(()=>resolveSupportingAudioMix({mode:"PATIENT_EDUCATION",category,assetId:"unverified",recipeOptIn:true})).toThrow("SUPPORTING_AUDIO_ASSET_UNAVAILABLE");
});
it("rejects fake approval/cost and failed spoken content stays rejected",()=>{
  expect(()=>voiceAuditionRecord({...record,finalSignature:true})).toThrow();
  expect(()=>voiceAuditionRecord({...record,cost:0})).toThrow();
  expect(voiceAuditionRecord({...record,transcriptMatches:false}).status).toBe("rejected-content-check");
});
it("preserves four real auditions as inactive and keeps the failed content check rejected",()=>{
  expect(VOICE_AUDITION_EVIDENCE_V1).toHaveLength(4);
  expect(VOICE_AUDITION_EVIDENCE_V1.filter(c=>c.language==="ar")).toHaveLength(2);
  expect(VOICE_AUDITION_EVIDENCE_V1.filter(c=>c.language==="en")).toHaveLength(2);
  expect(VOICE_AUDITION_EVIDENCE_V1.every(c=>!c.active&&!c.finalSignature&&c.cost===null&&c.subjectiveScores===null)).toBe(true);
  expect(VOICE_AUDITION_EVIDENCE_V1.find(c=>c.candidateId==="AUDITION_AR_ONYX")?.status).toBe("rejected-content-check");
});
