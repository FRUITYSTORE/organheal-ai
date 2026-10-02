import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { JobDispatcher } from "@/lib/jobs/job-dispatcher";
import { DurableBackgroundJobWorker } from "@/lib/jobs/background-job-worker";
import { BackgroundJobWorkerRepository } from "@/lib/jobs/background-job-worker.repository";
import { createMedicalMotionRenderHandler } from "@/lib/jobs/handlers/medical-motion-render.handler";
import { MedicalMotionArtifactRepository } from "./repository";
import { MedicalMotionArtifactService } from "./service";
import { SupabasePrivateArtifactStorage, type PrivateArtifactStorage } from "./storage";

/** Explicit render-capable composition, not a worker host or request runtime. */
export function createMedicalMotionArtifactRuntime(client:SupabaseClient,
  policy:{mode:"production"|"development";signal?:AbortSignal},storage:PrivateArtifactStorage=new SupabasePrivateArtifactStorage(client)) {
  const artifactRepository=new MedicalMotionArtifactRepository(client);
  const artifacts=new MedicalMotionArtifactService(artifactRepository,storage);
  const repository=new BackgroundJobWorkerRepository(client,["medical-motion-render"]);
  const dispatcher=new JobDispatcher();
  dispatcher.register("medical-motion-render",createMedicalMotionRenderHandler(client,{...policy,capability:"medical-motion-render",artifacts,
    acceptCandidate:async()=>{throw new Error("DURABLE_ARTIFACT_HANDOFF_REQUIRED");}}));
  const worker=new DurableBackgroundJobWorker(repository,dispatcher);
  return {worker,repository,artifacts,dispatcher,
    resumeAwaiting:async(jobId:string,userId:string)=>{
      if (!await artifactRepository.resumeAwaiting(jobId,userId)) return false;
      return worker.processById(jobId);
    }};
}
