import "server-only";
import path from "node:path";
import sharp from "sharp";
import { writeFile, readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { ExecutionOwnership } from "../../jobs/execution-ownership";
import { isExecutionChapter, type ExecutionChapter } from "../explanation-execution";
import { isApprovedMedicalVoice, type ApprovedMedicalVoice } from "../composition/voice-runtime";
import { audioHash, audioIdentity, audioInvalid, narrationFixtureBytes, resolveExecutionNarration } from "../composition/narration-foundation";
import { approvedFontBytes, isApprovedSubtitleFont, type ApprovedSubtitleFont } from "../composition/audio-media-authority";
import { rasterizeMedicalSubtitle } from "../composition/audio-overlays";
import { executeMediaProcess, inspectMedia, type FfmpegRuntime } from "../composition/ffmpeg-runtime";
import { createArtifactOwnership, discardArtifact, registerComposedAudio, validateArtifact, type ArtifactOwnership } from "../render/artifact-output";
import { validateVisualActivity } from "../render/no-dead-visual-time";
import { libraryAssetBytes, type VisualLibrary } from "./visual-library-loader";
import { isHeartLibrarySelection } from "./visual-library-resolver";

/** Reference-image backend for existing owned chapter composition. No new job,
 * clinical authority, narration provider or anatomy renderer. */
export async function composeLibraryChapter(chapter: ExecutionChapter, library: VisualLibrary, voice: ApprovedMedicalVoice,
  font: ApprovedSubtitleFont, ownership: ExecutionOwnership, media: FfmpegRuntime, signal: AbortSignal) {
  const selection = chapter.librarySelection;
  if (!isExecutionChapter(chapter) || chapter.executionBlocked || !selection || !isHeartLibrarySelection(selection) ||
    chapter.visualStrategy !== "LIBRARY_REFERENCE_COMPOSE" || !isApprovedMedicalVoice(voice) || !isApprovedSubtitleFont(font) ||
    voice.script.scriptHash !== resolveExecutionNarration(chapter).scriptHash || voice.profile.language !== chapter.language ||
    !(ownership instanceof ExecutionOwnership)) audioInvalid("CHAPTER_AUTHORITY_INVALID");
  const narrationStartMs = 400;
  const frames = Math.ceil((voice.narration.metadata.durationMs + narrationStartMs + 400) / 1000 * 24);
  if (frames > 1440 || voice.timings.length !== 5) audioInvalid("CHAPTER_CHUNK_DURATION_EXCEEDED");
  const duration = frames / 24;
  const t = voice.timings;
  const offsets = selection.concept === "LDL_EDUCATION" ? [0, (t[0].startMs+t[0].endMs)/2+400,
    t[1].startMs+400, t[2].startMs+400, (t[2].startMs+t[2].endMs)/2+400, t[3].startMs+400, t[4].startMs+400] :
    [0, t[1].startMs+400, t[3].startMs+400];
  const scenes = selection.scenes.map((s,i) => ({...s,startFrame:Math.round(offsets[i]/1000*24),
    endFrame:i===selection.scenes.length-1?frames:Math.round(offsets[i+1]/1000*24)}));
  if (scenes.some(s=>s.endFrame<=s.startFrame)) audioInvalid("LIBRARY_SYNC_INVALID");
  for (const s of scenes) validateVisualActivity({durationMs:(s.endFrame-s.startFrame)/24*1000,nativeMotion:false,
    cameraMotion:null,visualFocus:false,meaningfulTransition:false,
    hold:{reason:"narration-comprehension",evidenceRef:voice.script.scriptHash}});
  let owner: ArtifactOwnership | undefined, failure: unknown;
  const abort = () => ownership.cancel(); signal.addEventListener("abort",abort,{once:true}); if(signal.aborted) abort();
  try {
    const result = await ownership.run(async ownedSignal => {
      try {
        const started=performance.now(); owner=await createArtifactOwnership("heart-library-ldl-proof-v1.mp4","video");
        const cwd=owner.directory;
        await writeFile(path.join(cwd,"narration.wav"),narrationFixtureBytes(voice.narration),{flag:"wx"});
        const fontPath=path.join(cwd,"font.ttf"); await writeFile(fontPath,approvedFontBytes(font),{flag:"wx"});
        const filters:string[]=[],args=["-v","error","-nostdin","-y"],sourceMedia=[];
        for(const s of scenes){
          const bytes=await libraryAssetBytes(library,s.asset.id);
          const metadata=await sharp(bytes,{animated:false,limitInputPixels:40000000}).metadata();
          sourceMedia.push({assetId:s.asset.id,format:metadata.format,width:metadata.width,height:metadata.height,sourceSha256:s.asset.sha256,
            presentation:"complete-reference-fit-no-anatomy-crop",animation:"not-executed",upscaled:(metadata.width??1080)<1040});
          // Fit complete source art above subtitle area: never crop anatomy or source labels.
          const plate=await sharp(bytes,{animated:false,limitInputPixels:40000000}).resize(1040,1480,{fit:"inside"}).png().toBuffer({resolveWithObject:true});
          const canvas=await sharp({create:{width:1080,height:1920,channels:3,background:"#101923"}}).composite([
            {input:plate.data,left:Math.floor((1080-plate.info.width)/2),top:Math.floor((1520-plate.info.height)/2)}]).png().toBuffer();
          const name=`scene-${s.sceneIndex}.png`; await writeFile(path.join(cwd,name),canvas,{flag:"wx"});
          args.push("-loop","1","-framerate","24","-i",name);
          filters.push(`[${s.sceneIndex}:v]trim=end_frame=${s.endFrame-s.startFrame},setpts=PTS-STARTPTS,setsar=1[v${s.sceneIndex}]`);
        }
        const audioIndex=scenes.length;args.push("-i","narration.wav");
        filters.push(`${scenes.map(s=>`[v${s.sceneIndex}]`).join("")}concat=n=${scenes.length}:v=1:a=0[base]`);
        for(const [i,segment] of voice.script.segments.entries()){
          const cue={cueId:`library-${i}`,text:segment.text,language:chapter.language,startMs:t[i].startMs+400,endMs:t[i].endMs+400,
            sceneIndices:[0],narrationSegmentId:segment.segmentId,placement:"lower-safe" as const,style:"MEDICAL_SUBTITLE_V1" as const,scriptHash:voice.script.scriptHash};
          const overlay=await rasterizeMedicalSubtitle(cue,fontPath),name=`subtitle-${i}.png`;
          await writeFile(path.join(cwd,name),overlay.bytes,{flag:"wx"});args.push("-loop","1","-framerate","24","-i",name);
          filters.push(`[${i===0?"base":`sub${i-1}`}][${audioIndex+1+i}:v]overlay=${overlay.left}:${overlay.top}:enable='gte(t,${cue.startMs/1000})*lt(t,${cue.endMs/1000})'[sub${i}]`);
        }
        // Persistent educational notice is essential on the plaque reference scene.
        const noticeText=chapter.language==="ar"?"مثال تعليمي عام — لا يثبت وجود مرض لديك":"GENERAL EDUCATION — NOT A PATIENT FINDING";
        const notice=await sharp({text:{text:`<span foreground="#DCE6F0">${noticeText}</span>`,
          font:"Arial 28",fontfile:fontPath,width:1000,align:"centre",rgba:true}}).png().toBuffer({resolveWithObject:true});
        await writeFile(path.join(cwd,"notice.png"),notice.data,{flag:"wx"});args.push("-loop","1","-framerate","24","-i","notice.png");
        filters.push(`[sub4][${audioIndex+6}:v]overlay=${Math.floor((1080-notice.info.width)/2)}:1540[final]`);
        filters.push(`[${audioIndex}:a]aresample=48000,loudnorm=I=-18:TP=-2:LRA=7,adelay=400:all=1,apad,atrim=duration=${duration},alimiter=limit=0.794328:level=false,aformat=sample_rates=48000:channel_layouts=stereo[a]`);
        args.push("-filter_complex_threads","1","-filter_complex",filters.join(";"),"-map","[final]","-map","[a]",
          "-c:v","libx264","-preset","ultrafast","-crf","22","-threads","2","-pix_fmt","yuv420p","-r","24",
          "-frames:v",String(frames),"-t",String(duration),"-c:a","aac","-b:a","128k","-movflags","+faststart",path.basename(owner.outputPath));
        await executeMediaProcess(media,"ffmpeg",args,cwd,ownedSignal);registerComposedAudio(owner);
        if(!(await validateArtifact(owner,{width:1080,height:1920})).ok)audioInvalid("LIBRARY_OUTPUT_INVALID");
        const full=await inspectMedia(media,path.basename(owner.outputPath),cwd,ownedSignal);
        if(full.width!==1080||full.height!==1920||full.frameRate!==24||full.frameCount!==frames||!full.audio||Math.abs(full.duration-duration)>.05)audioInvalid("LIBRARY_OUTPUT_INVALID");
        const reviewName="heart-library-ldl-proof-v1-review.mp4";
        await executeMediaProcess(media,"ffmpeg",["-v","error","-nostdin","-i",path.basename(owner.outputPath),"-vf","scale=540:960",
          "-c:v","libx264","-preset","fast","-crf","25","-threads","2","-c:a","copy","-movflags","+faststart",reviewName],cwd,ownedSignal);
        const review=await inspectMedia(media,reviewName,cwd,ownedSignal);
        if(review.width!==540||review.height!==960||review.frameCount!==frames||!review.audio)audioInvalid("LIBRARY_OUTPUT_INVALID");
        const evidence={chapterId:chapter.chapterId,selection,scenes,sourceMedia,voice:voice.benchmark,voiceAudioIdentity:voice.voiceAudioIdentity,
          full,review,blenderInvocations:0,patientFacing:false,usage:"internal-review",cache:{assetCache:"PINNED_SOURCE_READ",composition:"MISS_NEW_OWNED_OUTPUT"},
          compositionMs:performance.now()-started,outputSha256:audioHash(await readFile(owner.outputPath))};
        await writeFile(path.join(cwd,"scene-resolution.json"),JSON.stringify(evidence,null,2),{flag:"wx"});
        return {status:"succeeded" as const,value:{owner,outputPath:owner.outputPath,reviewPath:path.join(cwd,reviewName),evidence,
          fingerprint:audioIdentity({chapterId:chapter.chapterId,selection:selection.identity,voice:voice.voiceAudioIdentity,font:font.sha256,version:"1"})}};
      }catch(e){failure=e;return {status:"failed" as const};}
    });
    if(result.execution!=="succeeded"||!await ownership.confirmHandoff()){if(owner)await discardArtifact(owner);throw failure??Error("CHAPTER_OWNERSHIP_LOST");}
    return result.value;
  }catch(e){if(owner)await discardArtifact(owner);throw e;}
  finally{signal.removeEventListener("abort",abort);}
}
