import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MedicalMotionJobRepository } from "../job.repository";
import type { MedicalMotionArtifactService } from "../artifacts/service";
import type { CompositionLanguage, CompositionProfile } from "../contracts/personalization";
import { prepareCompositionScene } from "./authorization";
import type { TrustedPersonalizationProducer } from "./producer";
import { ApprovedPersonalizationRepository } from "./approved-spec.repository";
import { CompositionError } from "./specification";
/** Non-executing trusted orchestration. Requests queue base work; only the explicit
 * heavy worker renders or composes. Call again with the same revision when base is published. */
export class PersonalizationSchedulingService {
  constructor(private readonly client: SupabaseClient, private readonly artifacts: MedicalMotionArtifactService,
    private readonly producer: TrustedPersonalizationProducer, private readonly mode: "production" | "development") {}
  async schedule(owner: string, revisionId: string, executionContent: unknown, sceneIndex: number,
    language: CompositionLanguage, profile: CompositionProfile, signal: AbortSignal) {
    if (signal.aborted) throw new CompositionError("COMPOSITION_CANCELLED");
    const baseWork = await new MedicalMotionJobRepository(this.client).enqueue(owner, revisionId, executionContent, sceneIndex);
    await prepareCompositionScene(this.client, owner, baseWork.executionContextId, sceneIndex, this.mode);
    const base = await this.artifacts.retrieval(baseWork.jobId, owner);
    if (!base) return Object.freeze({ disposition: "awaiting-base" as const, baseJobId: baseWork.jobId });
    const approved = await this.producer.approve(owner, baseWork.executionContextId, sceneIndex, baseWork.jobId, base, language, profile, signal);
    if (signal.aborted) throw new CompositionError("COMPOSITION_CANCELLED");
    const durable = await new ApprovedPersonalizationRepository(this.client).approveAndSchedule(approved);
    return Object.freeze({ disposition: "scheduled" as const, baseJobId: baseWork.jobId,
      approvedPersonalizationSpecId: durable.id, jobId: durable.jobId });
  }
}
