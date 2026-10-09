import "server-only";
import type { SubtitleCue,AnatomicalLabel,SupportedLabelBinding,MusicPolicyId,AudioPresentationMode } from "../contracts/audio-composition";
import type { CinematicTimeline } from "./cinematic-timeline-specification";
import { CINEMATIC_CAMERA_V1 } from "../render/cinematic-camera";
import { VISUAL_AUDIO_POLICY } from "../visual-foundation";
import { jsonSnapshot } from "../validation/json-snapshot";
import { WHOLE_BODY_ANATOMY } from "../whole-body-anatomy";
import { NO_DEAD_VISUAL_TIME_V1,heroPresentationRatio,validateVisualActivity } from "../render/no-dead-visual-time";
import { audioInvalid,audioIdentity,deepAudioFreeze,exactAudio,isApprovedNarrationScript,isApprovedNarrationAsset,
  type ApprovedNarrationScript,type ApprovedNarrationAsset } from "./narration-foundation";
import { isApprovedAudioVisual,isApprovedSubtitleFont,type ApprovedAudioVisual,type ApprovedSubtitleFont } from "./audio-media-authority";
import { isApprovedMedicalVoice,type ApprovedMedicalVoice } from "./voice-runtime";
import { isApprovedMedicalAvSync,type ApprovedMedicalAvSync } from "./medical-av-sync";
import { auditHeroEntrance,HERO_ENTRANCE_V1 } from "../render/hero-entrance";

export const MEDICAL_AUDIO_COMPOSITION_V1=deepAudioFreeze({id:"MEDICAL_AUDIO_COMPOSITION_V1",version:"1",narration:"primary",
  mixPreset:"MEDICAL_SPEECH_V1",targetLufs:-18,truePeakDb:-2,limiterPeakDb:-2,outputSampleRate:48000,outputChannels:2,
  codec:"aac",bitrate:128000,fadeInMs:150,fadeOutMs:250,musicGainCeilingDb:-24,
  ducking:VISUAL_AUDIO_POLICY.ducking,usage:"internal-review",patientFacing:false});
export const MEDICAL_SUBTITLE_V1=deepAudioFreeze({id:"MEDICAL_SUBTITLE_V1",version:"1",fontPreset:"LOCAL_ARIAL_V1",fontSize:42,
  maxLines:2,maxCharactersPerLine:48,maxCharactersPerSecond:24,overlap:"prohibited",effects:"none",
  // Convert Blender's bottom-origin safe rectangle to pixel top-origin layout.
  safeRectangle:[CINEMATIC_CAMERA_V1.safeSubtitleRectangle[0],1-CINEMATIC_CAMERA_V1.safeSubtitleRectangle[3],
    CINEMATIC_CAMERA_V1.safeSubtitleRectangle[2],1-CINEMATIC_CAMERA_V1.safeSubtitleRectangle[1]],
  backing:"subtle-charcoal",direction:{ar:"rtl",en:"ltr"},unicode:"preserve-UTF8-no-transliteration"});
export function resolveMusicPolicy(mode:AudioPresentationMode,id:MusicPolicyId,enabled=false){
  if(!["CLINICAL_REVIEW","PATIENT_EDUCATION"].includes(mode)||!["MUSIC_OFF","PATIENT_EDUCATION_OPTIONAL","CREATOR_ALLOWED_FUTURE"].includes(id)||
    typeof enabled!=="boolean" || mode==="CLINICAL_REVIEW"&&id!=="MUSIC_OFF"||enabled&&(id!=="PATIENT_EDUCATION_OPTIONAL"||mode!=="PATIENT_EDUCATION"))audioInvalid();
  return deepAudioFreeze({id,enabled,duckingRequired:true,ducking:MEDICAL_AUDIO_COMPOSITION_V1.ducking,
    gainCeilingDb:MEDICAL_AUDIO_COMPOSITION_V1.musicGainCeilingDb,noLoudIntro:true,pathologySynchronization:false});
}
/** Preserve native 24fps; insert complete approved one-second cycles before
 * REORIENT, then shift that transition. Never stretch or freeze heartbeat. */
export function planNarrationTimeline(t:CinematicTimeline,durationMs:number,requiredExplanationEndMs=durationMs){
  if(!Number.isSafeInteger(durationMs)||durationMs<1000||durationMs>60000||!Number.isSafeInteger(requiredExplanationEndMs)||
    requiredExplanationEndMs<0||requiredExplanationEndMs>durationMs||t.frameCount!==276||t.scenes.length!==6||
    t.scenes[4].motionPreset!=="NORMAL_HEARTBEAT_V1"||t.scenes[4].cameraGuidance.movement!=="hold"||t.outputProfile.fps!==24)audioInvalid();
  const loopCount=Math.max(0,Math.ceil((durationMs-11500)/1000),Math.ceil((requiredExplanationEndMs-10000)/1000));
  const frameCount=276+loopCount*24;if(frameCount>1440)audioInvalid();
  return deepAudioFreeze({id:"NARRATION_SAFE_V1",loopCount,frameCount,durationMs:frameCount/24*1000,fps:24,
    strategy:loopCount?"LOOP_APPROVED_MOTION_AND_TRANSITION_SHIFT":"PRESERVE_VISUAL",cycleFrames:24,speedRatio:1,
    cycleSourceStartFrame:168,insertionFrame:240,scenes:t.scenes.map((s,i)=>({sceneIndex:i,
      startMs:(s.startFrame+(i===5?loopCount*24:0))/24*1000,
      endMs:(s.endFrameExclusive+(i>=4?loopCount*24:0))/24*1000}))});
}
const cleanText=(v:unknown):v is string=>typeof v==="string"&&v.length>0&&v.length<=200&&!/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(v);
export function subtitleLines(text:string){
  if(!cleanText(text))audioInvalid();const lines:string[]=[];let line="";
  for(const word of text.split(" ")){if([...word].length>48)audioInvalid();if([...line+(line?" ":"")+word].length>48){lines.push(line);line=word;}else line+=(line?" ":"")+word;}
  if(line)lines.push(line);if(lines.length>2)audioInvalid();return lines;
}
export function validateSubtitleCues(value:unknown,script:ApprovedNarrationScript,plan:ReturnType<typeof planNarrationTimeline>):readonly SubtitleCue[]{
  const cues=jsonSnapshot(value) as unknown as SubtitleCue[];
  if(!Array.isArray(cues)||cues.length!==script.segments.length)audioInvalid();let previous=0;
  const ids=new Set<string>();
  cues.forEach((c,i)=>{if(!exactAudio(c,["cueId","text","language","startMs","endMs","sceneIndices","narrationSegmentId","placement","style","scriptHash"])||
    !/^[a-zA-Z0-9_-]{1,60}$/.test(c.cueId)||ids.has(c.cueId)||c.language!==script.language||c.text!==script.segments[i].text||
    c.narrationSegmentId!==script.segments[i].segmentId||c.scriptHash!==script.scriptHash||c.placement!=="lower-safe"||c.style!=="MEDICAL_SUBTITLE_V1"||
    !Number.isSafeInteger(c.startMs)||!Number.isSafeInteger(c.endMs)||c.startMs<previous||c.endMs<=c.startMs||c.endMs>plan.durationMs||
    [...c.text].length/(c.endMs-c.startMs)*1000>MEDICAL_SUBTITLE_V1.maxCharactersPerSecond||
    !Array.isArray(c.sceneIndices)||!c.sceneIndices.length||c.sceneIndices.length>6||c.sceneIndices.some((s,j)=>!Number.isSafeInteger(s)||s<0||s>5||j>0&&s!==c.sceneIndices[j-1]+1)||
    c.startMs<plan.scenes[c.sceneIndices[0]].startMs||c.endMs>plan.scenes[c.sceneIndices.at(-1)!].endMs)audioInvalid();
    subtitleLines(c.text);ids.add(c.cueId);previous=c.endMs;});
  return deepAudioFreeze(cues);
}
/** Pure label planning validator, not an execution authority issuer. Runtime
 * uses only the approved visual's supported bindings (empty for R2.4). */
export function validateAnatomicalLabels(value:unknown,bindings:readonly SupportedLabelBinding[],durationMs:number):readonly AnatomicalLabel[]{
  const labels=jsonSnapshot(value) as unknown as AnatomicalLabel[];
  if(!Array.isArray(labels)||labels.length>4)audioInvalid();
  labels.forEach((l,i)=>{const b=bindings.find(b=>b.canonicalStructureId===l.canonicalStructureId&&b.anchorRef===l.anchorRef&&b.sourceScene===l.sourceScene);
    if(!exactAudio(l,["canonicalStructureId","displayName","language","anchorRef","startMs","endMs","sourceScene","style","semantics"])||
      !WHOLE_BODY_ANATOMY.structures.some(s=>s.id===l.canonicalStructureId)||!b||!b.evidenceRef||b.placement!=="outside-focal-region"||l.displayName!==b.displayName||l.language!==b.language||!cleanText(l.displayName)||
      l.style!=="MEDICAL_LABEL_V1"||l.semantics!=="educational-name-only"||!Number.isSafeInteger(l.startMs)||!Number.isSafeInteger(l.endMs)||
      l.startMs<0||l.endMs<=l.startMs||l.endMs>durationMs||i>0&&l.startMs<labels[i-1].endMs)audioInvalid("ANATOMICAL_LABEL_UNSUPPORTED");});return deepAudioFreeze(labels);
}
const issued=new WeakSet<object>();
export function compileAudioComposition(visual:ApprovedAudioVisual,font:ApprovedSubtitleFont,value:unknown){
  if(!isApprovedAudioVisual(visual)||!isApprovedSubtitleFont(font)||!exactAudio(value,["version","script","narration","subtitles","labels","musicPolicy","presentationMode","mixPreset","subtitlePreset","durationStrategy","patientFacing"]))audioInvalid("AUDIO_AUTHORITY_INVALID");
  const {script,narration}=value;
  if(value.version!=="1"||value.patientFacing!==false||value.mixPreset!=="MEDICAL_SPEECH_V1"||value.subtitlePreset!=="MEDICAL_SUBTITLE_V1"||
    value.durationStrategy!=="NARRATION_SAFE_V1"||!isApprovedNarrationScript(script)||!isApprovedNarrationAsset(narration)||
    narration.metadata.scriptHash!==script.scriptHash)audioInvalid();
  // Timing comes from the approved segment/cue association, not an estimated
  // fraction of narration duration. Required explanation must finish before exit.
  const candidateCues=jsonSnapshot(value.subtitles) as unknown as SubtitleCue[];
  if(!Array.isArray(candidateCues))audioInvalid();
  const explanationEnds=candidateCues.filter(c=>script.segments.some(s=>s.segmentId===c.narrationSegmentId&&s.kind==="explanation")).map(c=>c.endMs);
  const contentStartMs=NO_DEAD_VISUAL_TIME_V1.openingContentStartMs;
  const plan=planNarrationTimeline(visual.compiled.timeline,narration.metadata.durationMs+contentStartMs,Math.max(0,...explanationEnds));
  const subtitles=validateSubtitleCues(value.subtitles,script,plan),labels=validateAnatomicalLabels(value.labels,visual.supportedLabels,plan.durationMs);
  const music=resolveMusicPolicy(value.presentationMode as AudioPresentationMode,value.musicPolicy as MusicPolicyId);
  const explanation=subtitles.filter(c=>script.segments.find(s=>s.segmentId===c.narrationSegmentId)?.kind==="explanation");
  if(explanation.some(c=>c.endMs>plan.scenes[4].endMs)||subtitles.some(c=>c.startMs<contentStartMs||c.endMs>narration.metadata.durationMs+contentStartMs)||
    subtitles[0].startMs!==contentStartMs)audioInvalid();
  // Validate the screen-space crop against every recorded HERO projection.
  // Static source frames reuse scene 0's bounds; the existing approach is per-frame.
  for(let frame=0;frame<132;frame++){
    const p=visual.heroProjection.find(p=>frame<96?p.sceneIndex===0&&p.frame===0:p.sceneIndex===2&&p.frame===frame-96);
    if(!p)audioInvalid("HERO_PRESENTATION_BOUNDS_UNAVAILABLE");
    const projected=p.projectedBounds.map(v=>.5+(v-.5)*heroPresentationRatio(frame)),safe=CINEMATIC_CAMERA_V1.safeOrganRectangle;
    if(projected[0]<safe[0]||projected[1]<safe[1]||projected[2]>safe[2]||projected[3]>safe[3])audioInvalid("HERO_PRESENTATION_CLIPPING");
  }
  visual.compiled.timeline.scenes.forEach((scene,i)=>validateVisualActivity({durationMs:scene.duration*1000,
    nativeMotion:scene.motionPreset==="NORMAL_HEARTBEAT_V1",cameraMotion:i<2?
      {startRatio:heroPresentationRatio(scene.startFrame),endRatio:heroPresentationRatio(scene.endFrameExclusive),durationMs:scene.duration*1000}:
      scene.cameraGuidance.movement!=="hold"?{startRatio:1,endRatio:scene.cameraGuidance.zoomRatio,durationMs:scene.cameraGuidance.duration*1000}:null,
    visualFocus:false,meaningfulTransition:false,hold:null}));
  const specification={contract:MEDICAL_AUDIO_COMPOSITION_V1.id,version:"1",visualIdentity:visual.visualIdentity,visualSha256:visual.sha256,
    scriptId:script.scriptId,scriptVersion:script.version,scriptHash:script.scriptHash,medicalContentVersion:script.medicalContentVersion,
    language:script.language,narration:narration.metadata,narrationIdentity:narration.identity,subtitles,labels,music,
    presentationMode:value.presentationMode,plan,mix:MEDICAL_AUDIO_COMPOSITION_V1,subtitlePolicy:MEDICAL_SUBTITLE_V1,font,
    visualActivityPolicy:NO_DEAD_VISUAL_TIME_V1,narrationStartMs:contentStartMs,
    voiceSync:null,voiceBenchmark:null,safety:script.safety,usage:"internal-review",patientFacing:false};
  const result=deepAudioFreeze({specification,fingerprint:audioIdentity(specification),visual,font,script,narration});issued.add(result);return result;
}
/** Additive voice compilation, sharing the R2.5A media, subtitle, music, identity
 * and owned compositor boundaries. Raw/copied voice or timing JSON is rejected. */
export function compileVoiceComposition(visual:ApprovedAudioVisual,font:ApprovedSubtitleFont,voice:ApprovedMedicalVoice,sync:ApprovedMedicalAvSync){
  if(!isApprovedAudioVisual(visual)||!isApprovedSubtitleFont(font)||!isApprovedMedicalVoice(voice)||!isApprovedMedicalAvSync(sync)||
    sync.voiceAudioIdentity!==voice.voiceAudioIdentity||sync.scriptHash!==voice.script.scriptHash||
    visual.compiled.timeline.frameCount!==276||visual.compiled.timeline.scenes[4].motionPreset!=="NORMAL_HEARTBEAT_V1"||
    visual.compiled.timeline.scenes[4].cameraGuidance.movement!=="hold"||visual.compiled.timeline.scenes[4].startFrame!==168||
    visual.compiled.timeline.scenes[4].endFrameExclusive!==240)audioInvalid("AUDIO_AUTHORITY_INVALID");
  const projection=visual.heroProjection.find(p=>p.sceneIndex===0&&p.frame===0);
  if(!projection)audioInvalid("HERO_PRESENTATION_BOUNDS_UNAVAILABLE");
  const entrance=auditHeroEntrance(projection.projectedBounds,sync.heroFrames);
  const safe=CINEMATIC_CAMERA_V1.safeOrganRectangle,p=projection.projectedBounds.map(v=>.5+(v-.5)*sync.policy.maximumHeroPush);
  if(p[0]<safe[0]||p[1]<safe[1]||p[2]>safe[2]||p[3]>safe[3])audioInvalid("HERO_PRESENTATION_CLIPPING");
  const plan={id:"NARRATION_SAFE_V1",loopCount:sync.nativeCycles,frameCount:sync.frameCount,durationMs:sync.durationMs,fps:24,
    strategy:"LOOP_APPROVED_MOTION_AND_TRANSITION_SHIFT" as const,cycleFrames:24,speedRatio:1,cycleSourceStartFrame:168,insertionFrame:240,scenes:sync.scenes};
  const script=voice.script,narration=voice.narration;
  const subtitles=validateSubtitleCues(sync.evidence.map(e=>({cueId:e.subtitleCueReference,text:script.segments.find(s=>s.segmentId===e.segmentId)!.text,
    language:script.language,startMs:e.startMs,endMs:e.endMs,sceneIndices:e.sceneIndices,narrationSegmentId:e.segmentId,
    placement:"lower-safe",style:"MEDICAL_SUBTITLE_V1",scriptHash:script.scriptHash})),script,plan);
  const specification={contract:MEDICAL_AUDIO_COMPOSITION_V1.id,version:"1",visualIdentity:visual.visualIdentity,visualSha256:visual.sha256,
    scriptId:script.scriptId,scriptVersion:script.version,scriptHash:script.scriptHash,medicalContentVersion:script.medicalContentVersion,
    language:script.language,narration:narration.metadata,narrationIdentity:narration.identity,subtitles,labels:validateAnatomicalLabels([],visual.supportedLabels,plan.durationMs),
    music:resolveMusicPolicy("CLINICAL_REVIEW","MUSIC_OFF"),presentationMode:"CLINICAL_REVIEW",plan,mix:MEDICAL_AUDIO_COMPOSITION_V1,
    subtitlePolicy:MEDICAL_SUBTITLE_V1,font,visualActivityPolicy:NO_DEAD_VISUAL_TIME_V1,narrationStartMs:400,
    voiceSync:sync,heroEntrance:{preset:HERO_ENTRANCE_V1,audit:entrance},voiceBenchmark:{providerType:voice.benchmark.providerType,providerReference:voice.benchmark.providerReference,
      modelRevision:voice.benchmark.modelRevision,voiceRevision:voice.benchmark.voiceRevision,qualityApproval:voice.benchmark.qualityApproval},
    safety:script.safety,usage:"internal-review",patientFacing:false};
  const result=deepAudioFreeze({specification,fingerprint:audioIdentity(specification),visual,font,script,narration});issued.add(result);return result;
}
export type CompiledAudioComposition=ReturnType<typeof compileAudioComposition>|ReturnType<typeof compileVoiceComposition>;
export const isCompiledAudioComposition=(v:unknown):v is CompiledAudioComposition=>!!v&&typeof v==="object"&&issued.has(v);
