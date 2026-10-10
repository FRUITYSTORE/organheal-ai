import "server-only";
import type { ExplanationVisualRecipe } from "../render/explanation-visual-recipe";
import type { SemanticVisualCue, VoiceQualityReview } from "../contracts/voice-runtime";
import { audioIdentity, audioInvalid, deepAudioFreeze,resolveExecutionNarration } from "./narration-foundation";
import { isApprovedMedicalVoice, type ApprovedMedicalVoice, evaluateVoiceQuality } from "./voice-runtime";
import { validateVisualActivity } from "../render/no-dead-visual-time";
import { isExecutionChapter, type ExecutionChapter } from "../explanation-execution";

export const MEDICAL_AV_SYNC_V1=deepAudioFreeze({id:"MEDICAL_AV_SYNC_V1",version:"1",fps:24,
  openingContentMs:400,transitionMs:400,subtitleToleranceMs:50,cueLeadToleranceMs:250,cueLagToleranceMs:500,
  transitionToleranceMs:100,minimumRevealLeadMs:200,minimumVisualHoldMs:400,outroBreathingMs:750,
  maximumHeroPush:1.095,motionSpeedRatio:1,cycleSourceStartFrame:168,cycleFrames:24,
  supportedCues:["INTRODUCE_ORGAN","ORIENT_VIEWER","BEGIN_APPROACH","ARRIVE_AT_TARGET","BEGIN_SOURCE_TRANSITION",
    "REVEAL_INTERNAL_VIEW","EXPLAIN_FUNCTION","SHOW_NATIVE_MOTION","FOCUS_STRUCTURE","REORIENT_VIEWER","NEXT_ACTION","OUTRO"] as readonly SemanticVisualCue[],
  geometryMutation:false,sourceTransition:"fade-through-dark",music:"MUSIC_OFF",labels:[],patientFacing:false});
const issued=new WeakSet<object>();
/** Exact educational catalogue associations. FOCUS_STRUCTURE is deliberately
 * non-executable until the approved visual supplies an addressable target. */
export function planMedicalAvSync(voice:ApprovedMedicalVoice){
  if(!isApprovedMedicalVoice(voice)||voice.timings.length!==5)audioInvalid("AV_SYNC_AUTHORITY_INVALID");
  const t=voice.timings.map(s=>({...s,startMs:s.startMs+400,endMs:s.endMs+400}));
  const heroFrames=Math.round((t[2].startMs+200)/1000*24),boundaryMs=heroFrames/24*1000;
  const nativeFrames=Math.ceil((t[4].endMs+750-boundaryMs)/1000)*24,frameCount=heroFrames+nativeFrames;
  if(heroFrames<48||nativeFrames<48||frameCount>1440)audioInvalid("AV_SYNC_DURATION_INVALID");
  const durationMs=frameCount/24*1000,transitionStartMs=boundaryMs-200,transitionEndMs=boundaryMs+200;
  const sceneBounds=[0,t[0].endMs,t[1].startMs,transitionStartMs,transitionEndMs,t[4].startMs,durationMs];
  // Scene 1 is a brief semantic pause; scene 2 is the bounded exterior approach.
  const scenes=sceneBounds.slice(0,-1).map((startMs,i)=>({sceneIndex:i,startMs,endMs:sceneBounds[i+1]}));
  if(scenes.some(s=>s.endMs<=s.startMs)||t[3].startMs<transitionEndMs+200)audioInvalid("AV_SYNC_TARGET_UNAVAILABLE");
  validateVisualActivity({durationMs:transitionStartMs,nativeMotion:false,cameraMotion:{startRatio:1,endRatio:1.095,durationMs:transitionStartMs},
    visualFocus:false,meaningfulTransition:false,hold:null});
  validateVisualActivity({durationMs:durationMs-boundaryMs,nativeMotion:true,cameraMotion:null,visualFocus:false,meaningfulTransition:false,hold:null});
  const cues:SemanticVisualCue[]=["INTRODUCE_ORGAN","BEGIN_APPROACH","BEGIN_SOURCE_TRANSITION","SHOW_NATIVE_MOTION","REORIENT_VIEWER"];
  const evidence=t.map((segment,i)=>{
    // FFmpeg evaluates overlays/fades on output frames: the first eligible
    // frame is the ceiling, not the nearest frame. These are visible cue onsets,
    // not claims that the already continuous camera/native action starts anew.
    const eventMs=Math.ceil((i===2?transitionStartMs:segment.startMs)/1000*24)/24*1000;
    const sceneIndices=scenes.filter(s=>segment.startMs<s.endMs&&segment.endMs>s.startMs).map(s=>s.sceneIndex);
    const availableMs=i<2?0:i===2?eventMs:Math.ceil(transitionEndMs/1000*24)/24*1000;
    const leadLagMs=eventMs-segment.startMs;
    if(Math.abs(leadLagMs)>(i===2?100:50)||i>2&&segment.startMs<availableMs+200)audioInvalid("AV_SYNC_ALIGNMENT_INVALID");
    return {...segment,semanticCue:cues[i],phase:i<2?"external-hero":i===2?"source-transition":"native-internal",
      preferredScene:i<2?i===0?0:2:i===2?3:i===3?4:5,sceneIndices,
      visualTarget:i<2?"HEART_MASTER_VISUAL_V1":i===2?"EXPLICIT_SOURCE_BOUNDARY":"HEARTBEAT_MOTION_MASTER_V1",
      destinationTarget:i===2?"HEARTBEAT_MOTION_MASTER_V1":null,
      destinationAvailableMs:i===2?Math.ceil(transitionEndMs/1000*24)/24*1000:null,
      visualEventType:i===2?"source-fade-first-frame":"narration-aligned-subtitle-onset",
      cameraState:i<2?"continuous-bounded-approach":"static-native-review",
      targetAvailableMs:availableMs,visualEventMs:eventMs,leadLagMs,minimumVisualLeadMs:i>2?200:0,
      minimumVisualHoldMs:400,subtitleCueReference:`voice-cue-${i}`,result:"PASS"};
  });
  const content={id:MEDICAL_AV_SYNC_V1.id,version:"1",voiceAudioIdentity:voice.voiceAudioIdentity,
    scriptHash:voice.script.scriptHash,profileId:voice.profile.id,frameCount,durationMs,fps:24,heroFrames,nativeFrames,
    nativeCycles:nativeFrames/24,speedRatio:1,cycleFrames:24,cycleSourceStartFrame:168,transitionStartMs,transitionEndMs,
    boundaryMs,scenes,evidence,visualRecipe:null as ExplanationVisualRecipe|null,returnExteriorFrame:null as number|null,
    policy:MEDICAL_AV_SYNC_V1,blenderRerenders:0,usage:"internal-review",patientFacing:false};
  const plan=deepAudioFreeze({...content,identity:audioIdentity(content)});issued.add(plan);return plan;
}
export type ApprovedMedicalAvSync=ReturnType<typeof planMedicalAvSync>;
export const isApprovedMedicalAvSync=(v:unknown):v is ApprovedMedicalAvSync=>!!v&&typeof v==="object"&&issued.has(v);
/** Execution chunks retain the 60s media boundary. Long chapters comprise
 * independently owned chunks; a short proof is explicitly incomplete. */
export function planExecutionChapterSync(voice:ApprovedMedicalVoice,chapter:ExecutionChapter){
  if(!isExecutionChapter(chapter)||chapter.executionBlocked||!isApprovedMedicalVoice(voice)||chapter.visualStrategy!=="CACHED_SCENE_COMPOSE"||
    voice.script.language!==chapter.language||voice.script.scriptHash!==resolveExecutionNarration(chapter).scriptHash)audioInvalid("CHAPTER_SYNC_AUTHORITY_INVALID");
  const base=planMedicalAvSync(voice),minimum=Math.min(Math.floor(60-base.heroFrames/24)+base.heroFrames/24,chapter.targetDuration);
  const nativeCycles=Math.max(base.nativeCycles,Math.ceil(minimum-base.heroFrames/24));
  const nativeFrames=nativeCycles*24,frameCount=base.heroFrames+nativeFrames;
  if(frameCount>1440)audioInvalid("CHAPTER_CHUNK_DURATION_EXCEEDED");
  const durationMs=frameCount/24*1000;
  const returnFrame=chapter.visualRecipe?.returnExterior?
    base.heroFrames+Math.max(2,Math.ceil((voice.timings[4].startMs+400-base.boundaryMs)/1000))*24:null;
  const content={...base,visualRecipe:chapter.visualRecipe,returnExteriorFrame:returnFrame!==null&&returnFrame<frameCount-24?returnFrame:null,
    nativeCycles,nativeFrames,frameCount,durationMs,scenes:base.scenes.map((s,i)=>i===base.scenes.length-1?{...s,endMs:durationMs}:s)};
  const result=deepAudioFreeze({...content,identity:audioIdentity(content)});issued.add(result);return result;
}
/** Optional review data never issues execution authority or medical approval. */
export function reviewedVoiceScorecard(review:VoiceQualityReview){return evaluateVoiceQuality(review);}
