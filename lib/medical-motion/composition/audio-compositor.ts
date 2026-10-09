import "server-only";
import path from "node:path";
import { readFile,writeFile,stat } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { ExecutionOwnership } from "../../jobs/execution-ownership";
import { createArtifactOwnership,discardArtifact,registerComposedAudio,validateArtifact,type ArtifactOwnership } from "../render/artifact-output";
import { recordCandidateOwnership } from "../render/execution-resources";
import { executeMediaProcess,inspectMedia,type FfmpegRuntime } from "./ffmpeg-runtime";
import { approvedVisualBytes,approvedFontBytes } from "./audio-media-authority";
import { audioHash,audioInvalid,narrationFixtureBytes } from "./narration-foundation";
import { isCompiledAudioComposition,type CompiledAudioComposition } from "./audio-specification";
import { rasterizeMedicalSubtitle } from "./audio-overlays";
import { heroPresentationFilter } from "../render/no-dead-visual-time";
import { heroEntranceFilter } from "../render/hero-entrance";

/** Additive post-composition adapter. Authority comes from the existing owned
 * execution and opaque approved media/specification, never request paths/text. */
export async function composeOwnedAudio(ownership:ExecutionOwnership,compiled:CompiledAudioComposition,media:FfmpegRuntime,signal:AbortSignal){
  if(!(ownership instanceof ExecutionOwnership)||!isCompiledAudioComposition(compiled))audioInvalid("AUDIO_AUTHORITY_INVALID");
  let owner:ArtifactOwnership|undefined,operationError:unknown;
  const abort=()=>ownership.cancel();signal.addEventListener("abort",abort,{once:true});if(signal.aborted)abort();
  try{
    const result=await ownership.run(async ownedSignal=>{
      try{
        const totalStart=performance.now(),s=compiled.specification;
        const outputBase=s.voiceSync?`heart-cinematic-voice-${s.language}-v1-polish`:"heart-cinematic-audio-foundation-v1";
        owner=await createArtifactOwnership(`${outputBase}.mp4`,"video");
        const cwd=owner.directory;
        const visualStart=performance.now(),visual=approvedVisualBytes(compiled.visual);
        if(audioHash(visual)!==s.visualSha256)audioInvalid();
        await writeFile(path.join(cwd,"visual.mp4"),visual,{flag:"wx"});
        const visualReuseMs=performance.now()-visualStart;
        const audioStart=performance.now(),audio=narrationFixtureBytes(compiled.narration);
        if(audioHash(audio)!==s.narration.sha256)audioInvalid();
        await writeFile(path.join(cwd,"narration.wav"),audio,{flag:"wx"});
        const audioPreparationMs=performance.now()-audioStart;
        const subtitleStart=performance.now(),font=approvedFontBytes(compiled.font);
        if(audioHash(font)!==compiled.font.sha256)audioInvalid();
        const fontPath=path.join(cwd,"font.ttf");await writeFile(fontPath,font,{flag:"wx"});
        const overlays=[];
        for(const [i,cue] of s.subtitles.entries()){
          const overlay=await rasterizeMedicalSubtitle(cue,fontPath),name=`cue-${i}.png`;
          await writeFile(path.join(cwd,name),overlay.bytes,{flag:"wx"});
          overlays.push({name,...overlay,bytes:undefined,text:cue.text,startMs:cue.startMs,endMs:cue.endMs});
        }
        const subtitlePreparationMs=performance.now()-subtitleStart;
        const filters:string[]=[],loops=s.plan.loopCount;
        if(s.voiceSync){
          const v=s.voiceSync,heroSeconds=v.heroFrames/24,nativeSeconds=v.nativeFrames/24;
          // Still-frame reuse with measured-duration bounded push. Fade to black
          // before concatenating a different source: no crossfade/morph/retarget.
          filters.push("[0:v]split=2[external][internal]",
            `[external]trim=end_frame=1,setpts=PTS-STARTPTS,loop=loop=-1:size=1:start=0,trim=end_frame=${v.heroFrames},setpts=PTS-STARTPTS,${heroEntranceFilter(v.heroFrames)},fade=t=out:st=${heroSeconds-.2}:d=0.2[hero]`,
            `[internal]trim=start_frame=168:end_frame=192,setpts=PTS-STARTPTS,loop=loop=${v.nativeCycles-1}:size=24:start=0,trim=end_frame=${v.nativeFrames},setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.2[native]`,
            "[hero][native]concat=n=2:v=1:a=0[presented]");
          if(nativeSeconds<2)audioInvalid();
        }else if(loops){
          filters.push("[0:v]split=3[h][c][t]","[h]trim=end_frame=240,setpts=PTS-STARTPTS[head]",
            `[c]trim=start_frame=168:end_frame=192,setpts=PTS-STARTPTS,loop=loop=${loops-1}:size=24:start=0,trim=end_frame=${loops*24},setpts=PTS-STARTPTS[extra]`,
            "[t]trim=start_frame=240:end_frame=276,setpts=PTS-STARTPTS[tail]","[head][extra][tail]concat=n=3:v=1:a=0[v0]");
        }else filters.push("[0:v]setpts=PTS-STARTPTS[v0]");
        if(!s.voiceSync)filters.push("[v0]split=2[external][internal]",`[external]trim=end_frame=132,setpts=PTS-STARTPTS,${heroPresentationFilter()}[hero]`,
          "[internal]trim=start_frame=132,setpts=PTS-STARTPTS[native]","[hero][native]concat=n=2:v=1:a=0[presented]");
        overlays.forEach((o,i)=>filters.push(`[${i===0?"presented":`v${i}`}][${i+2}:v]overlay=${o.left}:${o.top}:enable='gte(t,${o.startMs/1000})*lt(t,${o.endMs/1000})'[v${i+1}]`));
        const duration=s.plan.durationMs/1000,audioDuration=s.narration.durationMs/1000;
        filters.push(`[1:a]aresample=48000,loudnorm=I=-18:TP=-2:LRA=7,afade=t=in:st=0:d=0.15,afade=t=out:st=${Math.max(0,audioDuration-.25)}:d=0.25,adelay=${s.narrationStartMs}:all=1,apad,atrim=duration=${duration},alimiter=limit=0.794328:level=false,aformat=sample_rates=48000:channel_layouts=stereo[audio]`);
        const args=["-v","error","-nostdin","-y","-i","visual.mp4","-i","narration.wav"];
        overlays.forEach(o=>args.push("-loop","1","-framerate","24","-i",o.name));
        args.push("-filter_complex_threads","1","-filter_complex",filters.join(";"),"-map",`[v${overlays.length}]`,"-map","[audio]",
          "-c:v","libx264","-preset","ultrafast","-crf","20","-pix_fmt","yuv420p","-threads","2","-r","24",
          "-frames:v",String(s.plan.frameCount),"-t",String(duration),"-c:a","aac","-b:a","128k","-ar","48000","-ac","2","-movflags","+faststart",path.basename(owner.outputPath));
        const compositionStart=performance.now();await executeMediaProcess(media,"ffmpeg",args,cwd,ownedSignal);
        const compositionMs=performance.now()-compositionStart;
        registerComposedAudio(owner);
        if(!(await validateArtifact(owner,{width:1080,height:1920})).ok)audioInvalid("AUDIO_OUTPUT_INVALID");
        const full=await inspectMedia(media,path.basename(owner.outputPath),cwd,ownedSignal);
        if(full.width!==1080||full.height!==1920||full.frameRate!==24||full.frameCount!==s.plan.frameCount||Math.abs(full.duration-duration)>0.00001||!full.audio)audioInvalid("AUDIO_OUTPUT_INVALID");
        const audioProbe=JSON.parse(await executeMediaProcess(media,"ffprobe",["-v","error","-select_streams","a","-show_entries","stream=codec_name,sample_rate,channels,duration","-of","json",path.basename(owner.outputPath)],cwd,ownedSignal));
        const stream=audioProbe.streams?.[0];
        if(audioProbe.streams?.length!==1||stream.codec_name!=="aac"||stream.sample_rate!=="48000"||stream.channels!==2||Math.abs(Number(stream.duration)-duration)>.05)audioInvalid("AUDIO_OUTPUT_INVALID");
        await executeMediaProcess(media,"ffmpeg",["-v","error","-i",path.basename(owner.outputPath),"-vn","-af","astats=metadata=1:reset=0,ametadata=print:key=lavfi.astats.Overall.Peak_level:file=audio-peaks.txt","-f","null","-"],cwd,ownedSignal);
        if((await stat(path.join(cwd,"audio-peaks.txt"))).size>4*1024*1024)audioInvalid();
        const peaks=[...(await readFile(path.join(cwd,"audio-peaks.txt"),"utf8")).matchAll(/Peak_level=(-?[\d.]+)/g)].map(m=>Number(m[1]));
        const samplePeakDb=Math.max(...peaks);if(!Number.isFinite(samplePeakDb)||samplePeakDb>-1)audioInvalid("AUDIO_PEAK_INVALID");
        const reviewName=`${outputBase}-review.mp4`,reviewStart=performance.now();
        await executeMediaProcess(media,"ffmpeg",["-v","error","-nostdin","-y","-i",path.basename(owner.outputPath),"-vf","scale=540:960","-c:v","libx264","-preset","fast","-crf","25","-threads","2","-c:a","copy","-movflags","+faststart",reviewName],cwd,ownedSignal);
        const reviewTranscodeMs=performance.now()-reviewStart,review=await inspectMedia(media,reviewName,cwd,ownedSignal);
        if(review.width!==540||review.height!==960||review.frameCount!==full.frameCount||review.frameRate!==24||Math.abs(review.duration-duration)>0.00001||!review.audio)audioInvalid("AUDIO_OUTPUT_INVALID");
        const evidence={specification:s,fingerprint:compiled.fingerprint,full,review,audio:stream,samplePeakDb,visualReused:true,blenderInvocations:0,
          outputSha256:audioHash(await readFile(owner.outputPath)),reviewSha256:audioHash(await readFile(path.join(cwd,reviewName))),
          bytes:(await stat(owner.outputPath)).size,reviewBytes:(await stat(path.join(cwd,reviewName))).size,
          milliseconds:{visualReuseMs,audioPreparationMs,subtitlePreparationMs,compositionMs,reviewTranscodeMs,totalPostCompositionMs:performance.now()-totalStart},
          usage:"internal-review",patientFacing:false,fixture:s.narration.providerType==="TEST_FIXTURE"?"non-human-test-tone-not-final-narration":null,
          voiceQualityApproval:s.voiceSync?"pending-owner-listening":null};
        const evidencePath=path.join(cwd,"composition-evidence.json"),subtitleEvidencePath=path.join(cwd,"subtitle-cues.json");
        await writeFile(evidencePath,JSON.stringify(evidence,null,2),{flag:"wx"});
        await writeFile(subtitleEvidencePath,JSON.stringify({font:compiled.font,policy:s.subtitlePolicy,cues:overlays},null,2),{flag:"wx"});
        const candidate={path:owner.outputPath,reviewPath:path.join(cwd,reviewName),evidencePath,subtitleEvidencePath,evidence};
        recordCandidateOwnership(candidate,owner,{width:1080,height:1920});
        return {status:"succeeded" as const,value:candidate};
      }catch(error){operationError=error;return {status:"failed" as const};}
    });
    if(result.execution!=="succeeded"||!await ownership.confirmHandoff())throw operationError??Error("AUDIO_OWNERSHIP_LOST");
    return result.value;
  }catch(error){if(owner&&!(error instanceof Error&&error.message==="COMPOSITION_CLEANUP_UNKNOWN"))await discardArtifact(owner);throw error;}
  finally{signal.removeEventListener("abort",abort);}
}
