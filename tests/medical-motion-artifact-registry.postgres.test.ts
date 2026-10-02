import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeAll,beforeEach,afterEach,describe,it,expect } from "vitest";
import { sql } from "./helpers/medical-motion-postgres";
import { client,literal } from "./helpers/medical-motion-rpc";
import { artifactSchema,cleanupArtifactOwner } from "./helpers/medical-motion-artifacts";
import { contextContent } from "./helpers/medical-motion-context";
import { MedicalMotionJobRepository } from "@/lib/medical-motion/job.repository";
import { BackgroundJobWorkerRepository,type DurableBackgroundJob } from "@/lib/jobs/background-job-worker.repository";
import { BackgroundJobResultRepository } from "@/lib/jobs/background-job-result.repository";
import { MedicalMotionArtifactRepository } from "@/lib/medical-motion/artifacts/repository";

describe("mandatory real PostgreSQL durable artifact registry",()=>{
  let owner:string,job:DurableBackgroundJob;
  const repo=new MedicalMotionArtifactRepository(client),worker=new BackgroundJobWorkerRepository(client,["medical-motion-render"]);
  const content={media:"video" as const,byteSize:100,sha256:"a".repeat(64)};
  beforeAll(async()=>{await artifactSchema();expect((await sql("show server_version;")).startsWith("17.11")).toBe(true);});
  beforeEach(async()=>{owner=randomUUID();await sql(`insert into auth.users(id) values('${owner}');`);
    const q=await new MedicalMotionJobRepository(client).enqueue(owner,randomUUID(),contextContent(),0);job=(await worker.claimById(q.jobId))!;});
  afterEach(async()=>{await cleanupArtifactOwner(owner);});
  const reserve=()=>repo.reserve(job,content);
  const publish=(id:string,j=job)=>new BackgroundJobResultRepository(client).publish({jobId:j.id,attemptToken:j.attemptToken,manifest:{kind:"artifact",referenceId:id}});
  it("migration refuses pre-existing Medical Motion references",async()=>{
    await publish((await repo.persist(job,(await reserve()).id)).id);
    const migration=readFileSync("supabase/migrations/20261002015011_medical_motion_durable_artifacts.sql","utf8");
    await expect(sql(migration.slice(0,migration.indexOf("-- Private buckets"))+"rollback;")).rejects.toMatchObject({code:"55000"});
  });
  it.each(["anon","authenticated"])("restrictive Storage policy denies %s despite a broad existing policy",async role=>{
    // Transactional SQL fixture, not a Supabase Storage provider test.
    expect(await sql("select to_regclass('storage.objects') is null;")).toBe("t");
    const migration=readFileSync("supabase/migrations/20261002015011_medical_motion_durable_artifacts.sql","utf8");
    const policy=migration.slice(migration.indexOf("-- Private buckets"),migration.indexOf("alter table public.background_jobs"));
    expect(await sql(`begin;create schema if not exists storage;create table storage.objects(bucket_id text);
      alter table storage.objects enable row level security;
      grant usage on schema storage to anon,authenticated;grant all on storage.objects to anon,authenticated;
      create policy broad_fixture on storage.objects for all to anon,authenticated using(true) with check(true);
      ${policy}
      insert into storage.objects values('medical-motion-artifacts'),('other-bucket');set local role ${role};
      do $$ begin
        if (select count(*) from storage.objects)<>1 then raise exception 'Private read permitted';end if;
        begin insert into storage.objects values('medical-motion-artifacts');raise exception 'Private write permitted';exception when insufficient_privilege then null;end;
        update storage.objects set bucket_id='other-bucket' where bucket_id='medical-motion-artifacts';
        if found then raise exception 'Private update permitted';end if;
        delete from storage.objects where bucket_id='medical-motion-artifacts';if found then raise exception 'Private delete permitted';end if;
      end $$;select 'PASSED';rollback;`)).toBe("PASSED");
  });
  it("valid server reservation is owner/job linked and not yet persisted",async()=>{const a=await reserve();expect(a).toMatchObject({userId:owner,jobId:job.id,originAttempt:job.attemptToken,persisted:false});});
  it("wrong owner is rejected",async()=>{await expect(repo.reserve({...job,userId:randomUUID()},content)).rejects.toThrow("ARTIFACT_OWNERSHIP_LOST");});
  it("wrong job is rejected",async()=>{await expect(repo.reserve({...job,id:randomUUID()},content)).rejects.toThrow("ARTIFACT_OWNERSHIP_LOST");});
  it("stale token is rejected",async()=>{await expect(repo.reserve({...job,attemptToken:randomUUID()},content)).rejects.toThrow("ARTIFACT_OWNERSHIP_LOST");});
  it("same identity and bytes reconcile to same ID",async()=>{expect((await reserve()).id).toBe((await reserve()).id);});
  it("same identity and different digest conflict",async()=>{await reserve();await expect(repo.reserve(job,{...content,sha256:"b".repeat(64)})).rejects.toThrow("ARTIFACT_CONFLICT");});
  it("concurrent reservation yields one artifact",async()=>{const rows=await Promise.all([reserve(),reserve()]);expect(rows[0].id).toBe(rows[1].id);expect(await sql(`select count(*) from public.medical_motion_artifacts where job_id='${job.id}';`)).toBe("1");});
  it("missing artifact cannot publish",async()=>{await expect(publish(randomUUID())).rejects.toThrow();expect(await sql(`select status from public.background_jobs where id='${job.id}';`)).toBe("running");});
  it("reserved-only artifact cannot publish",async()=>{await expect(publish((await reserve()).id)).rejects.toThrow();});
  it("normal completion cannot bypass artifact publication",async()=>{await expect(worker.markCompleted({jobId:job.id,attemptToken:job.attemptToken})).rejects.toBeDefined();});
  it("current owner publishes persisted artifact with real FK and completes atomically",async()=>{const a=await repo.persist(job,(await reserve()).id);expect((await publish(a.id)).outcome).toBe("applied");expect(await sql(`select reference_id=medical_motion_artifact_id from public.background_job_results where job_id='${job.id}';`)).toBe("t");expect(await sql(`select status from public.background_jobs where id='${job.id}';`)).toBe("completed");});
  it("finalized publication replay returns same result",async()=>{const a=await repo.persist(job,(await reserve()).id),first=await publish(a.id),second=await publish(a.id);expect(second).toEqual({...first,outcome:"already-finalized"});});
  it("stale uploaded artifact cannot publish",async()=>{const a=await repo.persist(job,(await reserve()).id);await sql(`update public.background_jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id='${job.id}';`);expect((await publish(a.id)).outcome).toBe("ownership-lost");});
  it("new attempt can reconcile prior artifact without changing origin",async()=>{const a=await reserve();await worker.scheduleRetry({jobId:job.id,attemptToken:job.attemptToken,retryDelayMs:0,errorMessage:"ARTIFACT_STATE_UNKNOWN"});job=(await worker.claimById(job.id))!;expect((await repo.persist(job,a.id)).originAttempt).toBe(a.originAttempt);expect((await publish(a.id)).outcome).toBe("applied");});
  it("registry commit replay is idempotent",async()=>{const a=await reserve();expect(await repo.persist(job,a.id)).toEqual(await repo.persist(job,a.id));});
  it("published retrieval requires correct user and job",async()=>{const a=await repo.persist(job,(await reserve()).id);await publish(a.id);expect((await repo.published(job.id,owner))?.id).toBe(a.id);expect(await repo.published(job.id,randomUUID())).toBeUndefined();});
  it("unpublished registry rows are not retrievable",async()=>{await repo.persist(job,(await reserve()).id);expect(await repo.published(job.id,owner)).toBeUndefined();});
  it("awaiting legacy job resumes under new attempt",async()=>{await worker.deferCompletion({jobId:job.id,attemptToken:job.attemptToken});expect(await repo.resumeAwaiting(job.id,owner)).toBe(true);const fresh=await worker.claimById(job.id);expect(fresh?.attemptToken).not.toBe(job.attemptToken);expect(fresh?.attempts).toBe(1);});
  it("awaiting recovery is bounded at max attempts",async()=>{await worker.deferCompletion({jobId:job.id,attemptToken:job.attemptToken});await sql(`update public.background_jobs set attempts=max_attempts-1 where id='${job.id}';`);await repo.resumeAwaiting(job.id,owner);expect(await worker.claimById(job.id)).toBeNull();expect(await sql(`select status from public.background_jobs where id='${job.id}';`)).toBe("failed");});
  it("wrong owner cannot resume awaiting",async()=>{await worker.deferCompletion({jobId:job.id,attemptToken:job.attemptToken});expect(await repo.resumeAwaiting(job.id,randomUUID())).toBe(false);});
  it.each(["anon","authenticated","service_role"])("%s cannot directly read or mutate registry",async role=>{const a=await reserve();expect(await sql(`begin;set local role ${role};do $$ begin
    begin perform 1 from public.medical_motion_artifacts;raise exception 'read permitted';exception when insufficient_privilege then null;end;
    begin update public.medical_motion_artifacts set sha256='${"b".repeat(64)}' where id='${a.id}';raise exception 'update permitted';exception when insufficient_privilege then null;end;
    begin delete from public.medical_motion_artifacts where id='${a.id}';raise exception 'delete permitted';exception when insufficient_privilege then null;end;
    end $$;select 'PASSED';rollback;`)).toBe("PASSED");});
  it("even administrative metadata changes are blocked by immutable trigger",async()=>{const a=await reserve();await expect(sql(`update public.medical_motion_artifacts set sha256='${"b".repeat(64)}' where id='${a.id}';`)).rejects.toBeDefined();await expect(sql(`delete from public.medical_motion_artifacts where id='${a.id}';`)).rejects.toBeDefined();});
  it.each(["anon","authenticated"])("%s cannot call registry RPC",async role=>{expect(await sql(`begin;set local role ${role};do $$ begin
    begin perform public.motion_artifact_operation('${job.id}','${owner}','${job.attemptToken}','list');raise exception 'RPC permitted';exception when insufficient_privilege then null;end;
    end $$;select 'PASSED';rollback;`)).toBe("PASSED");});
  it("different job artifact cannot be linked",async()=>{const a=await repo.persist(job,(await reserve()).id);const q=await new MedicalMotionJobRepository(client).enqueue(owner,randomUUID(),contextContent(),0),other=(await worker.claimById(q.jobId))!;await expect(publish(a.id,other)).rejects.toThrow();});
  it("request capability remains excluded",async()=>{await worker.scheduleRetry({jobId:job.id,attemptToken:job.attemptToken,retryDelayMs:0,errorMessage:"ARTIFACT_STATE_UNKNOWN"});expect(await new BackgroundJobWorkerRepository(client).claimById(job.id)).toBeNull();});
});
