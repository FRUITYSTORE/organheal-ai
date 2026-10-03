import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobHandlerResult } from "@/lib/jobs/job-handler";
import { JobDispatcher } from "@/lib/jobs/job-dispatcher";
import { DurableBackgroundJobWorker } from "@/lib/jobs/background-job-worker";
import { BackgroundJobWorkerRepository } from "@/lib/jobs/background-job-worker.repository";
import { createMedicalMotionRenderHandler } from "@/lib/jobs/handlers/medical-motion-render.handler";
import { MedicalMotionArtifactRepository } from "./repository";
import { MedicalMotionArtifactService } from "./service";
import { SupabasePrivateArtifactStorage, type PrivateArtifactStorage } from "./storage";
import { ReusableArtifactCache, ReusableArtifactRepository, type ReuseEvent } from "./reuse";
import { createCompositionJobRuntime } from "../composition/job-runtime";
import { MedicalMotionCompositionService } from "../composition/service";
import type { FfmpegRuntime } from "../composition/ffmpeg-runtime";

/** Explicit render-capable composition, not a worker host or request runtime. */
export function createMedicalMotionArtifactRuntime(client:SupabaseClient,
  policy:{mode:"production"|"development";signal?:AbortSignal;reuse?:boolean;observeReuse?:(event:ReuseEvent)=>void;
    composition?:{runtime:FfmpegRuntime;concurrency:number};advanceDelivery?:()=>Promise<void>},storage:PrivateArtifactStorage=new SupabasePrivateArtifactStorage(client),observeJob?:(id:string)=>(result?:JobHandlerResult)=>void) {
  if(policy.advanceDelivery&&!policy.composition)throw Error("DELIVERY_REQUIRES_COMPOSITION_CAPABILITY");
  const artifactRepository=new MedicalMotionArtifactRepository(client);
  const artifacts=new MedicalMotionArtifactService(artifactRepository,storage);
  const reuse=policy.reuse===true?new ReusableArtifactCache(new ReusableArtifactRepository(client),storage,policy.observeReuse):undefined;
  const repository=new BackgroundJobWorkerRepository(client,["medical-motion-render"]);
  const dispatcher=new JobDispatcher();
  const handler=createMedicalMotionRenderHandler(client,{mode:policy.mode,signal:policy.signal,reuse,capability:"medical-motion-render",artifacts,
    acceptCandidate:async()=>{throw new Error("DURABLE_ARTIFACT_HANDOFF_REQUIRED");}});
  dispatcher.register("medical-motion-render",async job=>{const done=observeJob?.(job.id);let result:JobHandlerResult|undefined;try{result=await handler(job);return result;}
    catch(error){if(!observeJob)throw error;result={disposition:"retry",errorCode:"MOTION_HOST_HANDLER_FAILURE"};return result;}finally{done?.(result);}});
  const worker=new DurableBackgroundJobWorker(repository,dispatcher);
  const composition=policy.composition ? createCompositionJobRuntime(client,
    new MedicalMotionCompositionService(client,artifacts,storage,policy.composition.runtime,policy.mode),
    {concurrency:policy.composition.concurrency,signal:policy.signal??new AbortController().signal,observeJob}) : undefined;
  if(composition){
    // Same host/queue, explicit independent compose bound; alternating polls avoid
    // starving either capability. Existing host still caps total active tasks.
    const renderNext=worker.processNext.bind(worker),renderById=worker.processById.bind(worker);let preferCompose=true;
    worker.processNext=async()=>{await policy.advanceDelivery?.();const first=preferCompose;preferCompose=!preferCompose;
      return first ? await composition.processNext()||await renderNext() : await renderNext()||await composition.processNext();};
    worker.processById=async id=>await renderById(id)||await composition.processById(id);
  }
  return {worker,repository,artifacts,dispatcher,reuse,composition,
    resumeAwaiting:async(jobId:string,userId:string)=>{
      if (!await artifactRepository.resumeAwaiting(jobId,userId)) return false;
      return worker.processById(jobId);
    }};
}
