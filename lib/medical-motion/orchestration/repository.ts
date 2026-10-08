import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/validation/uuid";
import { jsonSnapshot } from "../validation/json-snapshot";
import { ApprovedTimelineRepository } from "../composition/timeline.repository";
import type { TimelineContent } from "../composition/timeline-specification";
import { OrchestrationError, validateSequence, sequenceFingerprint, assertTrustedSequence, type TrustedSceneSequence, type SceneSequenceDefinition } from "./sequence";
export type OrchestrationSnapshot = Readonly<{ id:string; user_id:string; context_id:string; revision_id:string;
 sequence:SceneSequenceDefinition; sequence_fingerprint:string; language:"ar"|"en"; aspect_ratio:"16:9"|"9:16"|"1:1";
 base_job_ids:readonly string[]; spec_id:string|null; compose_job_id:string|null; final_artifact_id:string|null;
 status:"queued"|"preparing"|"rendering"|"waiting-for-bases"|"approving-timeline"|"composing"|"ready"|"failed"|"cancelled";
 failure_code:null|"sequence-unavailable"|"base-unavailable"|"composition-failed"; created_at:string; updated_at:string }>;
export class OrchestrationRepository {
 constructor(private readonly client:SupabaseClient) {}
 private async rpc(owner:string|null,action:string,id:string|null=null,input:unknown=null) {
  if(owner!==null&&!isUuid(owner)||id!==null&&!isUuid(id))throw new OrchestrationError("SEQUENCE_INVALID");
  try {const r=await this.client.rpc("motion_orchestration_operation_v1",{p_user_id:owner,p_action:action,p_id:id,p_input:input});
   if(r.error){if(["22023","OM409"].includes(r.error.code))throw new OrchestrationError("SEQUENCE_UNAVAILABLE");throw Error();}return jsonSnapshot(r.data);
  }catch(e){if(e instanceof OrchestrationError)throw e;throw new OrchestrationError("ORCHESTRATION_UNAVAILABLE");}
 }
 private row(input:unknown,owner?:string):OrchestrationSnapshot {
  if(input===null)throw new OrchestrationError("ORCHESTRATION_NOT_FOUND");
  try {const v=input as OrchestrationSnapshot;
   if(Object.keys(v).length!==16||![v.id,v.user_id,v.context_id,v.revision_id].every(isUuid)||owner&&v.user_id!==owner||
    !Array.isArray(v.base_job_ids)||v.base_job_ids.length!==0&&v.base_job_ids.length!==v.sequence.sceneIndices.length||v.base_job_ids.some(id=>!isUuid(id))||
    [v.spec_id,v.compose_job_id,v.final_artifact_id].some(id=>id!==null&&!isUuid(id))|| (v.spec_id===null)!==(v.compose_job_id===null)||
    !["queued","preparing","rendering","waiting-for-bases","approving-timeline","composing","ready","failed","cancelled"].includes(v.status)||
    ![null,"sequence-unavailable","base-unavailable","composition-failed"].includes(v.failure_code)|| !["ar","en"].includes(v.language)||
    !["16:9","9:16","1:1"].includes(v.aspect_ratio)||![v.created_at,v.updated_at].every(t=>typeof t==="string"&&Number.isFinite(Date.parse(t)))||
    sequenceFingerprint(validateSequence(v.sequence))!==v.sequence_fingerprint)throw Error();return Object.freeze(v);
  }catch{throw new OrchestrationError("ORCHESTRATION_UNAVAILABLE");}
 }
 async create(owner:string,id:string,selection:TrustedSceneSequence,language:"ar"|"en",aspectRatio:"16:9"|"9:16"|"1:1") {
  assertTrustedSequence(selection,owner,selection.contextId);
  if(!selection.definition.aspectRatios.includes(aspectRatio)||!["ar","en"].includes(language))throw new OrchestrationError("SEQUENCE_INVALID");
  return this.row(await this.rpc(owner,"create",id,{contextId:selection.contextId,sequence:selection.definition,fingerprint:selection.fingerprint,language,aspectRatio}),owner);
 }
 async read(owner:string,id:string){return this.row(await this.rpc(owner,"read",id),owner);}
 async refresh(owner:string,id:string){return this.row(await this.rpc(owner,"refresh",id),owner);}
 async bind(owner:string,id:string,jobs:readonly string[]){return this.row(await this.rpc(owner,"bind",id,jobs),owner);}
 async cancel(owner:string,id:string){return this.row(await this.rpc(owner,"cancel",id),owner);}
 async fail(owner:string,id:string){return this.row(await this.rpc(owner,"fail",id),owner);}
 async pending(){const v=await this.rpc(null,"pending");if(!Array.isArray(v)||v.length>10)throw new OrchestrationError("ORCHESTRATION_UNAVAILABLE");return v.map(r=>this.row(r));}
 async approve(owner:string,id:string,content:TimelineContent){
  // Preserve the existing opaque issuance checks. Only its SQL transport is wrapped to
  // atomically attach the approval under the orchestration/cancellation row lock.
  let failure:unknown;
  const transport={rpc:async(name:string,p:Record<string,unknown>)=>{
   if(name!=="approve_motion_timeline_v2"||p.p_user_id!==owner)throw new OrchestrationError("SEQUENCE_INVALID");
   try{return {data:await this.rpc(owner,"approve",id,p.p_content),error:null};}catch(e){failure=e;throw e;}
  }} as unknown as SupabaseClient;
  try{return await new ApprovedTimelineRepository(transport).approveAndSchedule(content);}catch(e){throw failure??e;}
 }
}
