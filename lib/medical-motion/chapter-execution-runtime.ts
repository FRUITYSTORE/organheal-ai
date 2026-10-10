import "server-only";
import { composeLibraryChapter } from "./visual-library/visual-library-composition";
import { isVisualLibrary, type VisualLibrary } from "./visual-library/visual-library-loader";
import { performance } from "node:perf_hooks";
import type { MedicalNarrationProvider } from "./contracts/voice-runtime";
import { ExecutionOwnership } from "../jobs/execution-ownership";
import { isExecutionChapter, type ExecutionChapter } from "./explanation-execution";
import { buildExecutionNarration } from "./execution-narration";
import { audioIdentity,audioInvalid,deepAudioFreeze,resolveExecutionNarration } from "./composition/narration-foundation";
import { renderMedicalNarration,resolveMedicalVoiceProfile } from "./composition/voice-runtime";
import { planExecutionChapterSync } from "./composition/medical-av-sync";
import { compileVoiceComposition } from "./composition/audio-specification";
import { composeOwnedAudio } from "./composition/audio-compositor";
import { isApprovedAudioVisual,type ApprovedAudioVisual,type ApprovedSubtitleFont } from "./composition/audio-media-authority";
import type { FfmpegRuntime } from "./composition/ffmpeg-runtime";

export const CHAPTER_COMPOSITION_V1=Object.freeze({id:"CHAPTER_COMPOSITION_V1",version:"1",maximumChunkSeconds:60,maximumChapterSeconds:240,
  maximumChapters:8,patientFacing:false});
const bindings=new WeakMap<object,string>();
/** Server reader must authorize BOTH job attempts for this owner/context/revision.
 * No public path accepts a reader or request-supplied ownership objects. */
export async function readChapterOwnership(chapter:ExecutionChapter,reader:(chapter:ExecutionChapter)=>Promise<{
  ownerId:string;contextId:string;contextRevision:string;narrationOwnership:ExecutionOwnership;compositionOwnership:ExecutionOwnership}>){
  if(!isExecutionChapter(chapter)||chapter.executionBlocked)audioInvalid("CHAPTER_AUTHORITY_INVALID");
  const row=await reader(chapter);
  if(row.ownerId!==chapter.ownerId||row.contextId!==chapter.contextId||row.contextRevision!==chapter.contextRevision||
    !(row.narrationOwnership instanceof ExecutionOwnership)||!(row.compositionOwnership instanceof ExecutionOwnership)||
    row.narrationOwnership===row.compositionOwnership)audioInvalid("CHAPTER_OWNERSHIP_BINDING_INVALID");
  const binding=Object.freeze({narrationOwnership:row.narrationOwnership,compositionOwnership:row.compositionOwnership});
  bindings.set(binding,chapter.chapterId);return binding;
}
/** Trusted server factory binds a specific approved voice. Only availability
 * failures may advance to the approved same-language fallback; content failures stop. */
export async function generateChapterNarration(chapter:ExecutionChapter,factory:(voice:"marin"|"cedar")=>MedicalNarrationProvider,signal:AbortSignal){
  if(!isExecutionChapter(chapter)||chapter.executionBlocked)audioInvalid("CHAPTER_AUTHORITY_INVALID");
  const script=resolveExecutionNarration(chapter),plan=buildExecutionNarration(chapter),start=performance.now();
  for(const selected of chapter.voices){
    if(selected!=="marin"&&selected!=="cedar")audioInvalid("VOICE_SELECTION_REJECTED");
    try{
      const voice=await renderMedicalNarration(script,resolveMedicalVoiceProfile(chapter.voiceProfileId),factory(selected),"CLINICAL_STANDARD",signal);
      if(voice.benchmark.voiceRevision!==selected)audioInvalid("VOICE_SELECTION_DRIFT");
      return {voice,narrationPlan:plan,selectedVoice:selected,generationMs:performance.now()-start};
    }catch(error){
      if(signal.aborted||!(error instanceof Error)||error.message!=="VOICE_PROVIDER_UNAVAILABLE"||selected===chapter.voices.at(-1))throw error;
    }
  }
  audioInvalid("VOICE_UNAVAILABLE");
}
/** One bounded composition chunk per call. Owner/revision must be authorized
 * upstream; ownership is reconfirmed before and after media writes. */
export async function executeExplanationChapter(chapter:ExecutionChapter,binding:Awaited<ReturnType<typeof readChapterOwnership>>,
  factory:(voice:"marin"|"cedar")=>MedicalNarrationProvider,visual:ApprovedAudioVisual|null,font:ApprovedSubtitleFont,
  media:FfmpegRuntime,signal:AbortSignal,library?:VisualLibrary){
  if(!isExecutionChapter(chapter)||!binding||bindings.get(binding)!==chapter.chapterId||
    chapter.visualStrategy==="CACHED_SCENE_COMPOSE"&&(!visual||!isApprovedAudioVisual(visual)||visual.visualIdentity!==chapter.visualIdentity||visual.sha256!==chapter.visualSha256)||
    chapter.visualStrategy==="NARRATION_ONLY"&&visual!==null||
    chapter.visualStrategy==="LIBRARY_REFERENCE_COMPOSE"&&(!isVisualLibrary(library)||visual!==null||
      library.fingerprint!==chapter.librarySelection?.libraryFingerprint))audioInvalid("CHAPTER_AUTHORITY_INVALID");
  const {compositionOwnership:ownership,narrationOwnership}=binding;
  const start=performance.now();
  if(ownership.signal.aborted||signal.aborted)audioInvalid("CHAPTER_CANCELLED");
  let generationError:unknown;
  const narrationResult=await narrationOwnership.run(async ownedSignal=>{
    try{return {status:"succeeded",value:await generateChapterNarration(chapter,factory,AbortSignal.any([signal,ownedSignal,ownership.signal]))};}
    catch(error){generationError=error;return {status:"failed"};}
  });
  if(narrationResult.execution!=="succeeded"||!await narrationOwnership.confirmHandoff())throw generationError??Error("CHAPTER_OWNERSHIP_LOST");
  const generated=narrationResult.value;
  if(!generated)audioInvalid("CHAPTER_OWNERSHIP_LOST");
  const syncStart=performance.now();
  if(chapter.visualStrategy==="LIBRARY_REFERENCE_COMPOSE"){
    const artifact=await composeLibraryChapter(chapter,library!,generated.voice,font,ownership,media,signal);
    if(!artifact)audioInvalid("CHAPTER_OWNERSHIP_LOST");
    return {generated,evidence:artifact.evidence,artifact};
  }
  if(chapter.visualStrategy==="NARRATION_ONLY"){
    const result=await ownership.run(async()=>({status:"succeeded",value:generated}));
    if(result.execution!=="succeeded"||!await ownership.confirmHandoff())audioInvalid("CHAPTER_OWNERSHIP_LOST");
    const content={chapterId:chapter.chapterId,narrationScriptId:generated.narrationPlan.narrationScriptId,
      voiceAudioId:generated.voice.voiceAudioIdentity,voice:generated.selectedVoice,visualBindings:[],fallbackReasons:chapter.fallbackReasons,
      measuredNarrationDuration:generated.voice.narration.metadata.durationMs/1000,patientFacing:false};
    return {generated,evidence:deepAudioFreeze({...content,chapterCompositionId:audioIdentity(content)}),artifact:null};
  }
  const sync=planExecutionChapterSync(generated.voice,chapter),compiled=compileVoiceComposition(visual!,font,generated.voice,sync);
  const syncMs=performance.now()-syncStart,artifact=await composeOwnedAudio(ownership,compiled,media,signal);
  if(!artifact)audioInvalid("CHAPTER_OWNERSHIP_LOST");
  const content={contract:CHAPTER_COMPOSITION_V1.id,chapterId:chapter.chapterId,contextId:chapter.contextId,planId:chapter.planId,
    narrationPlanId:generated.narrationPlan.narrationPlanId,narrationScriptId:generated.narrationPlan.narrationScriptId,
    voiceAudioId:generated.voice.voiceAudioIdentity,voice:generated.selectedVoice,visualBindings:[chapter.visualIdentity],
    visualSha256:chapter.visualSha256,plannedDuration:chapter.targetDuration,measuredNarrationDuration:generated.voice.narration.metadata.durationMs/1000,
    actualDuration:sync.durationMs/1000,complete:sync.durationMs/1000>=chapter.targetDuration,
    remainingPlannedSeconds:Math.max(0,chapter.targetDuration-sync.durationMs/1000),
    renderClass:"CACHED_SCENE_COMPOSE",cacheDecision:"EXACT_PINNED_VISUAL_REUSE",synchronization:sync,
    safetyAssertions:chapter.safetyAssertions,fallbackReasons:chapter.fallbackReasons,blenderInvocations:0,
    finalArtifactHash:artifact.evidence.outputSha256,milliseconds:{generationMs:generated.generationMs,syncMs,
      compositionMs:artifact.evidence.milliseconds.compositionMs,total:performance.now()-start},
    patientFacing:false};
  return {generated,evidence:deepAudioFreeze({...content,chapterCompositionId:audioIdentity(content),finalVideoId:audioIdentity({compiled:compiled.fingerprint,output:artifact.evidence.outputSha256})}),artifact};
}
