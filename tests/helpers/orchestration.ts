import type {SupabaseClient} from "@supabase/supabase-js";
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {client as baseClient,literal} from "./medical-motion-rpc";
import {sql,configuration} from "./medical-motion-postgres";
import {approvedSpecSchema} from "./approved-personalization";
import {profileFixture} from "./source-profile-fixture";
import {timelineFixture} from "./timeline-fixture";
import {contextContent} from "./medical-motion-context";
import {createSourceProfileRegistry} from "../../lib/medical-motion/source-profiles";
import {MedicalMotionJobRepository} from "../../lib/medical-motion/job.repository";
import {SceneSequenceRegistry,type SceneSequenceDefinition} from "../../lib/medical-motion/orchestration/sequence";
export const client={rpc:async(name:string,p:Record<string,unknown>)=>{
 if(name!=="motion_orchestration_operation_v1")return baseClient.rpc(name,p);
 try{const r=await sql(`set role service_role;select public.motion_orchestration_operation_v1(${p.p_user_id?literal(p.p_user_id)+'::uuid':'null'},${literal(p.p_action)},${p.p_id?literal(p.p_id)+'::uuid':'null'},${p.p_input==null?'null':literal(JSON.stringify(p.p_input))+'::jsonb'});`);return {data:JSON.parse(r||"null"),error:null};}
 catch(e){return {data:null,error:{code:(e as {code?:string}).code,message:"Isolated orchestration unavailable"}};}
}} as unknown as SupabaseClient;
export async function orchestrationSchema(){configuration();await approvedSpecSchema();
 for(const [name,file] of [["approve_motion_timeline_v2(uuid,jsonb)","20261008005422_medical_motion_timeline_v2.sql"],["motion_orchestration_operation_v1(uuid,text,uuid,jsonb)","20261008014004_medical_motion_orchestration_v1.sql"]]){
  if(await sql(`select to_regprocedure('public.${name}') is null;`)==="t")await sql(readFileSync('supabase/migrations/'+file,'utf8'));
  else if(file==='20261008014004_medical_motion_orchestration_v1.sql'){
   const definitions=readFileSync('supabase/migrations/'+file,'utf8').match(/create function public\.[\s\S]*?\$\$;/g)!;
   await sql('begin;'+definitions.map(d=>d.replace(/^create function/,'create or replace function')).join('\n')+'commit;');
  }
 }
}
export async function orchestrationFixture(count=2){
 const f=timelineFixture(count),definitions=f.content.segments.map((s,i)=>{const p=profileFixture().profile;p.profileId=s.sourceProfile.profileId;if(i%2)p.sourceId='TEST-HYPOTHETICAL-SOURCE-B';return p;});
 const profiles=createSourceProfileRegistry(definitions),owner=randomUUID(),revision=randomUUID(),request=randomUUID();
 const input=contextContent();input.candidatePlan={...input.candidatePlan as object,scenes:[...Array.from({length:count-1},()=>({type:"mechanismExplanation"})),{type:"limitationsAndNextSteps"}]} as typeof input.candidatePlan;
 await sql(`insert into auth.users(id) values('${owner}');`);
 const trusted=definitions.map((p,i)=>({sceneIndex:i,selection:profiles.resolve({profileId:p.profileId,profileVersion:p.profileVersion})}));
 const initial=await new MedicalMotionJobRepository(client,profiles).enqueue(owner,revision,input,0,trusted);
 const definition:SceneSequenceDefinition={sequenceId:"TEST-sequence",sequenceVersion:"1",usage:"internal-review",sceneIndices:Array.from({length:count},(_,i)=>i),transitions:f.content.transitions,aspectRatios:["16:9","9:16","1:1"]};
 const sequences=new SceneSequenceRegistry([definition]);
 return {owner,revision,request,contextId:initial.executionContextId,initialJobId:initial.jobId,input,trusted,profiles,sequences,definition,scenes:f.scenes,segments:f.content.segments,
  selection:sequences.resolve(definition.sequenceId,definition.sequenceVersion,owner,initial.executionContextId)};
}
