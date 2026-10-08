import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {beforeAll,beforeEach,afterEach,describe,it,expect} from "vitest";
import {configuration,sql} from "./helpers/medical-motion-postgres";
import {client,literal,createCall} from "./helpers/medical-motion-rpc";
import {cleanupArtifactOwner,artifactSchema} from "./helpers/medical-motion-artifacts";
import {contextContent} from "./helpers/medical-motion-context";
import {profileFixture} from "./helpers/source-profile-fixture";
import {createSourceProfileRegistry,sourceProfileSnapshot, trustedSourceProfileBindings} from "../lib/medical-motion/source-profiles";
import {MedicalMotionExecutionContextRepository,readReconstructedSourceProfile} from "../lib/medical-motion/execution-context.repository";
import {MedicalMotionJobRepository} from "../lib/medical-motion/job.repository";
import {BackgroundJobWorkerRepository} from "../lib/jobs/background-job-worker.repository";
import {ReusableArtifactRepository,type ReuseIdentity} from "../lib/medical-motion/artifacts/reuse";

const migration="supabase/migrations/20261008001129_trusted_anatomy_source_profiles.sql";
describe("mandatory local PostgreSQL trusted source profile provenance",()=>{
  let owner:string;
  const {profile}=profileFixture(), registry=createSourceProfileRegistry([profile]);
  const selected=registry.resolve({profileId:profile.profileId,profileVersion:profile.profileVersion});
  const repo=new MedicalMotionExecutionContextRepository(client,registry);
  const binding=()=>trustedSourceProfileBindings([{sceneIndex:0,selection:selected}],profile.assetVersion,"heart",2,registry);
  const profileCall=(value:unknown)=>createCall(owner).replace("create_medical_motion_execution_context","create_medical_motion_profile_context_v1").replace(/\)$/ ,`,${literal(JSON.stringify(value))}::jsonb)`);
  beforeAll(async()=>{
    configuration();await artifactSchema();
    if(await sql("select not exists(select 1 from information_schema.columns where table_schema='public' and table_name='medical_motion_execution_contexts' and column_name='source_profile_bindings');")==="t")
      await sql(readFileSync(migration,"utf8"));
  });
  beforeEach(async()=>{owner=randomUUID();await sql(`insert into auth.users(id) values('${owner}');`);});
  afterEach(async()=>{await cleanupArtifactOwner(owner);expect(await sql(`select count(*) from public.medical_motion_execution_contexts where user_id='${owner}';`)).toBe("0");});
  it("legacy null profile creates, reads and reconstructs unchanged",async()=>{
    const c=await repo.create(owner,contextContent());expect(c).not.toHaveProperty("sourceProfileBindings");
    expect(await repo.reconstruct(c.id,owner,0)).toEqual({schemaVersion:"1",clinical:c.clinical,plan:c.candidatePlan,sceneIndex:0});
    expect(await sql(`select source_profile_bindings is null from public.medical_motion_execution_contexts where id='${c.id}';`)).toBe("t");
  });
  it("persists exact trusted profile and restores runtime authority across repository restart",async()=>{
    const c=await repo.create(owner,contextContent(),[{sceneIndex:0,selection:selected}]);
    expect(c.sourceProfileBindings).toEqual(binding());
    const restarted=new MedicalMotionExecutionContextRepository(client,registry);
    const input=await restarted.reconstruct(c.id,owner,0);expect(sourceProfileSnapshot(readReconstructedSourceProfile(input)!)).toEqual(binding().scenes[0].profile);
    expect(input).not.toHaveProperty("sourceProfile");
    await expect(restarted.reconstruct(c.id,owner,1)).rejects.toThrow("CONTEXT_VERSION_UNAVAILABLE");
    await expect(new MedicalMotionExecutionContextRepository(client).reconstruct(c.id,owner,0)).rejects.toThrow("CONTEXT_VERSION_UNAVAILABLE");
    await expect(repo.read(c.id,randomUUID())).rejects.toThrow("CONTEXT_NOT_FOUND");
  });
  it("privileged profile mutation is rejected by existing immutable trigger",async()=>{
    const c=await repo.create(owner,contextContent(),[{sceneIndex:0,selection:selected}]);
    await expect(sql(`update public.medical_motion_execution_contexts set source_profile_bindings=null where id='${c.id}';`)).rejects.toMatchObject({code:"55000"});
    expect((await repo.read(c.id,owner)).sourceProfileBindings).toEqual(binding());
  });
  it("well-shaped but altered fingerprint cannot resolve server authority",async()=>{
    const b=binding();b.scenes[0].profile.fingerprint="0".repeat(64);
    const output=await sql(`set role service_role;select id from ${profileCall(b)};`);
    await expect(repo.reconstruct(output,owner,0)).rejects.toThrow("CONTEXT_VERSION_UNAVAILABLE");
    await expect(repo.create(owner,{...contextContent(),sourceProfileBindings:binding()})).rejects.toThrow("INVALID_CONTEXT");
    await expect(repo.create(owner,contextContent(),[{sceneIndex:0,selection:JSON.parse(JSON.stringify(selected))}])).rejects.toThrow("INVALID_CONTEXT");
  });
  it("historical version and changed trusted definition never fall back to latest",async()=>{
    const c=await repo.create(owner,contextContent(),[{sceneIndex:0,selection:selected}]);
    for(const changed of [{...profile,profileVersion:"2"},{...profile,evidenceRefs:["TEST-CHANGED-DEFINITION"]}]){
      const historical=new MedicalMotionExecutionContextRepository(client,createSourceProfileRegistry([changed]));
      await expect(historical.reconstruct(c.id,owner,0)).rejects.toThrow("CONTEXT_VERSION_UNAVAILABLE");
    }
  });
  it("additive migration applies to clean dependency fixtures without rewriting a legacy row",async()=>{
    // Fresh isolated dependency schema inside the ONLY permitted disposable DB.
    // Entire fixture and DDL roll back; existing project schemas are never reset.
    const schema="motion_profile_clean_"+randomUUID().replaceAll("-","");
    const envelope=await sql("select pg_get_functiondef('public.medical_motion_context_envelope(text,text,text,text,text,jsonb)'::regprocedure);");
    const legacyCreate=await sql("select pg_get_functiondef('public.create_medical_motion_execution_context(uuid,text,text,text,text,text,jsonb)'::regprocedure);");
    const oldCall=createCall(owner).replaceAll("public.",schema+".");
    const fresh=readFileSync(migration,"utf8").replace(/^begin;\s*/i,"").replace(/commit;\s*$/i,"").replaceAll("public.",schema+".");
    const result=await sql(`begin;create schema ${schema};
      create table ${schema}.medical_motion_execution_contexts (
        id uuid primary key default gen_random_uuid(),user_id uuid not null,schema_version text not null,
        execution_version text not null,asset_version text not null,clinical_message text not null,
        clinical_language text not null,candidate_plan jsonb not null,created_at timestamptz not null default clock_timestamp());
      ${envelope.replaceAll("public.",schema+".")};
      ${legacyCreate.replaceAll("public.",schema+".").replace("RETURNS SETOF medical_motion_execution_contexts",`RETURNS SETOF ${schema}.medical_motion_execution_contexts`)};
      create table ${schema}.background_jobs (like public.background_jobs including defaults);
      create table ${schema}.medical_motion_reuse_keys (like public.medical_motion_reuse_keys including defaults);
      create table ${schema}.medical_motion_artifacts (like public.medical_motion_artifacts including defaults);
      create table ${schema}.medical_motion_requests (like public.medical_motion_requests including defaults);
      select count(*) from ${oldCall};
      ${fresh}
      select count(*) from ${schema}.medical_motion_execution_contexts where source_profile_bindings is null;
      rollback;`).catch(error=>{throw Error(`CLEAN_FIXTURE_SQLSTATE_${error.code ?? "UNKNOWN"}`);});
    expect(result).toBe("1\n1");
    expect(await sql(`select to_regnamespace('${schema}') is null;`)).toBe("t");
  });
  it.each(["extra-envelope","version-type","extra-profile","missing","bad-fingerprint","wrong-asset","wrong-organ","duplicate","index","usage"])("database rejects malformed %s",async kind=>{
    const b:any=binding();
    if(kind==="extra-envelope")b.extra=true;if(kind==="extra-profile")b.scenes[0].profile.extra=true;
    if(kind==="version-type")b.bindingVersion=1;
    if(kind==="missing")delete b.scenes[0].profile.sourceId;if(kind==="bad-fingerprint")b.scenes[0].profile.fingerprint="wrong";
    if(kind==="wrong-asset")b.scenes[0].profile.assetVersion="wrong";if(kind==="wrong-organ")b.scenes[0].profile.organId="liver";
    if(kind==="duplicate")b.scenes.push(b.scenes[0]);if(kind==="index")b.scenes[0].sceneIndex=99;if(kind==="usage")b.scenes[0].profile.usage=["anything"];
    await expect(sql(`set role service_role;select * from ${profileCall(b)};`)).rejects.toMatchObject({code:"22023"});
  });
  it.each(["anon","authenticated"])("denies trusted RPC and direct table access for %s",async role=>{
    await expect(sql(`set role ${role};select * from ${profileCall(binding())};`)).rejects.toMatchObject({code:"42501"});
    expect(await sql(`select has_table_privilege('${role}','public.medical_motion_execution_contexts','SELECT,INSERT,UPDATE,DELETE,TRUNCATE');`)).toBe("f");
    expect(await sql(`select has_function_privilege('${role}','public.enqueue_medical_motion_profile_job_v1(uuid,uuid,text,text,text,text,text,jsonb,integer,jsonb)','EXECUTE');`)).toBe("f");
  });
  it("RLS, helper revocations, service-only grants and empty search paths remain",async()=>{
    expect(await sql("select relrowsecurity from pg_class where oid='public.medical_motion_execution_contexts'::regclass;")).toBe("t");
    expect(await sql("select has_table_privilege('service_role','public.medical_motion_execution_contexts','SELECT,INSERT,UPDATE,DELETE,TRUNCATE');")).toBe("f");
    expect(await sql("select count(*) from pg_proc where proname in ('create_medical_motion_profile_context_v1','enqueue_medical_motion_profile_job_v1','motion_reuse_operation') and prosecdef and array_to_string(proconfig,',')='search_path=\"\"';")).toBe("3");
    expect(await sql("select has_function_privilege('service_role','public.motion_source_profile_bindings_valid(jsonb,text,jsonb)','EXECUTE');")).toBe("f");
  });
  it("profile-aware atomic enqueue is idempotent and conflicts on source profile change",async()=>{
    const jobs=new MedicalMotionJobRepository(client,registry),request=randomUUID(),p=[{sceneIndex:0,selection:selected}];
    const first=await jobs.enqueue(owner,request,contextContent(),0,p);
    expect((await jobs.enqueue(owner,request,contextContent(),0,p)).jobId).toBe(first.jobId);
    await expect(jobs.enqueue(owner,request,contextContent(),0)).rejects.toThrow("MOTION_JOB_CONFLICT");
    expect((await repo.read(first.executionContextId,owner)).sourceProfileBindings).toEqual(binding());
    const other={...profile,profileId:"TEST-other-profile"},otherRegistry=createSourceProfileRegistry([other]);
    await expect(new MedicalMotionJobRepository(client,otherRegistry).enqueue(owner,request,contextContent(),0,[{
      sceneIndex:0,selection:otherRegistry.resolve({profileId:other.profileId,profileVersion:other.profileVersion})
    }])).rejects.toThrow("MOTION_JOB_CONFLICT");
  });
  async function job(){const enqueued=await new MedicalMotionJobRepository(client).enqueue(owner,randomUUID(),contextContent(),0);
    return (await new BackgroundJobWorkerRepository(client,["medical-motion-render"]).claimById(enqueued.jobId))!;}
  function reuseIdentity():ReuseIdentity{return {key:"a".repeat(64),baseFingerprint:"b".repeat(64),outputFingerprint:"c".repeat(64),renderSignature:"d".repeat(64),scope:"internal-review",media:"video",sceneDslVersion:"1",compilerVersion:"1",mechanismId:"TESTMechanism",mechanismVersion:"1"};}
  it("legacy ten-key identity and conflict semantics survive; profile-aware keys stay distinct",async()=>{
    const j=await job(),r=new ReusableArtifactRepository(client),legacy=reuseIdentity();
    expect((await r.operation(j,"reserve",legacy)).outcome).toBe("CACHE_MISS");
    const snap=sourceProfileSnapshot(selected),sourceProfile={profileId:snap.profileId,profileVersion:snap.profileVersion,fingerprint:snap.fingerprint};
    await expect(r.operation(j,"reserve",{...legacy,sourceProfile})).rejects.toThrow("ARTIFACT_CONFLICT");
    const a={...legacy,key:"e".repeat(64),sourceProfile};expect((await r.operation(j,"reserve",a)).outcome).toBe("CACHE_MISS");
    await expect(r.operation(j,"reserve",{...a,sourceProfile:{...sourceProfile,profileId:"TEST-other"}})).rejects.toThrow("ARTIFACT_CONFLICT");
    await expect(r.operation(j,"reserve",{...legacy,baseFingerprint:"f".repeat(64)})).rejects.toThrow("ARTIFACT_CONFLICT");
  });
  it.each(["extra","profile-extra","fingerprint","null","scope","media","mechanism"])("reuse rejects %s",async kind=>{
    const j=await job(),v:any={...reuseIdentity(),sourceProfile:{profileId:"TEST",profileVersion:"1",fingerprint:"f".repeat(64)}};
    if(kind==="extra")v.extra=true;if(kind==="profile-extra")v.sourceProfile.extra=true;if(kind==="fingerprint")v.sourceProfile.fingerprint="bad";
    if(kind==="null")v.sourceProfile=null;if(kind==="scope")v.scope="public";if(kind==="media")v.media="obj";if(kind==="mechanism")v.mechanismId="../invalid";
    await expect(new ReusableArtifactRepository(client).operation(j,"reserve",v)).rejects.toThrow("ARTIFACT_INVALID");
  });
  it("ownership, attempt and lease fencing precede reuse",async()=>{
    const j=await job(),r=new ReusableArtifactRepository(client);
    await expect(r.operation({...j,userId:randomUUID()},"reserve",reuseIdentity())).rejects.toThrow("ARTIFACT_OWNERSHIP_LOST");
    await expect(r.operation({...j,attemptToken:randomUUID()},"reserve",reuseIdentity())).rejects.toThrow("ARTIFACT_OWNERSHIP_LOST");
    await sql(`update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id='${j.id}';`);
    await expect(r.operation(j,"reserve",reuseIdentity())).rejects.toThrow("ARTIFACT_OWNERSHIP_LOST");
  });
});
