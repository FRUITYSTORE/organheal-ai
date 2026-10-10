import { expect,it } from "vitest";
import { randomUUID } from "node:crypto";
import { adaptMedicalMotionContext,authorizeExplanationExecution,approvedExecutionVoices,type ExecutionEvidence } from "../lib/medical-motion/explanation-execution";
import { buildExecutionNarration } from "../lib/medical-motion/execution-narration";
import { generateChapterNarration,readChapterOwnership } from "../lib/medical-motion/chapter-execution-runtime";
import { ExecutionOwnership } from "../lib/jobs/execution-ownership";
import { resolveExecutionNarration,audioHash } from "../lib/medical-motion/composition/narration-foundation";
import type { MedicalNarrationProvider } from "../lib/medical-motion/contracts/voice-runtime";
import { MEDICAL_EXPLANATION_DEMOS_V1 } from "../lib/medical-motion/explanation-planner-demos";
const evidence:ExecutionEvidence={evidenceId:"lab-1",evidenceType:"LDL_RESULT",sourceAuthority:"LAB_VERIFIED",clinicalMeaning:"RESULT_PRESENT",verification:"source-verified",temporalContext:"2026-10-09",sourceReference:"record-1"};
async function context(e:ExecutionEvidence=evidence){const ownerId=randomUUID();return adaptMedicalMotionContext(ownerId,"authorized-context",async()=>({ownerId,revision:"1",evidence:[e]}));}
const request=MEDICAL_EXPLANATION_DEMOS_V1[0].request;
const provider=(voice="marin"):MedicalNarrationProvider=>({type:"TEST_FIXTURE",supportedRates:["CLINICAL_STANDARD"],async render(r){return {
  requestIdentity:r.requestIdentity,segments:r.segments.map(s=>({segmentId:s.segmentId,textHash:audioHash(s.text),pcm:Buffer.alloc(48000*2*3),
    spokenTextVerification:{transcript:s.text,method:"fixture" as const}})),providerReference:"test-fixture",modelRevision:"fixture-v1",voiceRevision:voice,latencyMs:1,cost:null,retryCount:0};}});
it("preserves evidence authority, temporal/source references and unconfirmed reports",async()=>{
  const c=await context({...evidence,sourceAuthority:"USER_STATED",verification:"unverified"});
  expect(c.evidence[0]).toMatchObject({sourceAuthority:"USER_STATED",allowedNarrationUse:"UNCONFIRMED_REPORT",pathologyAuthority:false,temporalContext:"2026-10-09"});
  await expect(context({...evidence,sourceAuthority:"USER_STATED"})).rejects.toThrow();
});
it("rejects copied context and unsafe planner modifications",async()=>{
  const c=await context(),p=authorizeExplanationExecution(request,c);
  expect(()=>authorizeExplanationExecution(request,JSON.parse(JSON.stringify(c)))).toThrow("EXECUTION_AUTHORITY_INVALID");
  expect(()=>authorizeExplanationExecution(request,c,null,{...p.explanationPlan,patientFacing:true})).toThrow("UNSAFE_PLANNER_INSTRUCTION");
  expect(authorizeExplanationExecution(request,c,null,p.explanationPlan).executionPlanId).toBe(p.executionPlanId);
});
it.each(["plaque","stenosis","enlarged-heart","arrhythmia","confirmed-disease"])("blocks %s from LDL instead of silently substituting",async target=>{
  const c=await context();expect(()=>authorizeExplanationExecution({...request,teachingTargets:[target]},c)).toThrow("UNSAFE_VISUAL_TARGET");
});
it("script authority rejects copied chapters; voice changes leave script identity intact",async()=>{
  const chapter=authorizeExplanationExecution(request,await context()).chapters[0];
  expect(()=>resolveExecutionNarration(JSON.parse(JSON.stringify(chapter)))).toThrow();
  const a=buildExecutionNarration(chapter),s=resolveExecutionNarration(chapter);
  const marin=await generateChapterNarration(chapter,()=>provider(),new AbortController().signal);
  const cedar=await generateChapterNarration(chapter,voice=>{if(voice==="marin")return {...provider(),async render(){throw Error("VOICE_PROVIDER_UNAVAILABLE");}};return provider("cedar");},new AbortController().signal);
  expect(marin.selectedVoice).toBe("marin");expect(cedar.selectedVoice).toBe("cedar");
  expect(cedar.voice.voiceAudioIdentity).not.toBe(marin.voice.voiceAudioIdentity);
  expect(cedar.voice.script.scriptHash).toBe(s.scriptHash);expect(a.narrationScriptId).toBe(buildExecutionNarration(chapter).narrationScriptId);
});
it("approved language order excludes onyx and content errors cannot fall back",async()=>{
  expect(approvedExecutionVoices("ar")).toEqual(["marin","cedar"]);expect(approvedExecutionVoices("en")).toEqual(["marin","cedar"]);
  const chapter=authorizeExplanationExecution(request,await context()).chapters[0];
  await expect(generateChapterNarration(chapter,()=>provider("onyx"),new AbortController().signal)).rejects.toThrow("VOICE_SELECTION_DRIFT");
  await expect(generateChapterNarration(chapter,()=>({...provider(),async render(){throw Error("VOICE_SPOKEN_CONTENT_MISMATCH");}}),new AbortController().signal)).rejects.toThrow("VOICE_SPOKEN_CONTENT_MISMATCH");
});
it("kidney records narration-only fallback without substituting heart anatomy",async()=>{
  const c=await context({...evidence,evidenceType:"KIDNEY_RESULT"});
  const chapter=authorizeExplanationExecution(MEDICAL_EXPLANATION_DEMOS_V1[2].request,c).chapters[0];
  expect(chapter).toMatchObject({visualStrategy:"NARRATION_ONLY",visualIdentity:null,fallbackReasons:["TRUSTED_VISUAL_UNAVAILABLE"],patientFacing:false});
});
it("symptoms cannot become diagnostic instructions and emergency qualifiers survive",async()=>{
  const c=await context({...evidence,evidenceType:"CHEST_DISCOMFORT",sourceAuthority:"USER_STATED",verification:"unverified",clinicalMeaning:"REPORTED_SYMPTOM"});
  expect(()=>authorizeExplanationExecution(request,c)).toThrow("EXECUTION_INTENT_UNSUPPORTED");
  const p=authorizeExplanationExecution(MEDICAL_EXPLANATION_DEMOS_V1[3].request,c);
  expect(buildExecutionNarration(p.chapters[0]).sections.map(s=>s.text).join(" ")).toContain("الطارئة");
  expect(p.chapters[0].pathology).toBe(false);
  expect(p).toMatchObject({executionBlocked:true,blockReasons:["EXISTING_CLINICAL_SAFETY_GATE_REQUIRED"]});
  await expect(generateChapterNarration(p.chapters[0],()=>provider(),new AbortController().signal)).rejects.toThrow("CHAPTER_AUTHORITY_INVALID");
});
it("job readers must bind owner/context/revision and distinct single-use stages",async()=>{
  const c=await context(),chapter=authorizeExplanationExecution(request,c).chapters[0];
  const own=()=>new ExecutionOwnership({jobId:randomUUID(),attemptToken:randomUUID()},{
    async renewLease(){return {outcome:"ownership-lost",status:null,leaseExpiresAt:null};},async publish(){throw Error("NO_PUBLICATION");}});
  const row={ownerId:chapter.ownerId,contextId:chapter.contextId,contextRevision:chapter.contextRevision,narrationOwnership:own(),compositionOwnership:own()};
  await expect(readChapterOwnership(chapter,async()=>({...row,ownerId:randomUUID()}))).rejects.toThrow("CHAPTER_OWNERSHIP_BINDING_INVALID");
  await expect(readChapterOwnership(chapter,async()=>({...row,contextRevision:"stale"}))).rejects.toThrow();
  await expect(readChapterOwnership(chapter,async()=>({...row,compositionOwnership:row.narrationOwnership}))).rejects.toThrow();
  expect(await readChapterOwnership(chapter,async()=>row)).toMatchObject({narrationOwnership:row.narrationOwnership});
});
it("narration-only heart plans never reference an unavailable internal scene",async()=>{
  const chapter=authorizeExplanationExecution(request,await context()).chapters[0];
  const text=buildExecutionNarration(chapter).sections.map(s=>s.text).join(" ");
  expect(text).not.toContain("ننتقل الآن");expect(text).not.toContain("حركة المصدر");
  expect(chapter.fallbackReasons).toEqual(["TRUSTED_VISUAL_UNAVAILABLE"]);
});
it("long plans have independent chapter/script identities and evidence changes invalidate plans",async()=>{
  const c=await context(),p=authorizeExplanationExecution(MEDICAL_EXPLANATION_DEMOS_V1[4].request,c);
  expect(p.chapters).toHaveLength(2);expect(p.chapters.every(c=>c.targetDuration<=240)).toBe(true);
  expect(new Set(p.chapters.map(c=>c.chapterId)).size).toBe(2);
  expect(new Set(p.chapters.map(c=>buildExecutionNarration(c).narrationScriptId)).size).toBe(2);
  const changed=await context({...evidence,sourceReference:"record-2"});
  expect(authorizeExplanationExecution(request,changed).executionPlanId).not.toBe(authorizeExplanationExecution(request,c).executionPlanId);
});
