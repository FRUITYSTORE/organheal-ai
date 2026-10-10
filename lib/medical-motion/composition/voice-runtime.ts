import "server-only";
import { medicalSpokenTextMatches } from "./spoken-token-verification";
import type { MedicalNarrationProvider, SpeechRatePreset, PronunciationHint, VoiceQualityReview, VoiceRequest } from "../contracts/voice-runtime";
import { audioHash, audioIdentity, audioInvalid, deepAudioFreeze, exactAudio, isApprovedNarrationScript,
  approveMeasuredNarration, type ApprovedNarrationScript } from "./narration-foundation";

export const VOICE_RUNTIME_V1 = deepAudioFreeze({id:"VOICE_RUNTIME_V1",version:"1",maximumDurationMs:60000,
  maximumGenerationMs:120000,usage:"internal-review",patientFacing:false,qualityApproval:"owner-review-required"});
export const ORGANHEAL_VOICE_SIGNATURE_V1 = deepAudioFreeze({id:"ORGANHEAL_VOICE_SIGNATURE_V1",version:"1",
  maturity:"adult",authority:"calm",warmth:"professional",pitch:"moderate",diction:"clear",
  pauses:"purposeful",emotion:"restrained",delivery:"informative-not-alarming",cloning:false,personImitation:false});
export const ORGANHEAL_MEDICAL_VOICE_V1 = deepAudioFreeze({id:"ORGANHEAL_MEDICAL_VOICE_V1",version:"1",
  presentationVariants:["provider-default","male-future","female-future"],futureVariantsExecutable:false,
  rates:{CLINICAL_SLOW:{active:true},CLINICAL_STANDARD:{active:true},CREATOR_STANDARD_FUTURE:{active:false}}});
const profiles = {
  AR_CLINICAL_CALM_V1:{id:"AR_CLINICAL_CALM_V1",version:"1",language:"ar" as const,locale:"ar-SA",accent:"modern-standard-arabic"},
  EN_CLINICAL_CALM_V1:{id:"EN_CLINICAL_CALM_V1",version:"1",language:"en" as const,locale:"en-US",accent:"internationally-clear-neutral"},
};
const profileAuthority=new WeakSet<object>();
export function resolveMedicalVoiceProfile(id:unknown){
  if(typeof id!=="string"||!Object.hasOwn(profiles,id))audioInvalid("VOICE_PROFILE_UNAVAILABLE");
  const profile=deepAudioFreeze({...profiles[id as keyof typeof profiles],style:ORGANHEAL_VOICE_SIGNATURE_V1,
    usage:"internal-review",patientFacing:false});profileAuthority.add(profile);return profile;
}
export type MedicalVoiceProfile=ReturnType<typeof resolveMedicalVoiceProfile>;
export const PRONUNCIATION_V1:readonly PronunciationHint[]=deepAudioFreeze([
  ...["LDL","HbA1c","mmHg","atrium","ventricle","aorta"].map((term,i)=>({canonicalTerm:term,language:"en" as const,
    spokenForm:["L D L","hemoglobin A one C","millimeters of mercury","atrium","ventricle","aorta"][i],source:"organheal-editorial-pronunciation",version:"1" as const})),
  ...["LDL","HbA1c","mmHg","atrium","ventricle","aorta"].map((term,i)=>({canonicalTerm:term,language:"ar" as const,
    spokenForm:["إل دي إل","الهيموغلوبين السكري","مليمتر زئبق","أُذَيْن","بُطَيْن","الشريان الأبهر"][i],source:"organheal-editorial-pronunciation",version:"1" as const})),
]);
export const VOICE_FALLBACK_V1=deepAudioFreeze({id:"VOICE_FALLBACK_V1",version:"1",maximumSameVoiceRetries:1,
  automaticProviderSwitch:false,automaticVoiceSwitch:false,alternate:"explicitly-approved-profile-or-prerecorded-only",
  scriptMutation:false,languageMutation:false});
const dimensions=["intelligibility","medicalPronunciation","naturalness","pacing","warmth","clinicalCredibility",
  "restraint","languageQuality","segmentTiming","latency","reproducibility","costMetadata","portability"] as const;
export function evaluateVoiceQuality(value:VoiceQualityReview){
  if(!exactAudio(value,["reviewer","evidenceReference","scores","repeatedMispronunciation","roboticCadence","rushed","clippedEndings","materialLanguageError","dramatic"])||
    typeof value.reviewer!=="string"||!value.reviewer.trim()||value.reviewer.length>120||typeof value.evidenceReference!=="string"||
    !value.evidenceReference.trim()||value.evidenceReference.length>240||!exactAudio(value.scores,dimensions)||
    dimensions.some(d=>!Number.isInteger(value.scores[d])||value.scores[d]<1||value.scores[d]>5)||
    [value.repeatedMispronunciation,value.roboticCadence,value.rushed,value.clippedEndings,value.materialLanguageError,value.dramatic].some(v=>typeof v!=="boolean"))audioInvalid("VOICE_REVIEW_INVALID");
  const failed=value.repeatedMispronunciation||value.roboticCadence||value.rushed||value.clippedEndings||value.materialLanguageError||value.dramatic||
    ["intelligibility","medicalPronunciation","naturalness","pacing","languageQuality"].some(d=>value.scores[d as keyof typeof value.scores]<3);
  return deepAudioFreeze({accepted:!failed,scope:"subjective-internal-product-evaluation",medicalValidation:false,review:value});
}
export function canonicalNarrationWav(pcm:Buffer){
  if(!Buffer.isBuffer(pcm)||!pcm.length||pcm.length%96||pcm.length>5760000)audioInvalid("VOICE_PCM_INVALID");
  const bytes=Buffer.alloc(44+pcm.length);bytes.write("RIFF");bytes.writeUInt32LE(bytes.length-8,4);bytes.write("WAVEfmt ",8);
  bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(48000,24);
  bytes.writeUInt32LE(96000,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write("data",36);bytes.writeUInt32LE(pcm.length,40);pcm.copy(bytes,44);return bytes;
}
const issued=new WeakSet<object>();
/** Orthographic normalization only. No translation, stemming, number conversion
 * or clinical synonym substitution may conceal a change in spoken meaning. */
export { normalizedSpokenText } from "./spoken-token-verification";
/** Exact editorial pronunciation mapping, not arbitrary text replacement.
 * Display/script authority remains semantic; the provider request hashes this form. */
export function narrationSpokenForm(text:string,language:"ar"|"en"){
  return language==="ar"&&text==="يحمل الكوليسترول في الدم بواسطة جسيمات، ومنها إل دي إل."?
    "يحمل الكُولِيسْتِرُول في الدم بواسطة جسيمات، ومنها إِلْ، دِي، إِلْ.":text;
}
/** A server-supplied adapter is the authority to generate/import voice. Neither
 * copied provider JSON nor a claimed quality score can issue a voice capability. */
export async function renderMedicalNarration(script:ApprovedNarrationScript,profile:MedicalVoiceProfile,
  provider:MedicalNarrationProvider,rate:SpeechRatePreset,signal:AbortSignal){
  if(!isApprovedNarrationScript(script)||!profileAuthority.has(profile)||profile.language!==script.language||
    !(script.scriptId.startsWith("HEART_EDUCATION_")||script.scriptId.startsWith("execution:"))||!["EXTERNAL_TTS","OWNED_TTS","PRERECORDED_HUMAN","TEST_FIXTURE"].includes(provider.type)||
    typeof provider.render!=="function"||!["CLINICAL_SLOW","CLINICAL_STANDARD"].includes(rate)||!provider.supportedRates.includes(rate))audioInvalid("VOICE_AUTHORITY_INVALID");
  const hints=PRONUNCIATION_V1.filter(h=>h.language===script.language&&script.segments.some(s=>s.text.includes(h.canonicalTerm)));
  const requestBase={script,language:script.language,locale:profile.locale,voiceProfileId:profile.id,
    voiceStylePreset:"ORGANHEAL_VOICE_SIGNATURE_V1" as const,speechRatePreset:rate,pronunciationHints:hints,
    segments:script.segments.map(s=>{
      const spokenText=narrationSpokenForm(s.text,script.language);
      return spokenText===s.text?s:{...s,spokenText};
    })};
  const request:VoiceRequest=deepAudioFreeze({...requestBase,requestIdentity:audioIdentity(requestBase)});
  const bounded=AbortSignal.any([signal,AbortSignal.timeout(VOICE_RUNTIME_V1.maximumGenerationMs)]);
  if(bounded.aborted)audioInvalid("VOICE_CANCELLED");
  const result=await new Promise<Awaited<ReturnType<MedicalNarrationProvider["render"]>>>((resolve,reject)=>{
    const abort=()=>reject(Error("VOICE_CANCELLED"));bounded.addEventListener("abort",abort,{once:true});
    Promise.resolve().then(()=>provider.render(request,bounded)).then(resolve,reject).finally(()=>bounded.removeEventListener("abort",abort));
    if(bounded.aborted)abort();
  });
  if(bounded.aborted)audioInvalid("VOICE_CANCELLED");
  if(!exactAudio(result,["requestIdentity","segments","providerReference","modelRevision","voiceRevision","latencyMs","cost","retryCount"])||
    result.requestIdentity!==request.requestIdentity||!Array.isArray(result.segments)||result.segments.length!==script.segments.length||
    !/^[a-zA-Z0-9:_-]{1,160}$/.test(result.providerReference)||[result.modelRevision,result.voiceRevision].some(v=>typeof v!=="string"||!v||v.length>160)||
    !Number.isFinite(result.latencyMs)||result.latencyMs<0||result.latencyMs>120000||!Number.isInteger(result.retryCount)||result.retryCount<0||result.retryCount>1||
    result.cost!==null&&(!exactAudio(result.cost,["amount","currency","basis"])||!Number.isFinite(result.cost.amount)||result.cost.amount<0||
      !/^[A-Z]{3}$/.test(result.cost.currency)||typeof result.cost.basis!=="string"||result.cost.basis.length>120))audioInvalid("VOICE_RESPONSE_INVALID");
  let offsetMs=0;const parts:Buffer[]=[],timings:{segmentId:string;textHash:string;startMs:number;endMs:number;pauseAfterMs:number;
    words:null|readonly {word:string;startMs:number;endMs:number}[]}[]=[];
  const pauses=[250,300,300,250,0];
  result.segments.forEach((segment,i)=>{
    const definition=script.segments[i],words=segment.words;
    if(!exactAudio(segment,segment.words===undefined?["segmentId","textHash","pcm","spokenTextVerification"]:["segmentId","textHash","pcm","spokenTextVerification","words"])||
      segment.segmentId!==definition.segmentId||segment.textHash!==audioHash(definition.text)||!Buffer.isBuffer(segment.pcm)||
      segment.pcm.length<96000||segment.pcm.length%2||segment.pcm.length>1920000)audioInvalid("VOICE_SEGMENT_INVALID");
    const verification=segment.spokenTextVerification;
    if(!exactAudio(verification,["transcript","method"])||typeof verification.transcript!=="string"||
      (provider.type==="TEST_FIXTURE"?verification.method!=="fixture":!["independent-transcription","human-reviewed-transcript"].includes(String(verification.method)))||
      !medicalSpokenTextMatches(request.segments[i].spokenText??definition.text,verification.transcript))audioInvalid("VOICE_SPOKEN_CONTENT_MISMATCH");
    const ms=Math.ceil(segment.pcm.length/96),pcm=Buffer.alloc(ms*96);segment.pcm.copy(pcm);
    if(words){let previous=0;if(!Array.isArray(words)||words.length>200)audioInvalid();
      words.forEach(w=>{if(!exactAudio(w,["word","startMs","endMs"])||typeof w.word!=="string"||!w.word||w.word.length>120||
        typeof w.startMs!=="number"||typeof w.endMs!=="number"||!Number.isFinite(w.startMs)||!Number.isFinite(w.endMs)||w.startMs<previous||w.endMs<=w.startMs||w.endMs>ms)audioInvalid();previous=w.endMs;});}
    timings.push({segmentId:segment.segmentId,textHash:segment.textHash,startMs:offsetMs,endMs:offsetMs+ms,pauseAfterMs:pauses[i],
      words:words?.map((w:{word:string;startMs:number;endMs:number})=>({word:w.word,startMs:w.startMs+offsetMs,endMs:w.endMs+offsetMs}))??null});
    parts.push(pcm,Buffer.alloc(pauses[i]*96));offsetMs+=ms+pauses[i];
  });
  const bytes=canonicalNarrationWav(Buffer.concat(parts)),sha256=audioHash(bytes);
  const narration=approveMeasuredNarration(script,{narrationAssetId:`voice:${sha256}`,language:script.language,locale:profile.locale,
    voiceProfileId:profile.id,providerType:provider.type,providerAssetReference:result.providerReference,fixtureReference:null,
    durationMs:offsetMs,sampleRate:48000,channels:1,codec:"pcm_s16le",container:"wav",sha256,scriptId:script.scriptId,
    scriptVersion:script.version,scriptHash:script.scriptHash,medicalContentVersion:script.medicalContentVersion},bytes);
  const benchmark={providerType:provider.type,providerReference:result.providerReference,modelRevision:result.modelRevision,
    voiceRevision:result.voiceRevision,profileId:profile.id,language:script.language,characters:script.segments.reduce((n,s)=>n+[...s.text].length,0),
    durationMs:offsetMs,generationLatencyMs:result.latencyMs,cost:result.cost,timingGranularity:"measured-independent-segments",
    sampleRate:48000,channels:1,codec:"pcm_s16le",retryCount:result.retryCount,reproducibility:"pinned-generated-bytes-not-bit-exact-regeneration",
    wordTimingAvailable:result.segments.every(s=>s.words!==undefined),qualityApproval:"pending-owner-listening",
    spokenMeaningVerification:provider.type==="TEST_FIXTURE"?"fixture-not-speech":"verified-segment-transcript-match-not-human-quality-approval"};
  const voice=deepAudioFreeze({narration,script,profile,rate,timings,benchmark,requestIdentity:request.requestIdentity,
    voiceAudioIdentity:audioIdentity({narration:narration.identity,request:request.requestIdentity,providerType:provider.type,
      providerReference:result.providerReference,modelRevision:result.modelRevision,voiceRevision:result.voiceRevision,timings}),usage:"internal-review",patientFacing:false});
  issued.add(voice);return voice;
}
export type ApprovedMedicalVoice=Awaited<ReturnType<typeof renderMedicalNarration>>;
export const isApprovedMedicalVoice=(v:unknown):v is ApprovedMedicalVoice=>!!v&&typeof v==="object"&&issued.has(v);
