import {describe,it,expect,vi,afterEach} from "vitest";
import {randomUUID,createHash} from "node:crypto";
import {timelineFixture,rehashTimeline} from "./helpers/timeline-fixture";
import {authorizeTimelineMedia} from "../lib/medical-motion/composition/timeline-specification";
import {composePersonalizedTimelineMedia} from "../lib/medical-motion/composition/timeline-compositor";
import * as processes from "../lib/medical-motion/composition/ffmpeg-runtime";
import type {FfmpegRuntime} from "../lib/medical-motion/composition/ffmpeg-runtime";
import * as output from "../lib/medical-motion/render/artifact-output";
const runtime={} as FfmpegRuntime;
function fixture(){const f=timelineFixture(),bases=f.content.segments.map(s=>{const bytes=Buffer.from('TEST-NOT-MEDIA');return {bytes,record:{id:s.baseArtifactId,jobId:s.baseJobId,userId:f.content.userId,originAttempt:randomUUID(),media:'video' as const,persisted:true,sha256:createHash('sha256').update(bytes).digest('hex'),byteSize:bytes.length}};});
 const content=rehashTimeline({...f.content,segments:f.content.segments.map((s,i)=>({...s,baseSha256:bases[i].record.sha256}))});
 return {bases,cap:authorizeTimelineMedia(content,f.scenes),identity:{jobId:randomUUID(),userId:content.userId,attemptToken:randomUUID()}};}
afterEach(()=>vi.restoreAllMocks());
describe('V2 compositor trust, actual media and cancellation boundary',()=>{
 it('serialized capability rejected before local resource allocation',async()=>{const f=fixture(),allocation=vi.spyOn(output,'createArtifactOwnership');await expect(composePersonalizedTimelineMedia(runtime,structuredClone(f.cap),f.bases,f.identity,new AbortController().signal)).rejects.toThrow('COMPOSITION_INVALID');expect(allocation).not.toHaveBeenCalled();});
 it.each(['sha','still','unpersisted','id'])('rejects %s base before media execution',async failure=>{const f=fixture(),probe=vi.spyOn(processes,'inspectMedia');if(failure==='sha')f.bases[0].bytes=Buffer.from('CORRUPT');if(failure==='still')f.bases[0].record.media='still' as never;if(failure==='unpersisted')f.bases[0].record.persisted=false;if(failure==='id')f.bases[0].record.id=randomUUID();await expect(composePersonalizedTimelineMedia(runtime,f.cap,f.bases,f.identity,new AbortController().signal)).rejects.toThrow('COMPOSITION_INVALID');expect(probe).not.toHaveBeenCalled();});
 it('actual inspected duration mismatch fails before FFmpeg',async()=>{const f=fixture(),execute=vi.spyOn(processes,'executeMediaProcess'),probe=vi.spyOn(processes,'inspectMedia').mockResolvedValue({width:128,height:128,duration:4,audio:false,frameRate:25,frameCount:100});await expect(composePersonalizedTimelineMedia(runtime,f.cap,f.bases,f.identity,new AbortController().signal)).rejects.toThrow('COMPOSITION_INVALID');expect(probe).toHaveBeenCalledTimes(1);expect(execute).not.toHaveBeenCalled();});
 it('abort during inspection stops subsequent segment and FFmpeg',async()=>{const f=fixture(),controller=new AbortController(),execute=vi.spyOn(processes,'executeMediaProcess');vi.spyOn(processes,'inspectMedia').mockImplementation(async()=>{controller.abort();return {width:128,height:128,duration:3,audio:false,frameRate:25,frameCount:75};});await expect(composePersonalizedTimelineMedia(runtime,f.cap,f.bases,f.identity,controller.signal)).rejects.toThrow('COMPOSITION_CANCELLED');expect(execute).not.toHaveBeenCalled();});
});
