import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/validation/uuid";
import type { DurableBackgroundJob } from "@/lib/jobs/background-job-worker.repository";

export const ARTIFACT_MAX_BYTES = 64 * 1024 * 1024;
export type ArtifactRecord = Readonly<{ id: string; userId: string; jobId: string; originAttempt: string;
  media: "still" | "video"; byteSize: number; sha256: string; persisted: boolean }>;
export class ArtifactError extends Error {
  constructor(readonly code: "ARTIFACT_INVALID" | "ARTIFACT_CONFLICT" | "ARTIFACT_OWNERSHIP_LOST" | "ARTIFACT_STATE_UNKNOWN" | "ARTIFACT_STORAGE_UNAVAILABLE") { super(code); }
}
function row(value: unknown): ArtifactRecord {
  const r=value as Record<string,unknown>;
  if (!r || Object.keys(r).length!==9 || !isUuid(r.id) || !isUuid(r.user_id) || !isUuid(r.job_id) || !isUuid(r.origin_attempt) ||
    !["still","video"].includes(r.media as string) || !Number.isSafeInteger(Number(r.byte_size)) || Number(r.byte_size)<1 ||
    Number(r.byte_size)>ARTIFACT_MAX_BYTES || typeof r.sha256!=="string" || !/^[0-9a-f]{64}$/.test(r.sha256) ||
    typeof r.created_at!=="string" || !Number.isFinite(Date.parse(r.created_at)) ||
    !(r.persisted_at===null || (typeof r.persisted_at==="string" && Number.isFinite(Date.parse(r.persisted_at))))) throw new ArtifactError("ARTIFACT_STATE_UNKNOWN");
  return Object.freeze({id:r.id,userId:r.user_id,jobId:r.job_id,originAttempt:r.origin_attempt,media:r.media as "still"|"video",
    byteSize:Number(r.byte_size),sha256:r.sha256,persisted:r.persisted_at!==null});
}
export class MedicalMotionArtifactRepository {
  constructor(private readonly client:SupabaseClient) {}
  private async call(name:string,args:Record<string,unknown>):Promise<ArtifactRecord[]> {
    let response;
    try { response=await this.client.rpc(name,args); } catch { throw new ArtifactError("ARTIFACT_STATE_UNKNOWN"); }
    if(response.error) throw new ArtifactError(response.error.code==="OM403"?"ARTIFACT_OWNERSHIP_LOST":response.error.code==="OM409"?"ARTIFACT_CONFLICT":response.error.code==="22023"?"ARTIFACT_INVALID":"ARTIFACT_STATE_UNKNOWN");
    if(!Array.isArray(response.data)) throw new ArtifactError("ARTIFACT_STATE_UNKNOWN");
    return response.data.map(row);
  }
  private args(job:DurableBackgroundJob) {
    if(job.type!=="medical-motion-render" || !isUuid(job.id) || !isUuid(job.userId) || !isUuid(job.attemptToken)) throw new ArtifactError("ARTIFACT_INVALID");
    return {p_job_id:job.id,p_user_id:job.userId,p_attempt_token:job.attemptToken};
  }
  async list(job:DurableBackgroundJob) { return this.call("motion_artifact_operation",{...this.args(job),p_action:"list"}); }
  async reserve(job:DurableBackgroundJob,content:Pick<ArtifactRecord,"media"|"byteSize"|"sha256">) {
    if(!["still","video"].includes(content.media)||!Number.isSafeInteger(content.byteSize)||content.byteSize<1||content.byteSize>ARTIFACT_MAX_BYTES||!/^[0-9a-f]{64}$/.test(content.sha256)) throw new ArtifactError("ARTIFACT_INVALID");
    const rows=await this.call("motion_artifact_operation",{...this.args(job),p_action:"reserve",p_media:content.media,p_byte_size:content.byteSize,p_sha256:content.sha256});
    if(rows.length!==1 || rows[0].jobId!==job.id || rows[0].userId!==job.userId || rows[0].originAttempt!==job.attemptToken ||
      rows[0].media!==content.media || rows[0].byteSize!==content.byteSize || rows[0].sha256!==content.sha256) throw new ArtifactError("ARTIFACT_STATE_UNKNOWN");
    return rows[0];
  }
  async persist(job:DurableBackgroundJob,id:string) {
    if(!isUuid(id)) throw new ArtifactError("ARTIFACT_INVALID");
    const rows=await this.call("motion_artifact_operation",{...this.args(job),p_action:"persist",p_artifact_id:id});
    if(rows.length!==1 || rows[0].id!==id || rows[0].jobId!==job.id || rows[0].userId!==job.userId || !rows[0].persisted) throw new ArtifactError("ARTIFACT_STATE_UNKNOWN");
    return rows[0];
  }
  async published(jobId:string,userId:string) {
    if(!isUuid(jobId)||!isUuid(userId)) throw new ArtifactError("ARTIFACT_INVALID");
    const rows=await this.call("read_published_motion_artifact",{p_job_id:jobId,p_user_id:userId});
    if(rows.length>1 || rows.some(r=>r.jobId!==jobId||r.userId!==userId||!r.persisted)) throw new ArtifactError("ARTIFACT_STATE_UNKNOWN");
    return rows[0];
  }
  async resumeAwaiting(jobId:string,userId:string) {
    if(!isUuid(jobId)||!isUuid(userId)) throw new ArtifactError("ARTIFACT_INVALID");
    try { const r=await this.client.rpc("resume_motion_artifact_job",{p_job_id:jobId,p_user_id:userId});
      if(r.error||typeof r.data!=="boolean") throw new Error();return r.data;
    } catch {throw new ArtifactError("ARTIFACT_STATE_UNKNOWN");}
  }
}
