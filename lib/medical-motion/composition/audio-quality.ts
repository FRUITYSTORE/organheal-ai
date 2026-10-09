import "server-only";
import { audioIdentity, audioInvalid, deepAudioFreeze, exactAudio } from "./narration-foundation";
import { ORGANHEAL_VOICE_CATALOG_V1, SUPPORTING_AUDIO_CATALOG_V1 } from "./audio-catalog";
import { PRONUNCIATION_V1 } from "./voice-runtime";

/** Editorial audition text, not patient-specific narration or provider SSML. */
export const MEDICAL_PRONUNCIATION_REGISTRY_V1 = deepAudioFreeze({id:"MEDICAL_PRONUNCIATION_REGISTRY_V1",version:"1",
  review:"pronunciation-listening-required",entries:[...PRONUNCIATION_V1,
    ...["القلب","البطين","الشريان الأبهر","الشرايين التاجية","ضغط الدم","الكوليسترول"].map(term=>({canonicalTerm:term,
      language:"ar" as const,spokenForm:term,source:"organheal-editorial-pronunciation",version:"1" as const})),
    ...["HDL","coronary artery","triglycerides","creatinine"].flatMap((term,i)=>["ar","en"].map(language=>({
      canonicalTerm:term,language,spokenForm:language==="en"?(term==="HDL"?"H D L":term):
        ["إتش دي إل","الشريان التاجي","الدهون الثلاثية","الكرياتينين"][i],source:"organheal-editorial-pronunciation",version:"1"})))
  ]});
export const VOICE_AUDITION_V1=deepAudioFreeze({id:"VOICE_AUDITION_V1",version:"1",maximumCandidatesPerLanguage:3,
  targetDurationSeconds:[8,15],maximumDurationSeconds:30,finalSignature:false,ownerListeningRequired:true,
  profiles:ORGANHEAL_VOICE_CATALOG_V1.profiles,script:{
    ar:"هذا شرح تعليمي للقلب. البطين يدفع الدم نحو الشريان الأبهر. نراجع ضغط الدم والكوليسترول بهدوء، ولا نستنتج تشخيصًا من نتيجة واحدة.",
    en:"This is an educational explanation of the heart. The ventricle pumps blood into the aorta. We review blood pressure and cholesterol calmly, without diagnosing disease from one result."},
  subjectiveDimensions:["naturalness","clinicalCredibility","intelligibility","warmth","authority","restraint",
    "medicalPronunciation","languageQuality","pacing","pauseQuality","consistency"],patientFacing:false});
/** Testing a candidate does not activate a profile or select a signature voice. */
export function voiceAuditionRecord(value:unknown){
  if(!exactAudio(value,["candidateId","profileId","sourceSha256","durationSeconds","latencyMs","providerReference","voiceRevision","transcriptMatches","cost"])||
    typeof value.candidateId!=="string"||!/^AUDITION_[A-Z0-9_]{1,64}$/.test(value.candidateId)||
    !ORGANHEAL_VOICE_CATALOG_V1.profiles.some(p=>p.id===value.profileId)||
    typeof value.sourceSha256!=="string"||!/^[0-9a-f]{64}$/.test(value.sourceSha256)||
    typeof value.durationSeconds!=="number"||!Number.isFinite(value.durationSeconds)||value.durationSeconds<1||value.durationSeconds>30||
    typeof value.latencyMs!=="number"||!Number.isFinite(value.latencyMs)||value.latencyMs<0||value.latencyMs>120000||
    [value.providerReference,value.voiceRevision].some(s=>typeof s!=="string"||!/^[-a-zA-Z0-9:_]{1,160}$/.test(s))||
    typeof value.transcriptMatches!=="boolean"||value.cost!==null)audioInvalid("VOICE_AUDITION_INVALID");
  const content={...value,scriptHash:audioIdentity(VOICE_AUDITION_V1.script),status:value.transcriptMatches?"tested-pending-owner-listening":"rejected-content-check",
    active:false,finalSignature:false,ownerListeningRequired:true,subjectiveScores:null,
    pronunciationApproval:"unreviewed",wordTimingAvailable:false,reproducibility:"pinned-bytes-only",patientFacing:false};
  return deepAudioFreeze({...content,identity:audioIdentity(content)});
}
export const SUPPORTING_AUDIO_MIX_V1=deepAudioFreeze({id:"SUPPORTING_AUDIO_MIX_V1",version:"1",
  narrationTargetLufs:-18,narrationPeakDb:-2,supportMaximumGainDb:-24,duckedMaximumGainDb:-36,
  fadeInMs:300,fadeOutMs:500,attackMs:150,releaseMs:800,maximumCueSeconds:3,
  arbitraryFilters:false,narrationDominant:true,executionAvailable:false});
/** No verified support assets exist. Catalogue/policy cannot manufacture license authority. */
export function resolveSupportingAudioMix(value:unknown){
  if(!exactAudio(value,["mode","category","assetId","recipeOptIn"])||
    !["CLINICAL_REVIEW","PATIENT_EDUCATION"].includes(String(value.mode))||typeof value.recipeOptIn!=="boolean")audioInvalid("SUPPORTING_AUDIO_UNAVAILABLE");
  if(value.category!==null||value.assetId!==null||value.recipeOptIn)audioInvalid("SUPPORTING_AUDIO_ASSET_UNAVAILABLE");
  return deepAudioFreeze({mode:value.mode,categories:SUPPORTING_AUDIO_CATALOG_V1.categories,enabled:false,
    assets:[],mix:SUPPORTING_AUDIO_MIX_V1,patientFacing:false});
}
