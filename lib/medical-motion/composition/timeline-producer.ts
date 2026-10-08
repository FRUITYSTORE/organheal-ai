import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PrivateArtifactStorage } from "../artifacts/storage";
import type { MedicalMotionArtifactService } from "../artifacts/service";
import { MedicalMotionExecutionContextRepository } from "../execution-context.repository";
import { prepareCompositionScene } from "./authorization";
import { inspectApprovedBase } from "./base-inspection";
import type { FfmpegRuntime } from "./ffmpeg-runtime";
import { privateHash } from "./approved-spec";
import { CompositionError } from "./specification";
import { issueTimeline, timelineFingerprint, type TimelineSegment, type TimelineTransition, type TimelinePersonalization } from "./timeline-specification";

/** Internal server policy only. No public delivery/API wiring. Full medical gates run before storage access. */
export class TrustedTimelineProducer {
  constructor(private readonly client: SupabaseClient, private readonly artifacts: MedicalMotionArtifactService,
    private readonly storage: PrivateArtifactStorage, private readonly runtime: FfmpegRuntime) {}
  async approve(owner: string, contextId: string, ordered: readonly {sceneIndex:number;baseJobId:string}[],
    transitions: readonly TimelineTransition[], specification: TimelinePersonalization, signal: AbortSignal) {
    if(!Array.isArray(ordered)||ordered.length<2||ordered.length>8) throw new CompositionError("COMPOSITION_INVALID");
    const context=await new MedicalMotionExecutionContextRepository(this.client).read(contextId,owner);
    const segments: TimelineSegment[]=[], scenes=[];
    for(let i=0;i<ordered.length;i++) {
      if(signal.aborted) throw new CompositionError("COMPOSITION_CANCELLED");
      const request=ordered[i], prepared=await prepareCompositionScene(this.client,owner,contextId,request.sceneIndex,"development");
      const profile=context.sourceProfileBindings?.scenes.find(s=>s.sceneIndex===request.sceneIndex)?.profile;
      if(!profile||prepared.presentation.scene.usage!=="internal-review"||!prepared.presentation.scene.sourceProfile)
        throw new CompositionError("COMPOSITION_INVALID");
      const base=await this.artifacts.retrieval(request.baseJobId,owner);
      if(signal.aborted) throw new CompositionError("COMPOSITION_CANCELLED");
      if(!base||base.media!=="video") throw new CompositionError("COMPOSITION_INVALID");
      const duration=await inspectApprovedBase(base,this.storage,this.runtime,signal,prepared.presentation.scene.durationHint);
      segments.push({segmentIndex:i,sceneIndex:request.sceneIndex,baseJobId:request.baseJobId,baseArtifactId:base.id,baseSha256:base.sha256,
        baseFingerprint:prepared.presentation.baseFingerprint,baseOutputFingerprint:prepared.presentation.outputFingerprint,
        renderSignature:prepared.checked.request.renderSignature,duration,sourceProfile:profile});
      scenes.push(prepared.presentation);
    }
    const duration=segments.reduce((n,s)=>n+s.duration,0), timeline=timelineFingerprint(segments,transitions);
    const identity={schemaVersion:"2" as const,producerVersion:"1" as const,compositionVersion:"2" as const,userId:owner,contextId,
      segments,transitions,duration,timelineFingerprint:timeline,approvalDisposition:"internal-composition" as const,specification,
      fingerprint:privateHash({version:"2",userId:owner,contextId,timelineFingerprint:timeline,duration,specification})};
    if(signal.aborted) throw new CompositionError("COMPOSITION_CANCELLED");
    return issueTimeline({...identity,logicalIdentity:privateHash(identity)},scenes);
  }
}
