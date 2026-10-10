import "server-only";
import { isVisualLibrary, type VisualLibrary } from "./visual-library/visual-library-loader";
import { resolveHeartLibraryConcept } from "./visual-library/visual-library-resolver";
import { explanationVisualRecipe } from "./render/explanation-visual-recipe";
import { isUuid } from "../validation/uuid";
import { jsonSnapshot } from "./validation/json-snapshot";
import { audioIdentity, audioInvalid, deepAudioFreeze, exactAudio } from "./composition/narration-foundation";
import { readMedicalExplanationContext, planMedicalExplanation } from "./medical-explanation-planner";
import type { ExplanationRequest, MedicalEvidenceAuthority } from "./contracts/medical-explanation-plan";
import { isApprovedAudioVisual, type ApprovedAudioVisual } from "./composition/audio-media-authority";
import { OWNER_VOICE_SELECTION_V1 } from "./composition/voice-audition-evidence";

export const MEDICAL_MOTION_CONTEXT_ADAPTER_V1 = Object.freeze({id:"MEDICAL_MOTION_CONTEXT_ADAPTER_V1",version:"1"});
export const MEDICAL_EXPLANATION_EXECUTION_PLAN_V1 = Object.freeze({id:"MEDICAL_EXPLANATION_EXECUTION_PLAN_V1",version:"1",patientFacing:false});
export type ExecutionEvidence = Readonly<{evidenceId:string;evidenceType:"LDL_RESULT"|"HEART_AGE"|"KIDNEY_RESULT"|"CHEST_DISCOMFORT"|"GENERAL";
  sourceAuthority:MedicalEvidenceAuthority;clinicalMeaning:"RESULT_PRESENT"|"RISK_COMMUNICATION"|"REPORTED_SYMPTOM"|"GENERAL_EDUCATION";
  verification:"unverified"|"source-verified";temporalContext:string|null;sourceReference:string}>;
type SourceContext = Readonly<{ownerId:string;revision:string;evidence:readonly ExecutionEvidence[]}>;
const contexts=new WeakSet<object>(),plans=new WeakSet<object>(),chapters=new WeakSet<object>();
const authorities=["USER_STATED","LAB_VERIFIED","REPORT_VERIFIED","SYSTEM_DERIVED","RISK_ESTIMATE","CONFIRMED_DIAGNOSIS","EDUCATIONAL_CONTEXT"];
/** Server-injected reader MUST authorize owner/reference before returning structured records.
 * No endpoint accepts a reader, raw medical prose or claimed authority from a client. */
export async function adaptMedicalMotionContext(ownerId:string,reference:string,reader:(owner:string,reference:string)=>Promise<SourceContext>){
  if(!isUuid(ownerId)||!/^[-a-zA-Z0-9:_]{1,120}$/.test(reference))audioInvalid("EXECUTION_CONTEXT_INVALID");
  const row=jsonSnapshot(await reader(ownerId,reference)) as unknown as SourceContext;
  if(!exactAudio(row,["ownerId","revision","evidence"])||row.ownerId!==ownerId||typeof row.revision!=="string"||!/^[-a-zA-Z0-9:_]{1,120}$/.test(row.revision)||
    !Array.isArray(row.evidence)||row.evidence.length<1||row.evidence.length>24)audioInvalid("EXECUTION_CONTEXT_INVALID");
  for(const e of row.evidence){
    if(!exactAudio(e,["evidenceId","evidenceType","sourceAuthority","clinicalMeaning","verification","temporalContext","sourceReference"])||
      ![e.evidenceId,e.sourceReference].every(v=>typeof v==="string"&&/^[-a-zA-Z0-9:_]{1,120}$/.test(v))||
      typeof e.sourceAuthority!=="string"||!authorities.includes(e.sourceAuthority)||typeof e.evidenceType!=="string"||!["LDL_RESULT","HEART_AGE","KIDNEY_RESULT","CHEST_DISCOMFORT","GENERAL"].includes(e.evidenceType)||
      typeof e.clinicalMeaning!=="string"||!["RESULT_PRESENT","RISK_COMMUNICATION","REPORTED_SYMPTOM","GENERAL_EDUCATION"].includes(e.clinicalMeaning)||
      typeof e.verification!=="string"||!["unverified","source-verified"].includes(e.verification)||e.temporalContext!==null&&(typeof e.temporalContext!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(e.temporalContext))||
      e.sourceAuthority==="USER_STATED"&&e.verification!=="unverified"||
      ["LAB_VERIFIED","REPORT_VERIFIED"].includes(e.sourceAuthority)&&e.verification!=="source-verified"||
      ["LDL_RESULT","KIDNEY_RESULT"].includes(e.evidenceType)&&e.clinicalMeaning!=="RESULT_PRESENT"||
      e.evidenceType==="GENERAL"&&e.clinicalMeaning!=="GENERAL_EDUCATION"||
      e.evidenceType==="CHEST_DISCOMFORT"&&e.clinicalMeaning!=="REPORTED_SYMPTOM"||
      e.evidenceType==="HEART_AGE"&&e.clinicalMeaning!=="RISK_COMMUNICATION")audioInvalid("EXECUTION_EVIDENCE_INVALID");
  }
  if(new Set(row.evidence.map(e=>e.evidenceId)).size!==row.evidence.length)audioInvalid("EXECUTION_EVIDENCE_INVALID");
  const evidence=row.evidence.map(e=>({...e,allowedNarrationUse:e.sourceAuthority==="USER_STATED"?"UNCONFIRMED_REPORT":"SOURCE_ATTRIBUTED_EDUCATION",
    allowedVisualUse:"EDUCATIONAL_ONLY",pathologyAuthority:false,personalizationAllowed:e.sourceAuthority!=="EDUCATIONAL_CONTEXT"}));
  const plannerContext=await readMedicalExplanationContext(ownerId,reference,async()=>({ownerId,revision:row.revision,
    evidence:evidence.map(e=>({reference:e.evidenceId,authority:e.sourceAuthority,topic:e.evidenceType}))}));
  const content={adapterVersion:"1",ownerId,reference,revision:row.revision,evidence};
  const result=deepAudioFreeze({...content,contextId:audioIdentity(content),plannerContext});contexts.add(result);return result;
}
export type TrustedMedicalMotionContext=Awaited<ReturnType<typeof adaptMedicalMotionContext>>;
export function approvedExecutionVoices(language:"ar"|"en"){
  const candidates=OWNER_VOICE_SELECTION_V1.candidates.filter(c=>c.language===language&&c.accepted&&c.ownerListeningApproved);
  return deepAudioFreeze([...candidates.filter(c=>c.preferred),...candidates.filter(c=>c.fallbackEligible)].map(c=>c.voice));
}
/** Recompute from trusted context; planner JSON is compared, NEVER executed.
 * Current bounded intents do not narrate diagnoses or fabricate measurements. */
export function authorizeExplanationExecution(request:ExplanationRequest,context:TrustedMedicalMotionContext,
  visual:ApprovedAudioVisual|null=null,proposedPlan?:unknown,library?:VisualLibrary){
  if(!contexts.has(context)||visual!==null&&!isApprovedAudioVisual(visual))audioInvalid("EXECUTION_AUTHORITY_INVALID");
  if(library!==undefined&&(!isVisualLibrary(library)||visual!==null))audioInvalid("EXECUTION_AUTHORITY_INVALID");
  const targets=["LDL","blood-pressure","heart-age","trend","risk-uncertainty","next-action","creatinine","symptom-context","uncertainty","heart-function","ventricle","aorta"];
  if(!Array.isArray(request.teachingTargets)||request.teachingTargets.some(t=>!targets.includes(t)))audioInvalid("UNSAFE_VISUAL_TARGET");
  const plan=planMedicalExplanation(request,context.plannerContext,visual?[visual.compiled]:[]);
  if(proposedPlan!==undefined&&audioIdentity(jsonSnapshot(proposedPlan))!==audioIdentity(plan))audioInvalid("UNSAFE_PLANNER_INSTRUCTION");
  const evidenceType=context.evidence[0].evidenceType;
  const intent:"LDL"|"HEART_AGE"|"KIDNEY"|"SYMPTOM"|"GENERAL"=evidenceType==="LDL_RESULT"?"LDL":evidenceType==="HEART_AGE"?"HEART_AGE":evidenceType==="KIDNEY_RESULT"?"KIDNEY":evidenceType==="CHEST_DISCOMFORT"?"SYMPTOM":"GENERAL";
  if(context.evidence.some(e=>e.evidenceType!==evidenceType&&e.evidenceType!=="GENERAL")||
    intent==="KIDNEY"&&request.organ!=="kidney"||intent!=="KIDNEY"&&request.organ!=="heart"||
    intent==="SYMPTOM"&&request.requestType!=="EXPLAIN_SYMPTOM_SAFELY")audioInvalid("EXECUTION_INTENT_UNSUPPORTED");
  const useVisual=request.organ==="heart"&&visual!==null;
  const librarySelection=library&&request.organ==="heart"&&["LDL","HEART_AGE"].includes(intent)?
    resolveHeartLibraryConcept(library,"heart",intent==="LDL"?"LDL_EDUCATION":"HEART_AGE"):null;
  const definitions=plan.chapterPlan??[{chapterIndex:0,targetDurationSeconds:plan.totalPlannedSeconds,teachingTargets:plan.teachingTargets,scenePlan:plan.scenePlan}];
  const chapterPlans=definitions.map(c=>{
    const content={version:"1",chapterIndex:c.chapterIndex,ownerId:context.ownerId,contextRevision:context.revision,contextId:context.contextId,planId:plan.identity,language:request.language,
      intent,visualRecipe:librarySelection?null:explanationVisualRecipe(intent),...(librarySelection?{librarySelection}:{} as {librarySelection?: typeof librarySelection}),evidence:context.evidence,targetDuration:c.targetDurationSeconds,teachingTargets:c.teachingTargets,
      voiceProfileId:`${request.language.toUpperCase()}_CLINICAL_CALM_V1`,voices:approvedExecutionVoices(request.language),
      visualStrategy:librarySelection?"LIBRARY_REFERENCE_COMPOSE":useVisual?"CACHED_SCENE_COMPOSE":"NARRATION_ONLY",visualIdentity:librarySelection?.identity??(useVisual?visual!.visualIdentity:null),
      visualSha256:useVisual?visual!.sha256:null,fallbackReasons:useVisual||librarySelection?[]:["TRUSTED_VISUAL_UNAVAILABLE"],
      labels:[],music:"MUSIC_OFF",motionSpeedRatio:1,pathology:false,patientFacing:false,
      executionBlocked:intent==="SYMPTOM",blockReasons:intent==="SYMPTOM"?["EXISTING_CLINICAL_SAFETY_GATE_REQUIRED"]:[],
      safetyAssertions:["RISK_IS_NOT_DIAGNOSIS","SYMPTOM_IS_NOT_DIAGNOSIS","SOURCE_BOUNDARY_EXPLICIT","NATIVE_CYCLE_ONLY","NO_UNSUPPORTED_LABELS"],
      openingPolicy:"CONTENT_AT_400MS",closingPolicy:"SAFE_REORIENT",subtitlePolicy:"MEDICAL_SUBTITLE_V1"};
    const chapter=deepAudioFreeze({...content,chapterId:audioIdentity(content)});chapters.add(chapter);return chapter;
  });
  const content={version:"1",plannerVersion:"1",contextAdapterVersion:"1",language:request.language,audienceMode:request.audienceMode,
    durationClass:plan.recommendedDurationClass,expectedTotalDuration:plan.totalPlannedSeconds,chapters:chapterPlans,
    renderClass:useVisual?"CACHED_SCENE_COMPOSE":"INSTANT_COMPOSE",cacheStrategy:"REUSE_EXACT_PINNED_MASTER",
    patientFacing:false,executionBlocked:intent==="SYMPTOM",blockReasons:intent==="SYMPTOM"?["EXISTING_CLINICAL_SAFETY_GATE_REQUIRED"]:[],planId:plan.identity,contextId:context.contextId};
  const result=deepAudioFreeze({...content,executionPlanId:audioIdentity(content),explanationPlan:plan});plans.add(result);return result;
}
export type ExecutionChapter=ReturnType<typeof authorizeExplanationExecution>["chapters"][number];
export const isExecutionChapter=(v:unknown):v is ExecutionChapter=>!!v&&typeof v==="object"&&chapters.has(v);
export type ExplanationExecutionPlan=ReturnType<typeof authorizeExplanationExecution>;
export const isExplanationExecutionPlan=(v:unknown):v is ExplanationExecutionPlan=>!!v&&typeof v==="object"&&plans.has(v);
