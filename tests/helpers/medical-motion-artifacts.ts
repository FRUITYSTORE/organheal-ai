import { readFileSync } from "node:fs";
import { configuration, sql } from "./medical-motion-postgres";
export async function artifactSchema() {
  configuration();
  if(await sql("select to_regclass('public.medical_motion_artifacts') is null;")==="t")
    await sql(readFileSync("supabase/migrations/20261002015011_medical_motion_durable_artifacts.sql","utf8"));
  if(await sql("select to_regclass('public.medical_motion_reuse_keys') is null;")==="t")
    await sql(readFileSync("supabase/migrations/20261003000216_medical_motion_reusable_artifacts.sql","utf8"));
}
/** Exact synthetic owner cleanup, only after the dedicated local DB guard. */
export async function cleanupArtifactOwner(owner:string) {
  configuration();
  await sql(`begin;
    alter table public.background_job_results disable trigger background_job_results_immutable;
    delete from public.background_job_results where job_id in(select id from public.background_jobs where user_id='${owner}');
    alter table public.background_job_results enable trigger background_job_results_immutable;
    alter table public.medical_motion_reuse_links disable trigger medical_motion_reuse_links_immutable;
    delete from public.medical_motion_reuse_links where job_id in(select id from public.background_jobs where user_id='${owner}');
    alter table public.medical_motion_reuse_links enable trigger medical_motion_reuse_links_immutable;
    delete from public.medical_motion_reuse_keys where producer_job_id in(select id from public.background_jobs where user_id='${owner}')
      or artifact_id in(select id from public.medical_motion_artifacts where user_id='${owner}');
    alter table public.medical_motion_artifacts disable trigger medical_motion_artifacts_immutable;
    delete from public.medical_motion_artifacts where user_id='${owner}';
    alter table public.medical_motion_artifacts enable trigger medical_motion_artifacts_immutable;
    alter table public.background_jobs disable trigger background_jobs_medical_motion_link;
    delete from public.background_jobs where user_id='${owner}';
    alter table public.background_jobs enable trigger background_jobs_medical_motion_link;
    alter table public.medical_motion_requests disable trigger medical_motion_requests_immutable;
    delete from public.medical_motion_requests where user_id='${owner}';
    alter table public.medical_motion_requests enable trigger medical_motion_requests_immutable;
    alter table public.medical_motion_execution_contexts disable trigger medical_motion_execution_contexts_immutable;
    delete from public.medical_motion_execution_contexts where user_id='${owner}';
    alter table public.medical_motion_execution_contexts enable trigger medical_motion_execution_contexts_immutable;
    delete from auth.users where id='${owner}';commit;`);
}
