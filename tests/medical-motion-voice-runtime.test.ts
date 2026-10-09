import { expect, it, vi, afterEach } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { MedicalNarrationProvider, VoiceProviderResult, VoiceQualityReview } from "../lib/medical-motion/contracts/voice-runtime";
import { resolveEducationalNarration, audioHash, narrationFixtureBytes } from "../lib/medical-motion/composition/narration-foundation";
import { resolveMedicalVoiceProfile, renderMedicalNarration, isApprovedMedicalVoice, evaluateVoiceQuality,
  VOICE_FALLBACK_V1, PRONUNCIATION_V1, ORGANHEAL_MEDICAL_VOICE_V1 } from "../lib/medical-motion/composition/voice-runtime";
import { planMedicalAvSync, isApprovedMedicalAvSync, MEDICAL_AV_SYNC_V1 } from "../lib/medical-motion/composition/medical-av-sync";
const ready=vi.hoisted(()=>new WeakSet<object>());
vi.mock("../lib/medical-motion/cinematic-master-runtime",async original=>({...await original<typeof import("../lib/medical-motion/cinematic-master-runtime")>(),
  isReadyCinematicMaster:(v:unknown)=>!!v&&typeof v==="object"&&ready.has(v)}));
vi.mock("../lib/medical-motion/composition/ffmpeg-runtime",()=>({inspectMedia:vi.fn(async()=>({width:1080,height:1920,frameRate:24,frameCount:276,duration:11.5,audio:false})),executeMediaProcess:vi.fn()}));
import { CINEMATIC_MASTER_MODULES,CINEMATIC_MASTER_SOURCE_PROFILES,type ReadyCinematicMaster } from "../lib/medical-motion/cinematic-master-runtime";
import { sourceProfileSnapshot } from "../lib/medical-motion/source-profiles";
import { HEART_CINEMATIC_EXPLAINER_V1 } from "../lib/medical-motion/cinematic-guidance";
import { authorizeCinematicTimeline } from "../lib/medical-motion/composition/cinematic-timeline-specification";
import { compileCinematicExecution } from "../lib/medical-motion/cinematic-scene-compiler";
import { approveAudioVisual, approveSubtitleFont } from "../lib/medical-motion/composition/audio-media-authority";
import { compileVoiceComposition, isCompiledAudioComposition } from "../lib/medical-motion/composition/audio-specification";
const directories:string[]=[];
afterEach(async()=>{await Promise.all(directories.splice(0).map(p=>rm(p,{recursive:true,force:true})));});
const script=(language="ar")=>resolveEducationalNarration({scriptId:`HEART_EDUCATION_${language.toUpperCase()}_V1`,version:"1"});
function provider(ms=4000,change?:(result:VoiceProviderResult)=>VoiceProviderResult):MedicalNarrationProvider {
  return {type:"TEST_FIXTURE",supportedRates:["CLINICAL_STANDARD"],async render(request){
    const result:VoiceProviderResult={requestIdentity:request.requestIdentity,segments:request.segments.map(s=>({segmentId:s.segmentId,
      textHash:audioHash(s.text),pcm:Buffer.alloc(ms*96),spokenTextVerification:{transcript:s.text,method:"fixture"}})),providerReference:"unit-fixture",modelRevision:"test-1",voiceRevision:"test-1",
      latencyMs:1,cost:null,retryCount:0};return change?change(result):result;
  }};
}
const voice=(ms=4000,language="ar")=>renderMedicalNarration(script(language),resolveMedicalVoiceProfile(`${language.toUpperCase()}_CLINICAL_CALM_V1`),provider(ms),"CLINICAL_STANDARD",new AbortController().signal);
async function visualInput(){
  const masters=HEART_CINEMATIC_EXPLAINER_V1.scenes.map(s=>{const m:ReadyCinematicMaster={module:CINEMATIC_MASTER_MODULES[s.masterId],
    profile:sourceProfileSnapshot(CINEMATIC_MASTER_SOURCE_PROFILES.resolve(s.sourceProfile)),runtimeOutputProfileId:"CINEMATIC_PORTRAIT_1080X1920_24_V1",
    usage:"internal-review",patientFacing:false,sourcePath:"unit-fixture"};ready.add(m);return m;});
  const compiled=compileCinematicExecution(authorizeCinematicTimeline(HEART_CINEMATIC_EXPLAINER_V1,masters),masters);
  const directory=await mkdtemp(path.join(tmpdir(),"organheal-voice-unit-"));directories.push(directory);
  const bytes=Buffer.from("unit-mocked-probe"),file=path.join(directory,"heart-cinematic-explainer-v1.mp4"),evidence=path.join(directory,"execution-evidence.json");
  await writeFile(file,bytes);await writeFile(evidence,JSON.stringify({compiledFingerprint:compiled.fingerprint,executorSha256:compiled.executorLock.builderSha256,
    runtimeSpecification:{fingerprint:compiled.timeline.fingerprint},outputSha256:audioHash(bytes),bytes:bytes.length,usage:"internal-review",patientFacing:false,
    renderEvidence:[{masterId:"HEART_MASTER_VISUAL_V1",evidence:{sourceSha256:compiled.timeline.scenes[0].sourceSha256,
      frames:[{sceneIndex:0,frame:0,projectedBounds:[.1,.2,.9,.9]}]}}]}));
  const visual=await approveAudioVisual(compiled,file,evidence,{ffmpeg:"unit",ffprobe:"unit",timeoutMs:1000},new AbortController().signal);
  const fontPath=path.join(directory,"arial.ttf");await writeFile(fontPath,Buffer.from([0,1,0,0,1]));return {visual,font:await approveSubtitleFont(fontPath)};
}
it.each(["ar","en"])("issues independent %s script/profile/PCM identities with pending quality",async language=>{
  const a=await voice(4000,language),b=await voice(4000,language);expect(a.voiceAudioIdentity).toBe(b.voiceAudioIdentity);
  expect(a.benchmark).toMatchObject({qualityApproval:"pending-owner-listening",timingGranularity:"measured-independent-segments",cost:null});
  expect(a.narration.metadata.durationMs).toBe(21100);expect(narrationFixtureBytes(a.narration).length).toBe(44+21100*96);
  expect(a.script.safety).toMatchObject({patientFacing:false,pathologyNarration:false,rhythmClaim:false,personalization:false});
  expect(a.profile.id).toBe(`${language.toUpperCase()}_CLINICAL_CALM_V1`);expect(isApprovedMedicalVoice(structuredClone(a))).toBe(false);
});
it("copied script/profile JSON and wrong-language profile cannot authorize voice",async()=>{
  const s=script(),p=resolveMedicalVoiceProfile("AR_CLINICAL_CALM_V1"),signal=new AbortController().signal;
  await expect(renderMedicalNarration(structuredClone(s),p,provider(),"CLINICAL_STANDARD",signal)).rejects.toThrow("VOICE_AUTHORITY_INVALID");
  await expect(renderMedicalNarration(s,structuredClone(p),provider(),"CLINICAL_STANDARD",signal)).rejects.toThrow("VOICE_AUTHORITY_INVALID");
  await expect(renderMedicalNarration(s,resolveMedicalVoiceProfile("EN_CLINICAL_CALM_V1"),provider(),"CLINICAL_STANDARD",signal)).rejects.toThrow();
});
it.each(["CLINICAL_SLOW","CREATOR_STANDARD_FUTURE"] as const)("does not silently emulate unsupported %s rate",async rate=>{
  await expect(renderMedicalNarration(script(),resolveMedicalVoiceProfile("AR_CLINICAL_CALM_V1"),provider(),rate,new AbortController().signal)).rejects.toThrow();
});
it.each([
  (r:VoiceProviderResult)=>({...r,requestIdentity:"bad"}),
  (r:VoiceProviderResult)=>({...r,retryCount:2}),
  (r:VoiceProviderResult)=>({...r,cost:{amount:-1,currency:"USD",basis:"unknown"}}),
  (r:VoiceProviderResult)=>({...r,segments:r.segments.slice().reverse()}),
  (r:VoiceProviderResult)=>({...r,segments:r.segments.map(s=>({...s,textHash:"a".repeat(64)}))}),
  (r:VoiceProviderResult)=>({...r,segments:r.segments.map(s=>({...s,pcm:Buffer.alloc(12)}))}),
  (r:VoiceProviderResult)=>({...r,segments:r.segments.map(s=>({...s,spokenTextVerification:{transcript:"your heart is damaged",method:"fixture" as const}}))}),
  (r:VoiceProviderResult)=>({...r,segments:r.segments.map(s=>({...s,words:[{word:"bad",startMs:1,endMs:5000}]}))}),
])("rejects malformed response or unmeasured segment %#",async change=>{
  await expect(renderMedicalNarration(script(),resolveMedicalVoiceProfile("AR_CLINICAL_CALM_V1"),provider(4000,change),"CLINICAL_STANDARD",new AbortController().signal)).rejects.toThrow();
});
it("aborted generation never issues media authority",async()=>{
  const controller=new AbortController();controller.abort();await expect(renderMedicalNarration(script(),resolveMedicalVoiceProfile("AR_CLINICAL_CALM_V1"),provider(),"CLINICAL_STANDARD",controller.signal)).rejects.toThrow("VOICE_CANCELLED");
});
it("operational latency and cost do not invalidate pinned voice audio identity",async()=>{
  const a=await voice(),b=await renderMedicalNarration(script(),resolveMedicalVoiceProfile("AR_CLINICAL_CALM_V1"),
    provider(4000,r=>({...r,latencyMs:200,cost:{amount:0.01,currency:"USD",basis:"test-only"}})),"CLINICAL_STANDARD",new AbortController().signal);
  expect(a.voiceAudioIdentity).toBe(b.voiceAudioIdentity);expect(a.benchmark.generationLatencyMs).not.toBe(b.benchmark.generationLatencyMs);
});
it("moves transition from measured semantic timing without changing native motion clock",async()=>{
  const a=planMedicalAvSync(await voice(4000)),b=planMedicalAvSync(await voice(5000));
  expect(b.transitionStartMs-a.transitionStartMs).toBeCloseTo(2000);expect(a.nativeFrames%24).toBe(0);
  expect(a).toMatchObject({fps:24,speedRatio:1,cycleFrames:24,cycleSourceStartFrame:168,blenderRerenders:0,patientFacing:false});
  expect(a.evidence.every(e=>e.result==="PASS"&&Math.abs(e.leadLagMs)<=MEDICAL_AV_SYNC_V1.transitionToleranceMs)).toBe(true);
  expect(a.evidence[3].targetAvailableMs+200).toBeLessThan(a.evidence[3].startMs);
  expect(isApprovedMedicalAvSync(structuredClone(a))).toBe(false);
  const copied=structuredClone(await voice());expect(()=>planMedicalAvSync(copied)).toThrow("AV_SYNC_AUTHORITY_INVALID");
});
it("voice/text changes reuse the same authorized visual, subtitles follow measured audio",async()=>{
  const {visual,font}=await visualInput(),a=await voice(),b=await voice(5000);
  const first=compileVoiceComposition(visual,font,a,planMedicalAvSync(a)),second=compileVoiceComposition(visual,font,b,planMedicalAvSync(b));
  expect(first.specification.visualIdentity).toBe(second.specification.visualIdentity);
  expect(first.fingerprint).not.toBe(second.fingerprint);expect(first.specification.subtitles[0].startMs).toBe(400);
  expect(first.specification.subtitles[0].endMs).toBe(4400);expect(first.specification.labels).toEqual([]);
  expect(first.specification.music.enabled).toBe(false);expect(isCompiledAudioComposition(first)).toBe(true);
  expect(()=>compileVoiceComposition(visual,font,a,structuredClone(planMedicalAvSync(a)))).toThrow("AUDIO_AUTHORITY_INVALID");
});
const review=():VoiceQualityReview=>({reviewer:"internal-listening-reviewer",evidenceReference:"owned-voice-sample",
  scores:{intelligibility:4,medicalPronunciation:4,naturalness:4,pacing:4,warmth:4,clinicalCredibility:4,restraint:4,languageQuality:4,
    segmentTiming:5,latency:4,reproducibility:3,costMetadata:1,portability:4},repeatedMispronunciation:false,roboticCadence:false,rushed:false,
  clippedEndings:false,materialLanguageError:false,dramatic:false});
it.each(["repeatedMispronunciation","roboticCadence","rushed","clippedEndings","materialLanguageError","dramatic"] as const)("quality review rejects %s even with high scores",flag=>{
  expect(evaluateVoiceQuality({...review(),[flag]:true}).accepted).toBe(false);
});
it("quality scoring is bounded, subjective and separate from clinical approval",()=>{
  expect(evaluateVoiceQuality(review())).toMatchObject({accepted:true,medicalValidation:false,scope:"subjective-internal-product-evaluation"});
  expect(()=>evaluateVoiceQuality({...review(),scores:{...review().scores,naturalness:6}})).toThrow("VOICE_REVIEW_INVALID");
});
it("pronunciation and fallback policies never contain vendor markup or silent substitutions",()=>{
  expect(PRONUNCIATION_V1).toHaveLength(12);expect(PRONUNCIATION_V1.every(h=>!h.spokenForm.includes("<"))).toBe(true);
  expect(VOICE_FALLBACK_V1).toMatchObject({automaticProviderSwitch:false,automaticVoiceSwitch:false,scriptMutation:false,languageMutation:false});
  expect(ORGANHEAL_MEDICAL_VOICE_V1.futureVariantsExecutable).toBe(false);
});
