import { expect,it,vi,afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtemp,writeFile,rm,readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const ready=vi.hoisted(()=>new WeakSet<object>());
vi.mock("../lib/medical-motion/cinematic-master-runtime",async original=>({...await original<typeof import("../lib/medical-motion/cinematic-master-runtime")>(),
  isReadyCinematicMaster:(v:unknown)=>!!v&&typeof v==="object"&&ready.has(v)}));
vi.mock("../lib/medical-motion/composition/ffmpeg-runtime",()=>({inspectMedia:vi.fn(async()=>({width:1080,height:1920,frameRate:24,frameCount:276,duration:11.5,audio:false})),executeMediaProcess:vi.fn()}));
import { CINEMATIC_MASTER_MODULES,CINEMATIC_MASTER_SOURCE_PROFILES,type ReadyCinematicMaster } from "../lib/medical-motion/cinematic-master-runtime";
import { sourceProfileSnapshot } from "../lib/medical-motion/source-profiles";
import { HEART_CINEMATIC_EXPLAINER_V1 } from "../lib/medical-motion/cinematic-guidance";
import { authorizeCinematicTimeline } from "../lib/medical-motion/composition/cinematic-timeline-specification";
import { compileCinematicExecution } from "../lib/medical-motion/cinematic-scene-compiler";
import { resolveEducationalNarration,generateNarrationFixture,approveNarrationFixture,audioHash,isApprovedNarrationScript } from "../lib/medical-motion/composition/narration-foundation";
import { approveAudioVisual,approveSubtitleFont } from "../lib/medical-motion/composition/audio-media-authority";
import { compileAudioComposition,isCompiledAudioComposition,planNarrationTimeline,validateSubtitleCues,subtitleLines,validateAnatomicalLabels,resolveMusicPolicy,MEDICAL_SUBTITLE_V1 } from "../lib/medical-motion/composition/audio-specification";
import { composeOwnedAudio } from "../lib/medical-motion/composition/audio-compositor";
import { ExecutionOwnership } from "../lib/jobs/execution-ownership";
import type { FfmpegRuntime } from "../lib/medical-motion/composition/ffmpeg-runtime";
import { executeMediaProcess } from "../lib/medical-motion/composition/ffmpeg-runtime";
import { validateVisualActivity,heroPresentationRatio,heroPresentationFilter,NO_DEAD_VISUAL_TIME_V1 } from "../lib/medical-motion/render/no-dead-visual-time";
import type { SubtitleCue,SupportedLabelBinding,AnatomicalLabel } from "../lib/medical-motion/contracts/audio-composition";
const directories:string[]=[];
afterEach(async()=>{await Promise.all(directories.splice(0).map(p=>rm(p,{recursive:true,force:true})));});
function cinematic(){const masters=HEART_CINEMATIC_EXPLAINER_V1.scenes.map(s=>{
  const m:ReadyCinematicMaster={module:CINEMATIC_MASTER_MODULES[s.masterId],profile:sourceProfileSnapshot(CINEMATIC_MASTER_SOURCE_PROFILES.resolve(s.sourceProfile)),
    runtimeOutputProfileId:"CINEMATIC_PORTRAIT_1080X1920_24_V1",usage:"internal-review",patientFacing:false,sourcePath:"unit-fixture"};ready.add(m);return m;
});return compileCinematicExecution(authorizeCinematicTimeline(HEART_CINEMATIC_EXPLAINER_V1,masters),masters);}
function script(language="ar"){return resolveEducationalNarration({scriptId:language==="ar"?"HEART_EDUCATIONAL_DEMO_AR":"HEART_EDUCATIONAL_DEMO_EN",version:"1"});}
function cues(s=script()):SubtitleCue[]{const starts=[400,2500,5500,9000],ends=[2500,5500,9000,11500],scenes=[[0],[1,2],[3,4],[4,5]];
  return s.segments.map((v,i)=>({cueId:`cue-${i}`,text:v.text,language:s.language,startMs:starts[i],endMs:ends[i],sceneIndices:scenes[i],narrationSegmentId:v.segmentId,placement:"lower-safe",style:"MEDICAL_SUBTITLE_V1",scriptHash:s.scriptHash}));}
async function input(){const compiled=cinematic(),directory=await mkdtemp(path.join(tmpdir(),"organheal-audio-unit-"));directories.push(directory);
  const bytes=Buffer.from("unit-mocked-media-probe"),file=path.join(directory,"heart-cinematic-explainer-v1.mp4"),evidence=path.join(directory,"execution-evidence.json");
  await writeFile(file,bytes);await writeFile(evidence,JSON.stringify({compiledFingerprint:compiled.fingerprint,executorSha256:compiled.executorLock.builderSha256,
    runtimeSpecification:{fingerprint:compiled.timeline.fingerprint},outputSha256:audioHash(bytes),bytes:bytes.length,usage:"internal-review",patientFacing:false,
    renderEvidence:[{masterId:"HEART_MASTER_VISUAL_V1",evidence:{sourceSha256:compiled.timeline.scenes[0].sourceSha256,
      frames:[{sceneIndex:0,frame:0,projectedBounds:[.1,.2,.9,.9]},...Array.from({length:36},(_,frame)=>({sceneIndex:2,frame,projectedBounds:[.1,.2,.9,.9]}))]}}]}));
  const runtime={ffmpeg:"unit",ffprobe:"unit",timeoutMs:1000} satisfies FfmpegRuntime;
  const visual=await approveAudioVisual(compiled,file,evidence,runtime,new AbortController().signal);
  const fontPath=path.join(directory,"arial.ttf");await writeFile(fontPath,Buffer.from([0,1,0,0,1]));const font=await approveSubtitleFont(fontPath);
  const s=script(),fixture=generateNarrationFixture(s,11100),narration=approveNarrationFixture(s,fixture.metadata,fixture.bytes);
  const value={version:"1",script:s,narration,subtitles:cues(s),labels:[],musicPolicy:"MUSIC_OFF",presentationMode:"CLINICAL_REVIEW",mixPreset:"MEDICAL_SPEECH_V1",subtitlePreset:"MEDICAL_SUBTITLE_V1",durationStrategy:"NARRATION_SAFE_V1",patientFacing:false};
  return {visual,font,value,runtime,file,evidence,compiled};}
it("separates reproducible script and voice identities without clinical claims",()=>{
  const s=script(),a=generateNarrationFixture(s,11500),b=generateNarrationFixture(s,11500,"fixture-tone-v2");
  expect(a.metadata.scriptHash).toBe(b.metadata.scriptHash);expect(a.metadata.sha256).not.toBe(b.metadata.sha256);
  expect(a).toEqual(generateNarrationFixture(script(),11500));expect(s.safety).toMatchObject({patientFacing:false,pathologyNarration:false,diagnosisCertainty:"not-implied",rhythmClaim:false});
  expect(isApprovedNarrationScript(JSON.parse(JSON.stringify(s)))).toBe(false);
});
it.each(["ar","en"])("preserves %s language/locale and rejects corrupt audio metadata",language=>{
  const s=script(language),f=generateNarrationFixture(s,11500);expect(approveNarrationFixture(s,f.metadata,f.bytes).metadata.language).toBe(language);
  for(const change of [{providerType:"EXTERNAL_TTS"},{voiceProfileId:"unknown"},{scriptHash:"a".repeat(64)},{durationMs:12000},{sha256:"a".repeat(64)},{language:language==="ar"?"en":"ar"}])
    expect(()=>approveNarrationFixture(s,{...f.metadata,...change},f.bytes)).toThrow();
});
it.each([{scriptId:"RISK_DIAGNOSIS",version:"1"},{scriptId:"HEART_EDUCATIONAL_DEMO_AR",version:"2"},{scriptId:"HEART_EDUCATIONAL_DEMO_AR",version:"1",disease:"AF"}])("raw planner/pathology/version input cannot authorize speech %#",value=>{
  expect(()=>resolveEducationalNarration(value)).toThrow("NARRATION_SCRIPT_UNAVAILABLE");
});
it("extends only complete native cycles and shifts reorientation without speed changes",()=>{
  const t=cinematic().timeline,a=planNarrationTimeline(t,16000,13000);
  expect(a).toEqual(planNarrationTimeline(t,16000,13000));expect(a).toMatchObject({loopCount:5,frameCount:396,speedRatio:1,cycleFrames:24,cycleSourceStartFrame:168,insertionFrame:240});
  expect(a.scenes[5]).toEqual({sceneIndex:5,startMs:15000,endMs:16500});expect(planNarrationTimeline(t,11500,9000).frameCount).toBe(276);
  expect(()=>planNarrationTimeline(t,60000)).toThrow();const invalidProfile=structuredClone(t);Object.assign(invalidProfile.outputProfile,{fps:25});expect(()=>planNarrationTimeline(invalidProfile,16000)).toThrow();
});
it("preserves Arabic logical order, punctuation and diacritics with lower safe RTL policy",()=>{
  const s=script(),v=validateSubtitleCues(cues(s),s,planNarrationTimeline(cinematic().timeline,11500,9000));
  expect(v.map(c=>c.text)).toEqual(s.segments.map(s=>s.text));expect(v[2].text).toContain("يوضّح");expect(v[3].text).toContain("تشخيصًا");
  expect(MEDICAL_SUBTITLE_V1.direction.ar).toBe("rtl");expect(MEDICAL_SUBTITLE_V1.safeRectangle).toEqual([.08,.86,.92,.96]);
  expect(subtitleLines(v[2].text).length).toBeLessThanOrEqual(2);
});
it.each([{startMs:-1},{endMs:0},{endMs:12000},{placement:"organ-center"},{sceneIndices:[5]},{style:"KARAOKE"},{text:"diagnosed heart disease"}])("rejects unsafe subtitle cue %#",change=>{
  const s=script(),v=cues(s);Object.assign(v[0],change);expect(()=>validateSubtitleCues(v,s,planNarrationTimeline(cinematic().timeline,11500,9000))).toThrow();
});
it("rejects overlap, excessive line count/density and bidi control injection",()=>{
  const s=script(),v=cues(s);v[1]={...v[1],startMs:2400};expect(()=>validateSubtitleCues(v,s,planNarrationTimeline(cinematic().timeline,11500,9000))).toThrow();
  expect(()=>subtitleLines("x".repeat(49))).toThrow();expect(()=>subtitleLines(Array(20).fill("longword").join(" "))).toThrow();expect(()=>subtitleLines("text\u202e")).toThrow();
  v[0]={...v[0],endMs:10};expect(()=>validateSubtitleCues(v,s,planNarrationTimeline(cinematic().timeline,11500,9000))).toThrow();
});
const binding:SupportedLabelBinding={canonicalStructureId:"heart.aorta",displayName:"Aorta",language:"en",anchorRef:"fixture:proven-aorta",sourceScene:0,evidenceRef:"fixture-evidence",placement:"outside-focal-region"};
const label:AnatomicalLabel={canonicalStructureId:"heart.aorta",displayName:"Aorta",language:"en",anchorRef:binding.anchorRef,sourceScene:0,startMs:0,endMs:1000,style:"MEDICAL_LABEL_V1",semantics:"educational-name-only"};
it("allows sparse canonical fixture labels and safe no-label behavior",()=>{expect(validateAnatomicalLabels([label],[binding],11500)).toEqual([label]);expect(validateAnatomicalLabels([],[],11500)).toEqual([]);});
it.each([{canonicalStructureId:"heart.invented"},{anchorRef:"guessed"},{semantics:"pathology"},{displayName:"Blocked aorta"}])("rejects unsupported label %#",change=>{
  expect(()=>validateAnatomicalLabels([{...label,...change}],[binding],11500)).toThrow("ANATOMICAL_LABEL_UNSUPPORTED");
});
it("does not admit invented canonical IDs even with a claimed anchor",()=>{expect(()=>validateAnatomicalLabels([{...label,canonicalStructureId:"heart.fake"}],[{...binding,canonicalStructureId:"heart.fake"}],11500)).toThrow();});
it("keeps clinical/patient defaults music-free and future ducking bounded",()=>{
  expect(resolveMusicPolicy("CLINICAL_REVIEW","MUSIC_OFF").enabled).toBe(false);expect(resolveMusicPolicy("PATIENT_EDUCATION","PATIENT_EDUCATION_OPTIONAL").enabled).toBe(false);
  expect(resolveMusicPolicy("PATIENT_EDUCATION","PATIENT_EDUCATION_OPTIONAL",true)).toMatchObject({enabled:true,duckingRequired:true,gainCeilingDb:-24,pathologySynchronization:false});
  expect(()=>resolveMusicPolicy("CLINICAL_REVIEW","PATIENT_EDUCATION_OPTIONAL",true)).toThrow();expect(()=>resolveMusicPolicy("PATIENT_EDUCATION","CREATOR_ALLOWED_FUTURE",true)).toThrow();
});
it("issues reproducible post-composition identity without changing visual identity",async()=>{
  const f=await input(),a=compileAudioComposition(f.visual,f.font,f.value),again=compileAudioComposition(f.visual,f.font,f.value);
  expect(a.fingerprint).toBe(again.fingerprint);expect(isCompiledAudioComposition(JSON.parse(JSON.stringify(a)))).toBe(false);
  const s=f.value.script,v=generateNarrationFixture(s,11100,"fixture-tone-v2"),changed=compileAudioComposition(f.visual,f.font,{...f.value,narration:approveNarrationFixture(s,v.metadata,v.bytes)});
  expect(changed.fingerprint).not.toBe(a.fingerprint);expect(changed.specification.visualIdentity).toBe(a.specification.visualIdentity);
  const timing=cues(s);timing[0]={...timing[0],endMs:2400};expect(compileAudioComposition(f.visual,f.font,{...f.value,subtitles:timing}).fingerprint).not.toBe(a.fingerprint);
});
it("rejects copied visual/font/script/audio capabilities and arbitrary executable knobs",async()=>{
  const f=await input();expect(()=>compileAudioComposition({...f.visual},f.font,f.value)).toThrow("AUDIO_AUTHORITY_INVALID");
  expect(()=>compileAudioComposition(f.visual,{...f.font},f.value)).toThrow("AUDIO_AUTHORITY_INVALID");
  for(const change of [{version:"2"},{patientFacing:true},{mixPreset:"client-filter"},{ffmpegArgs:["-filter_complex","injected"]},{script:{...f.value.script}},{narration:{...f.value.narration}},{labels:[label]}])
    expect(()=>compileAudioComposition(f.visual,f.font,{...f.value,...change})).toThrow();
});
it("revalidates media hash/evidence against compiler authority",async()=>{
  const f=await input();await writeFile(f.file,"changed");await expect(approveAudioVisual(f.compiled,f.file,f.evidence,f.runtime,new AbortController().signal)).rejects.toThrow("AUDIO_VISUAL_AUTHORITY_INVALID");
});
it("copied composition never reaches owned execution or Blender",async()=>{
  const f=await input(),c=compileAudioComposition(f.visual,f.font,f.value),ownership=new ExecutionOwnership({jobId:randomUUID(),attemptToken:randomUUID()},{renewLease:vi.fn(),publish:vi.fn()}),run=vi.spyOn(ownership,"run");
  await expect(composeOwnedAudio(ownership,{...c},f.runtime,new AbortController().signal)).rejects.toThrow("AUDIO_AUTHORITY_INVALID");expect(run).not.toHaveBeenCalled();
  const code=await readFile(path.join(process.cwd(),"lib/medical-motion/composition/audio-compositor.ts"),"utf8");expect(code).not.toMatch(/executeOwnedCinematic|blenderExecutable|render_scene|spawn\(/);
});
it("lost ownership prevents allocation/media execution even with a valid composition",async()=>{
  const f=await input(),c=compileAudioComposition(f.visual,f.font,f.value);
  const ownership=new ExecutionOwnership({jobId:randomUUID(),attemptToken:randomUUID()},{renewLease:async()=>({outcome:"ownership-lost",status:null,leaseExpiresAt:null}),publish:vi.fn()});
  vi.mocked(executeMediaProcess).mockClear();
  await expect(composeOwnedAudio(ownership,c,f.runtime,new AbortController().signal)).rejects.toThrow("AUDIO_OWNERSHIP_LOST");
  expect(executeMediaProcess).not.toHaveBeenCalled();expect(ownership.publicationAllowed).toBe(false);
});
const staticActivity={durationMs:4000,nativeMotion:false,cameraMotion:null,visualFocus:false,meaningfulTransition:false,hold:null};
it("NO_DEAD_VISUAL_TIME_V1 rejects prolonged unexplained static visuals",()=>{expect(()=>validateVisualActivity(staticActivity)).toThrow("DEAD_VISUAL_TIME");});
it.each(["narration-comprehension","subtitle-label-reading","clinical-comparison","intentional-pause"] as const)("allows evidenced intentional hold: %s",reason=>{
  expect(validateVisualActivity({...staticActivity,hold:{reason,evidenceRef:"approved-cue-or-review-purpose"}})).toBe(true);
});
it("allows native anatomical motion and bounded camera motion",()=>{
  expect(validateVisualActivity({...staticActivity,nativeMotion:true})).toBe(true);
  expect(validateVisualActivity({...staticActivity,cameraMotion:{startRatio:1,endRatio:1.035,durationMs:4000}})).toBe(true);
  expect(()=>validateVisualActivity({...staticActivity,cameraMotion:{startRatio:1,endRatio:2,durationMs:4000}})).toThrow();
  expect(()=>validateVisualActivity({...staticActivity,cameraMotion:{startRatio:1,endRatio:1.035,durationMs:1000}})).toThrow("DEAD_VISUAL_TIME");
});
it("calm HERO presentation hands off to existing approach and stops before native motion",()=>{
  expect(NO_DEAD_VISUAL_TIME_V1.openingContentStartMs).toBe(400);expect(heroPresentationRatio(0)).toBe(1);
  expect(heroPresentationRatio(48)).toBeCloseTo(1.0175);expect(heroPresentationRatio(96)).toBe(1.035);
  expect(heroPresentationRatio(120)).toBe(1);expect(heroPresentationRatio(132)).toBe(1);expect(heroPresentationRatio(275)).toBe(1);
  expect(heroPresentationFilter()).not.toMatch(/rotate|shake|morph/);
});
