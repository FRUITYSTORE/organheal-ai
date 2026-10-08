import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/validation/uuid";
import { CompositionError } from "./specification";
import { isIssuedTimeline, validateTimelineContent, type TimelineContent, type DurableTimeline } from "./timeline-specification";
import { jsonSnapshot } from "../validation/json-snapshot";
export class ApprovedTimelineRepository {
  constructor(private readonly client: SupabaseClient) {}
  private row(value:unknown,owner:string):DurableTimeline {
    try {
      const r=jsonSnapshot(value) as Record<string,unknown>;
      if(Object.keys(r).length!==5||!isUuid(r.id)||!isUuid(r.job_id)||r.user_id!==owner||typeof r.created_at!=="string"||!Number.isFinite(Date.parse(r.created_at))) throw Error();
      const content=validateTimelineContent(r.content);if(content.userId!==owner)throw Error();
      return Object.freeze({...content,id:r.id,jobId:r.job_id,createdAt:r.created_at});
    } catch {throw new CompositionError("COMPOSITION_INVALID");}
  }
  async approveAndSchedule(content:TimelineContent) {
    if(!isIssuedTimeline(content))throw new CompositionError("COMPOSITION_INVALID");
    const r=await this.client.rpc("approve_motion_timeline_v2",{p_user_id:content.userId,p_content:content}).then(r=>r,()=>{throw new CompositionError("COMPOSITION_PROCESS_FAILED");});
    if(r.error||!Array.isArray(r.data)||r.data.length!==1)throw new CompositionError("COMPOSITION_PROCESS_FAILED");
    return this.row(r.data[0],content.userId);
  }
  async read(id:string,owner:string) {
    if(![id,owner].every(isUuid))throw new CompositionError("COMPOSITION_INVALID");
    const r=await this.client.rpc("read_approved_motion_personalization",{p_spec_id:id,p_user_id:owner}).then(r=>r,()=>{throw new CompositionError("COMPOSITION_PROCESS_FAILED");});
    if(r.error||!Array.isArray(r.data)||r.data.length!==1)throw new CompositionError("COMPOSITION_INVALID");
    const result=this.row(r.data[0],owner);if(result.id!==id)throw new CompositionError("COMPOSITION_INVALID");return result;
  }
}
