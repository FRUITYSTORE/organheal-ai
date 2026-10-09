import "server-only";
import { isUuid } from "../validation/uuid";
import { jsonSnapshot } from "./validation/json-snapshot";
import { audioIdentity, audioInvalid, deepAudioFreeze, exactAudio } from "./composition/narration-foundation";
import { isCompiledCinematicExecution, type CompiledCinematicExecution } from "./cinematic-scene-compiler";
import type { ExplanationRequest, ExplanationDepth, ExplanationEvidence, ExplanationScene, ExplanationPhase } from "./contracts/medical-explanation-plan";

export const MEDICAL_VIDEO_DURATION_POLICY_V1=deepAudioFreeze({id:"MEDICAL_VIDEO_DURATION_POLICY_V1",version:"1",
  ranges:{QUICK:[20,45],STANDARD:[45,90],DETAILED:[60,150],COMPREHENSIVE:[120,240]},
  maximumSingleVideoSeconds:240,overflow:"SPLIT_INTO_CHAPTERS",languageWordsPerMinute:{ar:115,en:130},
  transitionPauseSeconds:.4,semanticPauseSeconds:.3,measuredNarrationOverridesEstimate:true});
export const MEDICAL_EXPLANATION_PLANNER_V1=deepAudioFreeze({id:"MEDICAL_EXPLANATION_PLANNER_V1",version:"1",
  maximumTargets:24,maximumEvidence:24,maximumEstimatedWords:2400,maximumChapters:8,
  requestModes:["EXPLAIN_THIS_RESULT","EXPLAIN_THIS_ORGAN","EXPLAIN_RISK","EXPLAIN_TREND","EXPLAIN_SYMPTOM_SAFELY",
    "EXPLAIN_NEXT_ACTION","GENERAL_MEDICAL_EDUCATION"],pathologyEnabled:false,patientFacing:false});
const contexts=new WeakSet<object>();
/** Server-only authorized reader boundary. The reader must authenticate/authorize
 * the owner and classify verified records, never echo client-provided classifications.
 * Context content and planner JSON confer no render, diagnosis or delivery authority. */
export async function readMedicalExplanationContext(ownerId:string,reference:string,
  reader:(owner:string,reference:string)=>Promise<Readonly<{ownerId:string;revision:string;evidence:readonly ExplanationEvidence[]}>>){
  if(!isUuid(ownerId)||!/^[-a-zA-Z0-9:_]{1,120}$/.test(reference))audioInvalid("EXPLANATION_CONTEXT_INVALID");
  const row=jsonSnapshot(await reader(ownerId,reference)) as unknown as Awaited<ReturnType<typeof reader>>;
  if(!exactAudio(row,["ownerId","revision","evidence"])||row.ownerId!==ownerId||
    typeof row.revision!=="string"||!/^[-a-zA-Z0-9:_]{1,120}$/.test(row.revision)||!Array.isArray(row.evidence)||row.evidence.length>24)audioInvalid("EXPLANATION_CONTEXT_INVALID");
  const authorities=["USER_STATED","LAB_VERIFIED","REPORT_VERIFIED","SYSTEM_DERIVED","RISK_ESTIMATE","CONFIRMED_DIAGNOSIS","EDUCATIONAL_CONTEXT"];
  if(row.evidence.some(e=>!exactAudio(e,["reference","authority","topic"])||typeof e.authority!=="string"||!authorities.includes(e.authority)||
    typeof e.reference!=="string"||!/^[-a-zA-Z0-9:_]{1,120}$/.test(e.reference)||typeof e.topic!=="string"||!/^[-a-zA-Z0-9:_]{1,80}$/.test(e.topic))||
    new Set(row.evidence.map(e=>e.reference)).size!==row.evidence.length)audioInvalid("EXPLANATION_CONTEXT_INVALID");
  const context=deepAudioFreeze({ownerId,reference,revision:row.revision,evidence:row.evidence});contexts.add(context);return context;
}
export type MedicalExplanationContext=Awaited<ReturnType<typeof readMedicalExplanationContext>>;
const requestKeys=["requestType","organ","audienceMode","lane","explanationDepth","language","teachingTargets","safetyQualifierCount",
  "crossOrganDependencyCount","terminologyDensity","requiresComparison","requiresNextAction","estimatedNarrationWords"];
function request(value:unknown):ExplanationRequest{
  const v=jsonSnapshot(value) as unknown as ExplanationRequest;
  if(!exactAudio(v,requestKeys)||!MEDICAL_EXPLANATION_PLANNER_V1.requestModes.includes(v.requestType)||
    !["heart","kidney"].includes(v.organ)||!["PATIENT","DOCTOR","CREATOR"].includes(v.audienceMode)||
    !["PERSONAL_HEALTH_MOTION","MEDICAL_CREATOR_MOTION"].includes(v.lane)||
    !Object.hasOwn(MEDICAL_VIDEO_DURATION_POLICY_V1.ranges,v.explanationDepth)||!["ar","en"].includes(v.language)||
    !Array.isArray(v.teachingTargets)||v.teachingTargets.length<1||v.teachingTargets.length>24||
    new Set(v.teachingTargets).size!==v.teachingTargets.length||v.teachingTargets.some(t=>typeof t!=="string"||!/^[-a-zA-Z0-9:_]{1,80}$/.test(t))||
    !["LOW","MODERATE","HIGH"].includes(v.terminologyDensity)||
    [v.safetyQualifierCount,v.crossOrganDependencyCount,v.estimatedNarrationWords].some(n=>!Number.isSafeInteger(n)||n<0)||
    v.safetyQualifierCount>12||v.crossOrganDependencyCount>8||v.estimatedNarrationWords>2400||
    typeof v.requiresComparison!=="boolean"||typeof v.requiresNextAction!=="boolean"||
    (v.lane==="MEDICAL_CREATOR_MOTION"&&(v.audienceMode!=="CREATOR"||v.requestType!=="GENERAL_MEDICAL_EDUCATION"))||
    (v.lane==="PERSONAL_HEALTH_MOTION"&&v.audienceMode==="CREATOR"))audioInvalid("EXPLANATION_REQUEST_INVALID");
  return v;
}
/** Deterministic internal planning only; not executable narration or clinical approval. */
export function planMedicalExplanation(value:unknown,context:MedicalExplanationContext,
  visuals:readonly CompiledCinematicExecution[]=[],measuredNarrationSeconds:number|null=null){
  if(!context||!contexts.has(context)||!Array.isArray(visuals)||visuals.length>4||visuals.some(v=>!isCompiledCinematicExecution(v)))audioInvalid("EXPLANATION_AUTHORITY_INVALID");
  const r=request(value),p=MEDICAL_VIDEO_DURATION_POLICY_V1;
  if(measuredNarrationSeconds!==null&&(!Number.isFinite(measuredNarrationSeconds)||measuredNarrationSeconds<=0||measuredNarrationSeconds>1800))audioInvalid("EXPLANATION_DURATION_INVALID");
  if(r.lane==="MEDICAL_CREATOR_MOTION"&&context.evidence.some(e=>e.authority!=="EDUCATIONAL_CONTEXT"))audioInvalid("CREATOR_PATIENT_DATA_FORBIDDEN");
  const count=r.teachingTargets.length,evidence=context.evidence.length;
  const score=count+Math.ceil(evidence/2)+r.crossOrganDependencyCount*2+r.safetyQualifierCount+
    ({LOW:0,MODERATE:2,HIGH:4}[r.terminologyDensity])+Number(r.requiresComparison)*2+Number(r.requiresNextAction);
  const complexityLevel=score<=4?"LOW":score<=9?"MODERATE":score<=17?"HIGH":"VERY_HIGH";
  const durationReasoning={base:12,targetAdjustment:count*8,evidenceAdjustment:Math.ceil(evidence/2)*5,
    complexityAdjustment:({LOW:0,MODERATE:6,HIGH:14,VERY_HIGH:24}[complexityLevel]),
    safetyAdjustment:r.safetyQualifierCount*3+(r.requestType==="EXPLAIN_SYMPTOM_SAFELY"?8:0),
    comparisonAdjustment:r.requiresComparison?10:0,nextActionAdjustment:r.requiresNextAction?8:0,
    audienceAdjustment:r.audienceMode==="PATIENT"&&r.terminologyDensity==="HIGH"?8:0,
    languageAdjustment:r.language==="ar"?3:0};
  const structural=Object.values(durationReasoning).reduce((a,b)=>a+b,0);
  const estimatedWords=Math.max(r.estimatedNarrationWords,25+count*18+evidence*8+r.safetyQualifierCount*10);
  const narrationEstimateSeconds=estimatedWords/p.languageWordsPerMinute[r.language]*60+
    (count+2)*p.semanticPauseSeconds+2*p.transitionPauseSeconds;
  const comprehensionMinimum=Math.max(structural,narrationEstimateSeconds);
  const narrationBudget=measuredNarrationSeconds===null?narrationEstimateSeconds:measuredNarrationSeconds+2;
  const required=Math.ceil(Math.max(structural,narrationBudget));
  const classes:ExplanationDepth[]=["QUICK","STANDARD","DETAILED","COMPREHENSIVE"];
  let durationClass=r.explanationDepth;
  while(required>p.ranges[durationClass][1]&&classes.indexOf(durationClass)<3)durationClass=classes[classes.indexOf(durationClass)+1];
  const totalSeconds=Math.max(p.ranges[durationClass][0],required),split=totalSeconds>240;
  const chapterCount=split?Math.ceil(totalSeconds/240):1;
  if(chapterCount>8)audioInvalid("EXPLANATION_CHAPTER_LIMIT");
  const hero=visuals.flatMap(v=>v.scenes).find(s=>s.scene.masterId==="HEART_MASTER_VISUAL_V1");
  const available=r.organ==="heart"&&!!hero;
  // Existing hero is not structure-addressable. No planned target becomes a label/pathology.
  const allocate=(seconds:number,targets:readonly string[]):ExplanationScene[]=>{
    const phases:ExplanationPhase[]=["ESTABLISH","ORIENT",...(targets.length>1?["APPROACH"] as const:[]),
      ...targets.flatMap(()=>["FOCUS","EXPLAIN"] as const),"REORIENT"];
    const weights=phases.map(phase=>phase==="EXPLAIN"?5:phase==="FOCUS"?3:1),sum=weights.reduce((a,b)=>a+b,0);
    let used=0,targetIndex=0;
    return phases.map((phase,i)=>{const durationSeconds=i===phases.length-1?seconds-used:Math.floor(seconds*weights[i]/sum);used+=durationSeconds;
      const target=phase==="FOCUS"||phase==="EXPLAIN"?targets[targetIndex]:null;if(phase==="EXPLAIN")targetIndex++;
      return {phase,target,durationSeconds,
        visualStrategy:available?"LOCKED_MASTER_REUSE":"NARRATION_ONLY",masterId:available?"HEART_MASTER_VISUAL_V1":null,
        highlightAllowed:false,pathology:false,motionSpeedRatio:1};});
  };
  const chapters=Array.from({length:chapterCount},(_,i)=>{
    const assigned=r.teachingTargets.filter((_,j)=>Math.min(chapterCount-1,Math.floor(j*chapterCount/count))===i);
    const targets=assigned.length?assigned:[r.teachingTargets[Math.min(count-1,Math.floor(i*count/chapterCount))]];
    const seconds=Math.floor(totalSeconds/chapterCount)+(i<totalSeconds%chapterCount?1:0);
    return {chapterIndex:i,titleKey:i===0?"WHAT_WE_KNOW":i===chapterCount-1?"WHAT_TO_DO_NEXT":"WHAT_IT_MEANS",
      targetDurationSeconds:seconds,teachingTargets:targets,narrationSection:assigned.length?"TARGET_EXPLANATION":"CONTINUED_EXPLANATION",
      scenePlan:allocate(seconds,targets)};
  });
  const qualifier=(authority:string)=>authority==="RISK_ESTIMATE"?"MAY_INCREASE_RISK":authority==="USER_STATED"?"USER_REPORTED_UNCONFIRMED":
    authority==="CONFIRMED_DIAGNOSIS"?"REPORTED_DIAGNOSIS_NOT_NEW_DIAGNOSIS":authority==="EDUCATIONAL_CONTEXT"?"GENERAL_EDUCATION":"SOURCE_ATTRIBUTED_NOT_DISEASE_PROOF";
  const content={plannerVersion:MEDICAL_EXPLANATION_PLANNER_V1.version,policyVersion:p.version,requestType:r.requestType,organ:r.organ,
    audienceMode:r.audienceMode,lane:r.lane,explanationDepth:r.explanationDepth,complexityLevel,complexityScore:score,
    recommendedDurationClass:durationClass,recommendedDurationSeconds:split?null:totalSeconds,totalPlannedSeconds:totalSeconds,
    durationReasoning:{...durationReasoning,narrationEstimateSeconds,measuredNarrationSeconds,comprehensionMinimum,requiredSeconds:required},
    teachingTargets:r.teachingTargets,evidenceReferences:context.evidence.map(e=>({...e,languageRule:qualifier(e.authority)})),
    safetyDisclaimers:["RISK_IS_NOT_DIAGNOSIS","SYMPTOM_IS_NOT_DIAGNOSIS","LAB_ABNORMALITY_IS_NOT_DISEASE","EDUCATIONAL_ANATOMY_ONLY",
      ...(r.requestType==="EXPLAIN_SYMPTOM_SAFELY"?["NO_DIAGNOSIS_OR_VISUAL_PATHOLOGY","EXISTING_CLINICAL_SAFETY_GATE_REQUIRED"]:[])],
    safetyDisposition:"EDUCATIONAL_PLANNING_ONLY",scenePlan:split?[]:chapters[0].scenePlan,
    narrationSections:["WHAT_THIS_IS",...(evidence?["WHAT_WE_KNOW","WHAT_WE_DO_NOT_KNOW"]:[]),"WHAT_IT_MEANS",...(r.requiresNextAction?["WHAT_TO_DO_NEXT"]:[])],
    subtitlePolicy:{preset:"MEDICAL_SUBTITLE_V1",density:r.explanationDepth==="QUICK"?"LOW":"SENTENCE",wordTiming:"measured-only"},
    labelPolicy:"OFF_UNSUPPORTED_TARGETS",musicPolicy:"MUSIC_OFF",voiceProfileRecommendation:`${r.language.toUpperCase()}_CLINICAL_CALM_V1`,
    chapterPlan:split?chapters:null,estimatedRenderClass:available?"CACHED_SCENE_COMPOSE":"INSTANT_COMPOSE",
    supportedRenderClasses:["INSTANT_COMPOSE","CACHED_SCENE_COMPOSE","SEMI_CUSTOM_RENDER","CUSTOM_RENDER"],
    cacheReuseExpectation:available?"PREFER_LOCKED_MASTER_REUSE":"NARRATION_ONLY_NO_ORGAN_RENDER",
    sourceRequirements:available?[{masterId:hero!.scene.masterId,sourceSha256:hero!.scene.sourceSha256,profileFingerprint:hero!.master.profile.fingerprint}]:[],
    visualFocusStrategy:available?"GENERIC_ORGAN_WITH_NARRATION":"NARRATION_ONLY",expectedCacheHit:null,
    expectedBlenderRequired:false,estimatedAudioSeconds:narrationBudget,estimatedVideoSeconds:totalSeconds,
    estimatedSceneCount:chapters.reduce((n,c)=>n+c.scenePlan.length,0),concurrencyClass:"BOUNDED_POST_COMPOSITION",
    costMetadata:null,contextRevision:context.revision,contextIdentity:audioIdentity(context),
    renderAuthority:false,narrationAuthority:false,clinicalApproval:"unreviewed",patientFacing:false};
  return deepAudioFreeze({...content,identity:audioIdentity(content)});
}
