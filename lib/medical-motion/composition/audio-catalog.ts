import "server-only";
import { audioInvalid,deepAudioFreeze,exactAudio } from "./narration-foundation";

export const ORGANHEAL_VOICE_CATALOG_V1=deepAudioFreeze({id:"ORGANHEAL_VOICE_CATALOG_V1",version:"1",
  profiles:["ar","en"].flatMap(language=>["CLINICAL_CALM","CLINICAL_DEEP","WARM_GUIDE"].map(style=>({
    id:`${language.toUpperCase()}_${style}_V1`,language,style,
    state:style==="CLINICAL_CALM"?"presentation-definition":"future-audition-slot",
    variants:["provider-default","male-future","female-future"],providerAvailability:"not-implied"}))),
  testedCandidates:[{candidateId:"AR_CEDAR_AUDITION_V1",profileId:"AR_CLINICAL_CALM_V1",language:"ar",
    providerType:"EXTERNAL_TTS",providerReference:"existing-speech-service",model:"gpt-4o-mini-tts",voice:"cedar",
    decision:"owner-accepted-candidate",decisionReference:"owner-R2.5B-entrance-polish-approval",
    evidenceReference:"heart-cinematic-voice-ar-v1.mp4",
    narrationSha256:"76944117a2ee2092551fd658806325ca899878d8971f0155bc2f9d47273dc349",
    patientFacing:false,clinicalApproval:"unreviewed"}],
  universalProviderVoice:null,futureProfilesExecutable:false,medicalContentVariants:false,patientFacing:false});

export const SUPPORTING_AUDIO_CATALOG_V1=deepAudioFreeze({id:"SUPPORTING_AUDIO_CATALOG_V1",version:"1",
  categories:["AMBIENCE","SUBTLE_UI_CUE","TRANSITION_CUE","MEDICAL_MOTION_CUE","BACKGROUND_MUSIC"],
  assets:[],executionAvailable:false,clinicalDefault:"OFF",patientEducationDefault:"OFF",
  patientEducationRequires:"licensed-source-and-explicit-recipe-opt-in",creatorMode:"future-only",
  narrationDominant:true,distractingEffects:false,pathologyHeartbeatSounds:false,
  clinicalMonitorSounds:"explicit-educational-context-only",unlicensedAudio:false,
  identity:["clean","restrained","medical","premium","modern","non-alarming"],
  horror:false,drama:false,advertisingBoomHits:false,fakeEmergencySounds:false});

/** Catalogue planning only: these booleans cannot issue media/license authority. */
export function supportingAudioPolicy(value:unknown){
  if(!exactAudio(value,["mode","categories","recipeOptIn","licenseCleared"])||
    !["CLINICAL_REVIEW","PATIENT_EDUCATION"].includes(String(value.mode))||!Array.isArray(value.categories)||
    value.categories.length>5||new Set(value.categories).size!==value.categories.length||
    value.categories.some(c=>typeof c!=="string"||!SUPPORTING_AUDIO_CATALOG_V1.categories.includes(c))||
    typeof value.recipeOptIn!=="boolean"||typeof value.licenseCleared!=="boolean"||
    value.categories.length&&(value.mode==="CLINICAL_REVIEW"||!value.recipeOptIn||!value.licenseCleared))audioInvalid("SUPPORTING_AUDIO_UNAVAILABLE");
  return deepAudioFreeze({mode:value.mode,categories:[...value.categories],plannedEnabled:value.categories.length>0,
    executionAvailable:false,narrationDominant:true,patientFacing:false});
}
