import "server-only";
import { createHash } from "node:crypto";
import { lstat, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ExecutionOwnership } from "../../jobs/execution-ownership";
import { isCompiledCinematicExecution, type CompiledCinematicExecution } from "../cinematic-scene-compiler";
import { authorizeCinematicMaster, isReadyCinematicMaster, CINEMATIC_MASTER_SOURCE_PROFILES, type ReadyCinematicMaster } from "../cinematic-master-runtime";
import { getHeartbeatMotionMaster } from "../heartbeat-motion-master";
import { canonicalSceneJson } from "../scene-compiler";
import { cinematicCompositionFilters } from "../composition/cinematic-composition-contract";
import { executeMediaProcess, inspectMedia, type FfmpegRuntime } from "../composition/ffmpeg-runtime";
import { CinematicRuntimeError } from "../composition/runtime-output";
import { createArtifactOwnership, discardArtifact, validateArtifact, type ArtifactOwnership } from "./artifact-output";
import { runBlenderProcess } from "./blender-process";
import { recordCandidateOwnership } from "./execution-resources";
import { ARTIFACT_MAX_BYTES } from "../artifacts/repository";

const hash=(v:Buffer|string)=>createHash("sha256").update(v).digest("hex");
const caches=new WeakSet<object>();
export type NativeCycleCache=Readonly<{ sourceSha256:string; frames:readonly Readonly<{filename:string;sha256:string}>[];fingerprint:string }>;
/** Trusted server cache intake only, bound to the previously approved native proof.
 * No request/planner path can provide images. Every cached byte is pinned then
 * rechecked and copied into the invocation before use. Cache never changes motion. */
export async function registerApprovedNativeCycle(master:ReadyCinematicMaster,evidenceFile:string):Promise<NativeCycleCache>{
  if(!isReadyCinematicMaster(master)||master.module.masterId!=="HEARTBEAT_MOTION_MASTER_V1"||!path.isAbsolute(evidenceFile))throw new CinematicRuntimeError("MASTER_AUTHORITY_INVALID");
  const e=JSON.parse(await readFile(evidenceFile,"utf8")),p=getHeartbeatMotionMaster(master.module.masterId).preset;
  if(e.missingTextures!==false||e.sourceCycleEndpointMaxVertexDelta>1e-6||e.frameCount!==144||e.fps!==24||
    canonicalSceneJson(e.dimensions)!=="[1080,1920]"||e.preset?.sourceSha256!==master.module.sourceSha256||
    ["presentation","sourceAction","sourceCycle","renderCycle","motionPreset","visualConfigurationSha256","geometryOperations","geometryMixing","sourceCurves"]
      .some(k=>canonicalSceneJson(e.preset[k])!==canonicalSceneJson(p[k as keyof typeof p])))throw new CinematicRuntimeError("MASTER_NOT_READY");
  const frames=[];
  const directory=path.join(path.dirname(evidenceFile),path.basename(evidenceFile,".evidence.json")+"-cycle");
  for(let i=0;i<24;i++){
    const filename=path.join(directory,`native-${String(i).padStart(4,"0")}.png`),info=await lstat(filename);
    if(!info.isFile()||info.isSymbolicLink()||info.size>16*1024*1024)throw new CinematicRuntimeError("MASTER_NOT_READY");
    const bytes=await readFile(filename),metadata=await sharp(bytes,{failOn:"warning",limitInputPixels:2073600}).metadata();
    if(metadata.width!==1080||metadata.height!==1920||metadata.format!=="png")throw new CinematicRuntimeError("MASTER_NOT_READY");
    frames.push(Object.freeze({filename,sha256:hash(bytes)}));
  }
  const fingerprint=hash(canonicalSceneJson({sourceSha256:master.module.sourceSha256,frames:frames.map(f=>f.sha256),preset:p}));
  const cache=Object.freeze({sourceSha256:master.module.sourceSha256,frames:Object.freeze(frames),fingerprint});caches.add(cache);return cache;
}
export type CinematicExecutorConfig={repositoryRoot:string;blenderExecutable:string;media:FfmpegRuntime;nativeCycleCache:NativeCycleCache};
let active=false;
/** Explicit review operation, not installed in request/clinical workers. Existing
 * ExecutionOwnership owns lease/cancellation/handoff; this adapter owns cleanup.
 * No database publication, patient delivery or new worker concurrency is added. */
export async function executeOwnedCinematic(ownership:ExecutionOwnership,compiled:CompiledCinematicExecution,
  config:CinematicExecutorConfig,externalSignal:AbortSignal){
  if(!(ownership instanceof ExecutionOwnership)||!isCompiledCinematicExecution(compiled)||!caches.has(config.nativeCycleCache)||
    config.nativeCycleCache.sourceSha256!==compiled.scenes.find(s=>s.master.module.masterId==="HEARTBEAT_MOTION_MASTER_V1")?.master.module.sourceSha256||
    !path.isAbsolute(config.repositoryRoot)||!path.isAbsolute(config.blenderExecutable)||active||
    compiled.timeline.recipeId!=="HEART_CINEMATIC_EXPLAINER_V1"||compiled.timeline.frameCount!==276||compiled.timeline.duration!==11.5||
    compiled.scenes.length!==6||compiled.scenes.some((s,i)=>s.master.module.masterId!==(i<3?"HEART_MASTER_VISUAL_V1":"HEARTBEAT_MOTION_MASTER_V1")||
      s.scene.frameCount!==[60,36,36,36,72,36][i]))
    throw new CinematicRuntimeError("MASTER_AUTHORITY_INVALID");
  active=true;const owners:ArtifactOwnership[]=[];let cleanupUnknown=false;
  const abort=()=>ownership.cancel();externalSignal.addEventListener("abort",abort,{once:true});if(externalSignal.aborted)abort();
  const started=Date.now();let operationError:unknown;
  try{
    const result=await ownership.run(async signal=>{
      try{
        // Revalidate live source bytes, textures, profile authority and locked builders.
        for(const scene of compiled.scenes){const m=scene.master;
          await authorizeCinematicMaster({masterId:m.module.masterId,version:"1",sourceSha256:m.module.sourceSha256,
            selection:CINEMATIC_MASTER_SOURCE_PROFILES.resolve({profileId:m.profile.profileId,profileVersion:m.profile.profileVersion}),
            runtimeOutputProfileId:m.runtimeOutputProfileId,mode:"development",usage:"internal-review",patientFacing:false,
            sourcePath:m.sourcePath,...(m.texturesPath?{texturesPath:m.texturesPath}:{}),repositoryRoot:config.repositoryRoot});
        }
        const owner=await createArtifactOwnership("heart-cinematic-explainer-v1.mp4","video");owners.push(owner);
        const script=path.join(config.repositoryRoot,"render/blender/cinematic_master_executor.py");
        // Executor is repository-owned code; retain its exact digest in evidence.
        const executorSha256=hash((await readFile(script,"utf8")).replace(/\r\n/g,"\n"));
        if(executorSha256!==compiled.executorLock.builderSha256)throw Error("CINEMATIC_BUILDER_INVALID");
        const renderEvidence=[];
        const renderTasks=[];
        for(const masterId of ["HEART_MASTER_VISUAL_V1","HEARTBEAT_MOTION_MASTER_V1"]){
          const first=compiled.scenes.find(s=>s.master.module.masterId===masterId)!;
          const renderOwner=await createArtifactOwnership("frames.mp4","video");owners.push(renderOwner);
          // Fresh presentation cycle plus pull-back; EXPLAIN repeats that same native cycle.
          const selected=compiled.scenes.filter(s=>s.master.module.masterId===masterId && (masterId==="HEART_MASTER_VISUAL_V1"?s.sceneIndex!==1:s.sceneIndex!==4));
          const wire={version:"cinematic-reference-1",masterId,source:first.master.sourcePath,textures:first.master.texturesPath??null,
            repositoryRoot:config.repositoryRoot,outputDirectory:renderOwner.directory,
            builderSha256:first.master.module.lock.builderSha256,sourceSha256:first.master.module.sourceSha256,
            scenes:selected.map(s=>({sceneIndex:s.sceneIndex,frameCount:s.scene.frameCount,
              sourceFrameOffset:masterId==="HEARTBEAT_MOTION_MASTER_V1"?s.scene.startFrame-compiled.timeline.scenes[3].startFrame:0,camera:s.camera}))};
          const file=path.join(renderOwner.directory,"compiler-config.json");await writeFile(file,JSON.stringify(wire),{flag:"wx",mode:0o600});
          renderTasks.push({masterId,renderOwner,file});
        }
        for(const task of renderTasks){
          const check=await runBlenderProcess(config.blenderExecutable,["--background","--python",script,"--","--config",task.file,"--preflight"],120_000,signal);
          if(!check.terminationConfirmed){cleanupUnknown=true;throw Error("CINEMATIC_WRITER_TERMINATION_UNKNOWN");}
          if(check.outcome!=="closed"||check.exitCode!==0||!check.reportedRenderOk)throw Object.assign(Error("CINEMATIC_CAMERA_PREFLIGHT_FAILED"),{diagnostic:check.stderr.slice(-4000)});
        }
        for(const {masterId,renderOwner,file} of renderTasks){
          const process=await runBlenderProcess(config.blenderExecutable,["--background","--python",script,"--","--config",file],20*60_000,signal);
          if(!process.terminationConfirmed){cleanupUnknown=true;throw Error("CINEMATIC_WRITER_TERMINATION_UNKNOWN");}
          if(process.outcome!=="closed"||process.exitCode!==0||!process.reportedRenderOk)throw Object.assign(Error("CINEMATIC_RENDER_FAILED"),{diagnostic:process.stderr.slice(-4000)});
          const evidence=JSON.parse(await readFile(path.join(renderOwner.directory,"camera-evidence.json"),"utf8"));
          if(evidence.preflight!==false)throw Error("CINEMATIC_RENDER_FAILED");
          renderEvidence.push({masterId,directory:renderOwner.directory,evidence});
        }
        const cacheFrames=config.nativeCycleCache.frames;
        for(let i=0;i<cacheFrames.length;i++){
          const bytes=await readFile(cacheFrames[i].filename);if(hash(bytes)!==cacheFrames[i].sha256)throw new CinematicRuntimeError("MASTER_SOURCE_INVALID");
          // Original approved cache remains an integrity-checked reference. Use
          // fresh source-native frames for the revised scene-level presentation.
          const fresh=await readFile(path.join(renderEvidence.find(e=>e.masterId==="HEARTBEAT_MOTION_MASTER_V1")!.directory,`scene-3-${String(i).padStart(4,"0")}.png`));
          await writeFile(path.join(owner.directory,`native-${String(i).padStart(4,"0")}.png`),fresh,{flag:"wx",mode:0o600});
        }
        const bases=[];
        for(const s of compiled.scenes){
          const hero=s.master.module.masterId==="HEART_MASTER_VISUAL_V1",hold=s.camera.movement==="hold";
          const directory=renderEvidence.find(e=>e.masterId===s.master.module.masterId)!.directory;
          const args=["-nostdin","-hide_banner","-loglevel","error","-xerror","-n"];
          let filter="setsar=1,format=yuv420p";
          if(hero&&hold)args.push("-loop","1","-framerate","24","-i",path.join(directory,"scene-0-0000.png"));
          else if(!hero&&hold){args.push("-framerate","24","-start_number","0","-i","native-%04d.png");
            const offset=s.scene.startFrame-compiled.timeline.scenes[3].startFrame;
            filter+=`,loop=loop=-1:size=24:start=0,trim=start_frame=${offset}:end_frame=${offset+s.scene.frameCount},setpts=PTS-STARTPTS`;
          }else args.push("-framerate","24","-start_number","0","-i",path.join(directory,`scene-${s.sceneIndex}-%04d.png`));
          args.push("-vf",filter,"-frames:v",String(s.scene.frameCount),"-an","-c:v","libx264","-preset","ultrafast","-crf","23","-threads","1","-pix_fmt","yuv420p",`segment-${s.sceneIndex}.mp4`);
          await executeMediaProcess(config.media,"ffmpeg",args,owner.directory,signal);
          bases.push(await inspectMedia(config.media,`segment-${s.sceneIndex}.mp4`,owner.directory,signal));
        }
        const filters=cinematicCompositionFilters(compiled.timeline,bases);
        const args=["-nostdin","-hide_banner","-loglevel","error","-xerror","-n"];
        for(const s of compiled.scenes)args.push("-protocol_whitelist","file,pipe","-i",`segment-${s.sceneIndex}.mp4`);
        args.push("-filter_complex",filters.join(";"),"-map","[timeline]","-an","-filter_complex_threads","1","-c:v","libx264",
          "-preset","ultrafast","-crf","23","-threads","1","-frames:v","276","-pix_fmt","yuv420p","-movflags","+faststart","-fs",String(ARTIFACT_MAX_BYTES),path.basename(owner.outputPath));
        await executeMediaProcess(config.media,"ffmpeg",args,owner.directory,signal);
        const full=await inspectMedia(config.media,path.basename(owner.outputPath),owner.directory,signal);
        if(full.width!==1080||full.height!==1920||full.frameRate!==24||full.frameCount!==276||Math.abs(full.duration-11.5)>.00001||full.audio)throw Error("CINEMATIC_OUTPUT_INVALID");
        const valid=await validateArtifact(owner,{width:1080,height:1920});if(!valid.ok)throw Error("CINEMATIC_OUTPUT_INVALID");
        const review="heart-cinematic-explainer-v1-review.mp4";
        await executeMediaProcess(config.media,"ffmpeg",["-nostdin","-hide_banner","-loglevel","error","-n","-i",path.basename(owner.outputPath),
          "-vf","scale=540:960","-an","-c:v","libx264","-preset","medium","-crf","25","-threads","1","-movflags","+faststart",review],owner.directory,signal);
        const reviewMedia=await inspectMedia(config.media,review,owner.directory,signal);
        if(reviewMedia.width!==540||reviewMedia.height!==960||reviewMedia.frameRate!==24||reviewMedia.frameCount!==276||reviewMedia.audio||Math.abs(reviewMedia.duration-11.5)>.00001)throw Error("CINEMATIC_OUTPUT_INVALID");
        const evidence={compiledFingerprint:compiled.fingerprint,runtimeSpecification:compiled.timeline,executorSha256,
          nativeCycleCacheFingerprint:config.nativeCycleCache.fingerprint,renderEvidence,full,review:reviewMedia,
          outputSha256:hash(await readFile(owner.outputPath)),bytes:valid.byteSize,seconds:(Date.now()-started)/1000,
          sourceBoundary:"fade-through-neutral-no-overlap",patientFacing:false,usage:"internal-review"};
        await writeFile(path.join(owner.directory,"execution-evidence.json"),JSON.stringify(evidence,null,2),{flag:"wx",mode:0o600});
        const candidate={path:owner.outputPath,reviewPath:path.join(owner.directory,review),evidencePath:path.join(owner.directory,"execution-evidence.json"),evidence};
        recordCandidateOwnership(candidate,owner,{width:1080,height:1920});
        return {status:"succeeded" as const,value:candidate};
      }catch(error){operationError=error;if(error instanceof Error&&error.message==="COMPOSITION_CLEANUP_UNKNOWN")cleanupUnknown=true;return {status:"failed" as const};}
    });
    if(result.execution!=="succeeded"||!await ownership.confirmHandoff())throw operationError??Error("CINEMATIC_OWNERSHIP_LOST");
    return result.value;
  }catch(error){if(!cleanupUnknown)for(const owner of owners)await discardArtifact(owner);throw error;}
  finally{active=false;externalSignal.removeEventListener("abort",abort);}
}
