import sharp from "sharp";
import {randomUUID,createHash} from "node:crypto";
import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {describe,it,expect,beforeAll,afterAll} from "vitest";
import {compositionRuntime} from "../helpers/composition-media";
import {timelineFixture,rehashTimeline} from "../helpers/timeline-fixture";
import {authorizeTimelineMedia} from "../../lib/medical-motion/composition/timeline-specification";
import {composePersonalizedTimelineMedia} from "../../lib/medical-motion/composition/timeline-compositor";
import {executeMediaProcess,inspectMedia,auditFfmpegRuntime} from "../../lib/medical-motion/composition/ffmpeg-runtime";
import type {CompositionBase} from "../../lib/medical-motion/composition/compositor";
describe('REAL timeline compositor only: deterministic non-PHI color clips',()=>{
 let root:string,runtime:Awaited<ReturnType<typeof compositionRuntime>>,bases:CompositionBase[];
 const signal=()=>new AbortController().signal;
 beforeAll(async()=>{
  root=await mkdtemp(path.join(tmpdir(),'organheal-timeline-acceptance-'));runtime=await compositionRuntime(root);bases=[];
  for(const [i,color] of ['red','blue'].entries()){
   await executeMediaProcess(runtime,'ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-n','-f','lavfi','-i',`color=c=${color}:s=128x128:r=25:d=3`,
    '-f','lavfi','-i','sine=frequency=440:duration=3','-c:v','libx264','-c:a','aac','-threads','1','-pix_fmt','yuv420p',`base-${i}.mp4`],root,signal());
   const bytes=await readFile(path.join(root,`base-${i}.mp4`));bases.push({bytes,record:{id:randomUUID(),userId:randomUUID(),jobId:randomUUID(),originAttempt:randomUUID(),media:'video',persisted:true,byteSize:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}});
  }
 },60000);
 afterAll(async()=>{if(root&&path.dirname(root)===tmpdir()&&path.basename(root).startsWith('organheal-timeline-acceptance-'))await rm(root,{recursive:true,force:true});});
 it.each(['cut','fade-through-neutral'] as const)('real %s keeps source order, deterministic time and strips base audio',async kind=>{
  const f=timelineFixture(),segments=f.content.segments.map((s,i)=>({...s,baseArtifactId:bases[i].record.id,baseJobId:bases[i].record.jobId,baseSha256:bases[i].record.sha256}));
  const content=rehashTimeline({...f.content,segments,transitions:[kind==='cut'?{boundaryIndex:0,kind,duration:0}:{boundaryIndex:0,kind,duration:.4}]});
  const started=performance.now(),candidate=await composePersonalizedTimelineMedia(runtime,authorizeTimelineMedia(content,f.scenes),bases,
   {jobId:randomUUID(),userId:content.userId,attemptToken:randomUUID()},signal());
  try{
   const media=await inspectMedia(runtime,candidate.localPath,path.dirname(candidate.localPath),signal()),bytes=await readFile(candidate.localPath);
   expect(media).toEqual({width:1280,height:720,duration:6,audio:false,frameRate:25,frameCount:150});
   // Extract representative actual output pixels, proving red -> neutral -> blue (no blended anatomy).
   const pixels=[];
   for(const t of [1,3,4]){
    const name=`${kind}-${t}.png`;await executeMediaProcess(runtime,'ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-ss',String(t),'-i',candidate.localPath,'-frames:v','1','-vf','crop=2:2:400:350','-n',name],root,signal());
    pixels.push(await sharp(path.join(root,name)).removeAlpha().raw().toBuffer());
   }
   expect(pixels[0][0]).toBeGreaterThan(200);expect(pixels[0][2]).toBeLessThan(20);
   expect(pixels[2][2]).toBeGreaterThan(200);expect(pixels[2][0]).toBeLessThan(20);
   if(kind==='fade-through-neutral')expect(Math.max(...pixels[1])).toBeLessThan(20);
   const version=await auditFfmpegRuntime(runtime,root,signal());
   await writeFile(path.join(tmpdir(),`organheal-mm-prod-4b-${kind}-acceptance.json`),JSON.stringify({kind,ffmpeg:version.version,...media,segmentDurations:[3,3],transitionDuration:kind==='cut'?0:.4,outputBytes:bytes.length,executionMilliseconds:Math.round(performance.now()-started)},null,2),{mode:0o600});
  }finally{await candidate.discard();}
 },60000);
});
