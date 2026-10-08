import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DurableBackgroundJob } from "@/lib/jobs/background-job-worker.repository";
import type { MedicalMotionArtifactService } from "../artifacts/service";
import type { PrivateArtifactStorage } from "../artifacts/storage";
import { ArtifactError, ARTIFACT_MAX_BYTES } from "../artifacts/repository";
import { open, lstat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { ApprovedTimelineRepository } from "./timeline.repository";
import { CompositionError } from "./specification";
import { prepareCompositionScene } from "./authorization";
import { authorizeTimelineMedia } from "./timeline-specification";
import { composePersonalizedTimelineMedia } from "./timeline-compositor";
import type { FfmpegRuntime } from "./ffmpeg-runtime";
import type { AudioResolver, CompositionEvent, CompositionMeasurement, CompositionBase } from "./compositor";
import { canonicalSceneJson } from "../scene-compiler";

export async function composeTrustedTimeline(client:SupabaseClient,artifacts:MedicalMotionArtifactService,storage:PrivateArtifactStorage,
 runtime:FfmpegRuntime,job:DurableBackgroundJob,signal:AbortSignal,audio?:AudioResolver,
 observe?:(event:CompositionEvent,measurement?:CompositionMeasurement)=>void) {
 const payload=job.payload as {approvedPersonalizationSpecId:string;compositionVersion:string};
 if(job.type!=="medical-motion-compose"||job.status!=="running"||payload.compositionVersion!=="2"||Object.keys(payload).length!==2)throw new CompositionError("COMPOSITION_INVALID");
 const spec=await new ApprovedTimelineRepository(client).read(payload.approvedPersonalizationSpecId,job.userId);
 if(spec.jobId!==job.id)throw new CompositionError("COMPOSITION_INVALID");
 const rpc=async(action:string,artifactId?:string)=>{
  if(signal.aborted)throw new CompositionError("COMPOSITION_CANCELLED");
  const r=await client.rpc("motion_timeline_operation_v2",{p_job_id:job.id,p_user_id:job.userId,p_attempt_token:job.attemptToken,p_action:action,p_artifact_id:artifactId??null})
   .then(r=>r,()=>{throw new ArtifactError("ARTIFACT_STATE_UNKNOWN");});
  if(r.error)throw new ArtifactError(r.error.code==="OM403"?"ARTIFACT_OWNERSHIP_LOST":r.error.code==="OM409"?"ARTIFACT_CONFLICT":"ARTIFACT_STATE_UNKNOWN");
  return r.data as string|null;
 };
 const scenes=[];
 for(const segment of spec.segments) {
  if(signal.aborted)throw new CompositionError("COMPOSITION_CANCELLED");
  const prepared=await prepareCompositionScene(client,job.userId,spec.contextId,segment.sceneIndex,"development");
  const profile=prepared.context.sourceProfileBindings?.scenes.find(s=>s.sceneIndex===segment.sceneIndex)?.profile;
  if(canonicalSceneJson(profile)!==canonicalSceneJson(segment.sourceProfile)||prepared.checked.request.renderSignature!==segment.renderSignature)
   throw new CompositionError("COMPOSITION_INVALID");
  scenes.push(prepared.presentation);
 }
 // Strip repository metadata before strict approved-content validation.
 const {id:_id,jobId:_jobId,createdAt:_createdAt,...content}=spec;
 const capability=authorizeTimelineMedia(content,scenes),pending=await rpc("intent");
 if(pending) {
  const recovered=await artifacts.reconcile(job,signal);
  if(recovered) {
   if(recovered.id!==pending)throw new ArtifactError("ARTIFACT_CONFLICT");
   await rpc("check");return Object.freeze({artifact:recovered,fingerprint:spec.fingerprint,disposition:"private-composed" as const});
  }
 }
 const bases:CompositionBase[]=[];
 let totalBytes=0;
 for(const segment of spec.segments) {
  if(signal.aborted)throw new CompositionError("COMPOSITION_CANCELLED");
  const record=await artifacts.retrieval(segment.baseJobId,job.userId);
  if(signal.aborted)throw new CompositionError("COMPOSITION_CANCELLED");
  if(!record||record.id!==segment.baseArtifactId||record.sha256!==segment.baseSha256)throw new CompositionError("COMPOSITION_INVALID");
  totalBytes+=record.byteSize;if(totalBytes>ARTIFACT_MAX_BYTES)throw new CompositionError("COMPOSITION_INVALID");
  const stored=await storage.read(record.id,signal);
  if(signal.aborted)throw new CompositionError("COMPOSITION_CANCELLED");
  if(!stored||stored.contentType!=="video/mp4")throw new CompositionError("COMPOSITION_INVALID");
  bases.push({record,bytes:stored.bytes});
 }
 const candidate=await composePersonalizedTimelineMedia(runtime,capability,bases,{jobId:job.id,userId:job.userId,attemptToken:job.attemptToken},signal,audio,observe);
 let ambiguous=false;
 try {
  let reserved=pending;
  if(!reserved) {
   const stat=await lstat(candidate.localPath);
   if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>ARTIFACT_MAX_BYTES)throw new CompositionError("COMPOSITION_OUTPUT_INVALID");
   const bytes=Buffer.alloc(stat.size),file=await open(candidate.localPath,"r");
   try {let offset=0;while(offset<bytes.length){const r=await file.read(bytes,offset,bytes.length-offset,offset);if(!r.bytesRead)throw Error();offset+=r.bytesRead;}
    if((await file.read(Buffer.alloc(1),0,1,bytes.length)).bytesRead)throw Error();} finally{await file.close();}
   const reservation=await artifacts.repository.reserve(job,{media:"video",byteSize:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")});
   reserved=reservation.id; if(await rpc("register",reserved)!==reserved)throw new ArtifactError("ARTIFACT_CONFLICT");
  }
  const artifact=await artifacts.handoff(job,candidate,signal,reserved);
  await rpc("check");return Object.freeze({artifact,fingerprint:spec.fingerprint,disposition:"private-composed" as const});
 } catch(error){ambiguous=error instanceof ArtifactError&&["ARTIFACT_STATE_UNKNOWN","ARTIFACT_STORAGE_UNAVAILABLE"].includes(error.code);throw error;}
 finally{if(!ambiguous)await candidate.discard();}
}
