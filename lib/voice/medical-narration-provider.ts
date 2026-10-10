import "server-only";
import { mkdtemp, writeFile, readFile, unlink, rmdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { synthesizeVoice } from "./voice-synthesis.service";
import { transcribeVoice } from "./voice-transcription.service";
import type { MedicalNarrationProvider,VoiceRequest } from "../medical-motion/contracts/voice-runtime";
import { audioHash, audioInvalid } from "../medical-motion/composition/narration-foundation";
import { medicalSpokenTextMatches } from "../medical-motion/composition/spoken-token-verification";
import { executeMediaProcess, type FfmpegRuntime } from "../medical-motion/composition/ffmpeg-runtime";

/** Existing provider service adapter; credentials stay in that service. It does
 * not pretend to implement slow-rate or pronunciation controls it cannot honor. */
export function existingSpeechNarrationProvider(media:FfmpegRuntime,selectedVoice?:"marin"|"cedar"):MedicalNarrationProvider {
  return Object.freeze({type:"EXTERNAL_TTS",supportedRates:["CLINICAL_STANDARD"] as const,
    async render(request:VoiceRequest,signal:AbortSignal){
      if(request.speechRatePreset!=="CLINICAL_STANDARD"||request.pronunciationHints.length)audioInvalid("VOICE_CONTROLS_UNSUPPORTED");
      const start=performance.now(),segments=[];let model="",voice="";
      for(const segment of request.segments){
        if(signal.aborted)audioInvalid("VOICE_CANCELLED");
        const spokenText=segment.spokenText??segment.text;
        const result=await synthesizeVoice({text:spokenText,language:request.language,signal,voice:selectedVoice});
        if(model&&(model!==result.model||voice!==result.voice))audioInvalid("VOICE_PROVIDER_DRIFT");
        model=result.model;voice=result.voice;
        const pcm=await decodeNarrationSegment(Buffer.from(result.audio),media,signal);
        const verified=await transcribeVoice({audio:new File([result.audio],"speech.mp3",{type:"audio/mpeg"}),language:request.language,signal});
        if(!medicalSpokenTextMatches(spokenText,verified.transcript))audioInvalid("VOICE_SPOKEN_CONTENT_MISMATCH");
        segments.push({segmentId:segment.segmentId,textHash:audioHash(segment.text),pcm,
          spokenTextVerification:{transcript:verified.transcript,method:"independent-transcription" as const}});
      }
      return {requestIdentity:request.requestIdentity,segments,providerReference:"existing-speech-service",modelRevision:model,
        voiceRevision:voice,latencyMs:performance.now()-start,cost:null,retryCount:0};
    }});
}
/** Decoder owns one bounded temporary invocation, never a request-selected path.
 * No audio time stretching, trimming or gain modification is performed. */
export async function decodeNarrationSegment(bytes:Buffer,media:FfmpegRuntime,signal:AbortSignal){
  if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>4*1024*1024)audioInvalid("VOICE_AUDIO_INVALID");
  const directory=await mkdtemp(path.join(tmpdir(),"organheal-voice-decode-"));
  const input=path.join(directory,"speech.mp3"),output=path.join(directory,"speech.pcm");
  try{
    await writeFile(input,bytes,{flag:"wx"});
    await executeMediaProcess(media,"ffmpeg",["-v","error","-nostdin","-i","speech.mp3","-map","0:a:0","-vn",
      "-ac","1","-ar","48000","-c:a","pcm_s16le","-f","s16le","-fs","1920002","speech.pcm"],directory,signal);
    const size=(await stat(output)).size;if(size<96000||size>1920000||size%2)audioInvalid("VOICE_DURATION_INVALID");
    return await readFile(output);
  }finally{
    // Remove only the two fixed files in our newly created directory.
    await unlink(input).catch(()=>{});await unlink(output).catch(()=>{});await rmdir(directory);
  }
}
