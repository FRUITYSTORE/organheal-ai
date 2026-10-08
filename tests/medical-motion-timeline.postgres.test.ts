import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {describe,it,expect,beforeAll,beforeEach,afterEach} from "vitest";
import {approvedSpecSchema} from "./helpers/approved-personalization";
import {sql,configuration} from "./helpers/medical-motion-postgres";
import {client,literal} from "./helpers/medical-motion-rpc";
import {cleanupArtifactOwner} from "./helpers/medical-motion-artifacts";
import {contextContent} from "./helpers/medical-motion-context";
import {timelineFixture,rehashTimeline} from "./helpers/timeline-fixture";
import {issueTimeline,type TimelineContent} from "../lib/medical-motion/composition/timeline-specification";
import {ApprovedTimelineRepository} from "../lib/medical-motion/composition/timeline.repository";
import {MedicalMotionArtifactRepository} from "../lib/medical-motion/artifacts/repository";
import {BackgroundJobWorkerRepository} from "../lib/jobs/background-job-worker.repository";
import {BackgroundJobResultRepository} from "../lib/jobs/background-job-result.repository";
import {ReusableArtifactRepository,type ReuseIdentity} from "../lib/medical-motion/artifacts/reuse";
import {createIsolatedMotionDatabase} from "../lib/medical-motion/worker/local-postgres";
const migration='supabase/migrations/20261008005422_medical_motion_timeline_v2.sql';
describe('real guarded PostgreSQL timeline V2 acceptance',()=>{
 let owner:string,content:TimelineContent,scenes:ReturnType<typeof timelineFixture>['scenes'];
 const approved=new ApprovedTimelineRepository(client),artifacts=new MedicalMotionArtifactRepository(client);
 beforeAll(async()=>{configuration();await approvedSpecSchema();
  const source=readFileSync(migration,'utf8');
  if(await sql("select to_regprocedure('public.approve_motion_timeline_v2(uuid,jsonb)') is null;")==='t')await sql(source);
  else { // Reapply only the current in-progress function definitions, never existing applied migrations.
   if(await sql("select not exists(select 1 from information_schema.columns where table_schema='public' and table_name='medical_motion_timeline_segments' and column_name='base_job_id');")==='t'){
    expect(await sql('select count(*) from public.medical_motion_timeline_segments;')).toBe('0');
    await sql('alter table public.medical_motion_timeline_segments add column base_job_id uuid not null references public.background_jobs(id) on delete restrict, add column base_artifact_id uuid not null references public.medical_motion_artifacts(id) on delete restrict;');
   }
   const definitions=source.match(/create (?:or replace )?function public\.[\s\S]*?\$\$;/g)!;
   await sql('begin;'+definitions.map(d=>d.replace(/^create function/,'create or replace function')).join('\n')+'commit;');
  }
 });
 beforeEach(async()=>{
  const f=timelineFixture();content=f.content;scenes=f.scenes;owner=content.userId;await sql(`insert into auth.users(id) values('${owner}');`);
  const input=contextContent(),request=randomUUID(),bindings={bindingVersion:'1',scenes:content.segments.map(s=>({sceneIndex:s.sceneIndex,profile:s.sourceProfile}))};
  const segments=[];
  for(const s of content.segments){
   const r=await client.rpc('enqueue_medical_motion_profile_job_v1',{p_user_id:owner,p_request_id:request,p_schema_version:'1',p_execution_version:'1',p_asset_version:input.assetVersion,p_clinical_message:input.clinical.message,p_clinical_language:'en',p_candidate_plan:input.candidatePlan,p_scene_index:s.sceneIndex,p_source_profile_bindings:bindings});
   expect(r.error?.code,'ENQUEUE').toBeUndefined();const row=r.data[0];content={...content,contextId:row.execution_context_id};
   const job=(await new BackgroundJobWorkerRepository(client,['medical-motion-render']).claimById(row.job_id))!;
   const profile=s.sourceProfile;
   const identity:ReuseIdentity={key:randomUUID().replaceAll('-','').repeat(2),baseFingerprint:s.baseFingerprint,outputFingerprint:s.baseOutputFingerprint,renderSignature:s.renderSignature,
    scope:'internal-review',media:'video',sceneDslVersion:'1',compilerVersion:'1',mechanismId:'leftVentricularPressureLoad',mechanismVersion:'1',sourceProfile:{profileId:profile.profileId,profileVersion:profile.profileVersion,fingerprint:profile.fingerprint}};
   const reuse=new ReusableArtifactRepository(client),miss=await reuse.operation(job,'reserve',identity);
   const base=await artifacts.reserve(job,{media:'video',byteSize:123,sha256:s.baseSha256});await artifacts.persist(job,base.id);await reuse.operation(job,'ready',identity,miss.epoch,base.id);
   await new BackgroundJobResultRepository(client).publish({jobId:job.id,attemptToken:job.attemptToken,manifest:{kind:'artifact',referenceId:base.id}});
   segments.push({...s,baseJobId:job.id,baseArtifactId:base.id});
  }
  content=rehashTimeline({...content,segments});
 });
 afterEach(async()=>{await cleanupArtifactOwner(owner);expect(await sql(`select count(*) from public.medical_motion_timeline_compositions where user_id='${owner}';`)).toBe('0');});
 const approve=()=>approved.approveAndSchedule(issueTimeline(content,scenes));
 it('strict localhost exact test DB guard passes',()=>expect(()=>configuration()).not.toThrow());
 it('durable approved spec reads exact ordered profiles and idempotently schedules compose V2',async()=>{const a=await approve();expect(await approved.read(a.id,owner)).toEqual(a);expect(await approve()).toEqual(a);expect(await sql(`select payload->>'compositionVersion' from public.background_jobs where id='${a.jobId}';`)).toBe('2');});
 it('approved spec is immutable',async()=>{const a=await approve();await expect(sql(`update public.medical_motion_approved_specs set content='{}' where id='${a.id}';`)).rejects.toThrow();});
 it.each(['owner','sha','base','render','profile','legacy','order','transition'])('rejects %s mismatch in real SQL',async kind=>{
  const c=structuredClone(content) as any;if(kind==='owner')c.userId=randomUUID();if(kind==='sha')c.segments[0].baseSha256='c'.repeat(64);
  if(kind==='base')c.segments[0].baseFingerprint='c'.repeat(64);if(kind==='render')c.segments[0].renderSignature='c'.repeat(64);if(kind==='profile')c.segments[0].sourceProfile.profileVersion='bad';
  if(kind==='legacy')delete c.segments[0].sourceProfile;if(kind==='order')c.segments[0].segmentIndex=1;if(kind==='transition')c.transitions[0].kind='crossfade';
  const r=await client.rpc('approve_motion_timeline_v2',{p_user_id:owner,p_content:c});expect(r.error).not.toBeNull();
 });
 it('anon/authenticated cannot approve and tables remain private',async()=>{
  for(const role of ['anon','authenticated'])expect(await sql(`select has_function_privilege('${role}','public.approve_motion_timeline_v2(uuid,jsonb)','execute');`)).toBe('f');
  expect(await sql("select relrowsecurity from pg_class where oid='public.medical_motion_timeline_segments'::regclass;")).toBe('t');
  expect(await sql("select has_table_privilege('service_role','public.medical_motion_timeline_segments','select');")).toBe('f');
 });
 it.each(['unknown-overlay','global-time','base-audio','null-boundary','output-profile'])('SQL rejects malformed %s presentation or boundary',async kind=>{
  const c=structuredClone(content) as any;
  if(kind==='unknown-overlay')c.specification.textOverlays=[{slot:'subtitle',start:0,end:1,text:'TEST',arbitrary:'bad'}];
  if(kind==='global-time')c.specification.textOverlays=[{slot:'subtitle',start:0,end:7,text:'TEST'}];
  if(kind==='base-audio')c.specification.baseAudio='preserve';if(kind==='null-boundary')c.transitions[0].kind=null;
  if(kind==='output-profile')c.specification.outputProfile.policy='crop';
  expect((await client.rpc('approve_motion_timeline_v2',{p_user_id:owner,p_content:c})).error).not.toBeNull();
 });
 it('complete timeline provenance is required for fenced publication and stale epoch fails',async()=>{
  const a=await approve(),job=(await new BackgroundJobWorkerRepository(client,['medical-motion-compose']).claimById(a.jobId))!;
  const final=await artifacts.reserve(job,{media:'video',byteSize:234,sha256:'d'.repeat(64)});await artifacts.persist(job,final.id);
  const results=new BackgroundJobResultRepository(client);
  await expect(results.publish({jobId:job.id,attemptToken:job.attemptToken,manifest:{kind:'artifact',referenceId:final.id}})).rejects.toThrow();
  const r=await client.rpc('motion_timeline_operation_v2',{p_job_id:job.id,p_user_id:owner,p_attempt_token:job.attemptToken,p_action:'register',p_artifact_id:final.id});expect(r.error?.code).toBeUndefined();
  expect(await sql(`select count(*) from public.medical_motion_timeline_segments where artifact_id='${final.id}';`)).toBe('2');
  await sql(`update public.medical_motion_reuse_keys set epoch=epoch+1 where artifact_id='${content.segments[0].baseArtifactId}';`);
  await expect(results.publish({jobId:job.id,attemptToken:job.attemptToken,manifest:{kind:'artifact',referenceId:final.id}})).rejects.toThrow();
 });
 it('valid registered timeline publishes with all segment provenance',async()=>{
  const a=await approve(),job=(await new BackgroundJobWorkerRepository(client,['medical-motion-compose']).claimById(a.jobId))!;
  const final=await artifacts.reserve(job,{media:'video',byteSize:234,sha256:'d'.repeat(64)});await artifacts.persist(job,final.id);
  const r=await client.rpc('motion_timeline_operation_v2',{p_job_id:job.id,p_user_id:owner,p_attempt_token:job.attemptToken,p_action:'register',p_artifact_id:final.id});expect(r.error?.code).toBeUndefined();
  expect((await new BackgroundJobResultRepository(client).publish({jobId:job.id,attemptToken:job.attemptToken,manifest:{kind:'artifact',referenceId:final.id}})).outcome).toBe('applied');
 });
 it('copied JSON is not scheduling authority',async()=>{await expect(approved.approveAndSchedule(structuredClone(issueTimeline(content,scenes)))).rejects.toThrow('COMPOSITION_INVALID');});
 it('isolated worker transport supports exact V2 approval and intent RPCs',async()=>{
  const local=createIsolatedMotionDatabase(process.env).client,a=await new ApprovedTimelineRepository(local).approveAndSchedule(issueTimeline(content,scenes));
  const job=(await new BackgroundJobWorkerRepository(local,['medical-motion-compose']).claimById(a.jobId))!;
  const r=await local.rpc('motion_timeline_operation_v2',{p_job_id:job.id,p_user_id:owner,p_attempt_token:job.attemptToken,p_action:'intent',p_artifact_id:null});
  expect(r.error).toBeNull();expect(r.data).toBeNull();
 });
 it('wrong owner and expired lease cannot register provenance',async()=>{
  const a=await approve(),job=(await new BackgroundJobWorkerRepository(client,['medical-motion-compose']).claimById(a.jobId))!;
  for(const user of [randomUUID(),owner]){
   if(user===owner)await sql(`update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id='${job.id}';`);
   const r=await client.rpc('motion_timeline_operation_v2',{p_job_id:job.id,p_user_id:user,p_attempt_token:job.attemptToken,p_action:'register',p_artifact_id:randomUUID()});expect(r.error?.code).toBe('OM403');
  }
 });
 it('registered segments and composition are immutable and cannot acquire V1 provenance',async()=>{
  const a=await approve(),job=(await new BackgroundJobWorkerRepository(client,['medical-motion-compose']).claimById(a.jobId))!;
  const final=await artifacts.reserve(job,{media:'video',byteSize:234,sha256:'d'.repeat(64)});
  const r=await client.rpc('motion_timeline_operation_v2',{p_job_id:job.id,p_user_id:owner,p_attempt_token:job.attemptToken,p_action:'register',p_artifact_id:final.id});expect(r.error).toBeNull();
  await expect(sql(`update public.medical_motion_timeline_segments set identity='{}' where artifact_id='${final.id}';`)).rejects.toThrow();
  await expect(sql(`insert into public.medical_motion_compositions(artifact_id,base_artifact_id,base_job_id,user_id,job_id,context_id,origin_attempt,provenance)
   values('${final.id}','${content.segments[0].baseArtifactId}','${content.segments[0].baseJobId}','${owner}','${job.id}','${content.contextId}','${job.attemptToken}','{}');`)).rejects.toThrow();
 });
 it('same approved job recovers immutable intent on a new fenced attempt',async()=>{
  const a=await approve(),worker=new BackgroundJobWorkerRepository(client,['medical-motion-compose']),old=(await worker.claimById(a.jobId))!;
  const final=await artifacts.reserve(old,{media:'video',byteSize:234,sha256:'d'.repeat(64)});await artifacts.persist(old,final.id);
  expect((await client.rpc('motion_timeline_operation_v2',{p_job_id:old.id,p_user_id:owner,p_attempt_token:old.attemptToken,p_action:'register',p_artifact_id:final.id})).error).toBeNull();
  await sql(`update public.background_jobs set status='retrying',attempt_token=null,lease_expires_at=null,available_at=clock_timestamp() where id='${old.id}';`);
  const current=(await worker.claimById(a.jobId))!;
  const intent=await client.rpc('motion_timeline_operation_v2',{p_job_id:current.id,p_user_id:owner,p_attempt_token:current.attemptToken,p_action:'intent',p_artifact_id:null});expect(intent.data).toBe(final.id);
  expect((await new BackgroundJobResultRepository(client).publish({jobId:current.id,attemptToken:current.attemptToken,manifest:{kind:'artifact',referenceId:final.id}})).outcome).toBe('applied');
 });
 it('migration applies to clean dependency tables and rolls back all fixture DDL',async()=>{
  const schema='timeline_clean_'+randomUUID().replaceAll('-','');
  const dependencies=['medical_motion_artifacts','background_jobs','medical_motion_execution_contexts','medical_motion_approved_specs','medical_motion_reuse_keys','medical_motion_reuse_links','medical_motion_compositions','background_job_results'];
  const source=readFileSync(migration,'utf8').replace(/^begin;\s*/,'').replace(/commit;\s*$/,'').replaceAll('public.',schema+'.');
  const functions=await sql(`select pg_get_functiondef(oid) from pg_proc where oid in ('public.reject_background_job_result_mutation()'::regprocedure,'public.read_published_motion_artifact(uuid,uuid)'::regprocedure);`);
  const value=await sql(`begin;create schema ${schema};${dependencies.map(t=>`create table ${schema}.${t} (like public.${t} including defaults including constraints including indexes);`).join('\n')}
   ${functions.replaceAll('public.',schema+'.').replace(/\$function\$\s*(?=CREATE)/g,'$function$;\n')}; ${source}
   select count(*) from ${schema}.medical_motion_timeline_segments;rollback;`);
  expect(value).toBe('0');expect(await sql(`select to_regnamespace('${schema}') is null;`)).toBe('t');
 });
});
