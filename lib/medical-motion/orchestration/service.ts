import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MedicalMotionJobRepository } from "../job.repository";
import { MedicalMotionExecutionContextRepository, ExecutionContextError } from "../execution-context.repository";
import { SOURCE_PROFILES, resolveStoredSourceProfile, type SourceProfileRegistry } from "../source-profiles";
import { prepareCompositionScene } from "../composition/authorization";
import { CompositionError } from "../composition/specification";
import type { TrustedTimelineProducer } from "../composition/timeline-producer";
import type { MedicalMotionArtifactService } from "../artifacts/service";
import { ArtifactError } from "../artifacts/repository";
import { validateVideoExplanationPlan } from "@/lib/symptom-explanation/validate-explanation-plan";
import { assertTrustedSequence, INTERNAL_SCENE_SEQUENCES, SceneSequenceRegistry, OrchestrationError, type TrustedSceneSequence } from "./sequence";
import { OrchestrationRepository, type OrchestrationSnapshot } from "./repository";

/** Internal cadence hook only. No route, scheduler, host activation or patient access URL. */
export class TrustedMultiSceneOrchestrationService {
 readonly repository:OrchestrationRepository;
 constructor(private readonly client:SupabaseClient,private readonly artifacts:MedicalMotionArtifactService,
  private readonly producer:TrustedTimelineProducer,private readonly sequences:SceneSequenceRegistry=INTERNAL_SCENE_SEQUENCES,
  private readonly profiles:SourceProfileRegistry=SOURCE_PROFILES) {this.repository=new OrchestrationRepository(client);}
 private async gate(owner:string,contextId:string,selection:TrustedSceneSequence) {
  assertTrustedSequence(selection,owner,contextId);
  const context=await new MedicalMotionExecutionContextRepository(this.client,this.profiles).read(contextId,owner);
  const plan=validateVideoExplanationPlan(context.candidatePlan);
  if(!plan.ok||!context.sourceProfileBindings)throw new OrchestrationError("SEQUENCE_UNAVAILABLE");
  for(const idx of selection.definition.sceneIndices){
   if(idx>=plan.plan.scenes.length||!context.sourceProfileBindings.scenes.some(s=>s.sceneIndex===idx&&s.profile.organId===plan.plan.organ))throw new OrchestrationError("SEQUENCE_UNAVAILABLE");
   const prepared=await prepareCompositionScene(this.client,owner,contextId,idx,"development");
   if(prepared.context.id!==contextId||prepared.context.userId!==owner||prepared.presentation.scene.usage!=="internal-review"||
    prepared.presentation.scene.renderIntent==="still"||prepared.presentation.reuse.classification!=="reusable-base"||!prepared.presentation.scene.sourceProfile)
    throw new OrchestrationError("SEQUENCE_UNAVAILABLE");
  }
  return context;
 }
 private selection(row:OrchestrationSnapshot){const s=this.sequences.resolve(row.sequence.sequenceId,row.sequence.sequenceVersion,row.user_id,row.context_id);
  if(s.fingerprint!==row.sequence_fingerprint)throw new OrchestrationError("SEQUENCE_UNAVAILABLE");return s;}
 async create(owner:string,requestId:string,selection:TrustedSceneSequence,language:"ar"|"en",aspectRatio:"16:9"|"9:16"|"1:1") {
  assertTrustedSequence(selection,owner,selection.contextId);
  if(this.sequences.resolve(selection.definition.sequenceId,selection.definition.sequenceVersion,owner,selection.contextId).fingerprint!==selection.fingerprint)
   throw new OrchestrationError("SEQUENCE_UNAVAILABLE");
  await this.gate(owner,selection.contextId,selection);
  return this.repository.create(owner,requestId,selection,language,aspectRatio);
 }
 async read(owner:string,id:string){const row=await this.repository.read(owner,id);
  if(row.status!=="cancelled"&&row.status!=="failed"){
   await this.gate(owner,row.context_id,this.selection(row));
   if(row.status==="ready") { // Read never downloads bytes or issues patient access.
    if(!row.compose_job_id||!row.final_artifact_id||(await this.artifacts.repository.published(row.compose_job_id,owner))?.id!==row.final_artifact_id)
     throw new OrchestrationError("SEQUENCE_UNAVAILABLE");
   }
  }return row;
 }
 async cancel(owner:string,id:string){return this.repository.cancel(owner,id);}
 async advancePending(signal:AbortSignal){
  for(const initial of await this.repository.pending()){
   if(signal.aborted)return;
   try{
    let row=await this.repository.read(initial.user_id,initial.id);
    if(["ready","failed","cancelled"].includes(row.status))continue;
    const selected=this.selection(row),context=await this.gate(row.user_id,row.context_id,selected);
    if(!row.base_job_ids.length){
     const bindings=context.sourceProfileBindings!;
     const trusted=bindings.scenes.map(s=>({sceneIndex:s.sceneIndex,selection:resolveStoredSourceProfile(s.profile,this.profiles)}));
     const jobs=new MedicalMotionJobRepository(this.client,this.profiles),ids=[];
     for(const idx of selected.definition.sceneIndices){if(signal.aborted)return;
      const job=await jobs.enqueue(row.user_id,row.revision_id,{schemaVersion:context.schemaVersion,executionVersion:context.executionVersion,
       assetVersion:context.assetVersion,clinical:context.clinical,candidatePlan:context.candidatePlan},idx,trusted);
      if(job.executionContextId!==row.context_id)throw new OrchestrationError("SEQUENCE_UNAVAILABLE");ids.push(job.jobId);
     }
     row=await this.repository.bind(row.user_id,row.id,ids);
    }
    row=await this.repository.refresh(row.user_id,row.id);
    if(row.status!=="waiting-for-bases"&&row.status!=="rendering")continue;
    let allReady=true;
    for(const id of row.base_job_ids){if(signal.aborted)return;if(!await this.artifacts.retrieval(id,row.user_id)){allReady=false;break;}}
    if(!allReady)continue;
    if(signal.aborted)return;
    const spec=await this.producer.approve(row.user_id,row.context_id,row.sequence.sceneIndices.map((sceneIndex,i)=>({sceneIndex,baseJobId:row.base_job_ids[i]})),
     row.sequence.transitions,{compositionVersion:"2",baseAudio:"silence",language:row.language,outputProfile:{aspectRatio:row.aspect_ratio,resolution:"720p",policy:"fit"},
      textOverlays:[],numericOverlays:[],chartOverlays:[],audioSegments:[],dynamicNarrationSlots:[]},signal);
    if(!signal.aborted)await this.repository.approve(row.user_id,row.id,spec);
   }catch(e){if(signal.aborted)return;
    if(e instanceof OrchestrationError&&e.code==="SEQUENCE_UNAVAILABLE"||e instanceof CompositionError&&e.code==="COMPOSITION_INVALID"||e instanceof ExecutionContextError&&e.code==="CONTEXT_VERSION_UNAVAILABLE"||e instanceof ArtifactError&&["ARTIFACT_INVALID","ARTIFACT_CONFLICT"].includes(e.code))
     await this.repository.fail(initial.user_id,initial.id);
    // Unknown transport state stays durable for a bounded subsequent cadence.
   }
  }
 }
}
