import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HealthIntelligenceContext } from "@/lib/health-intelligence/context/health-intelligence-context";
import type { CompositionLanguage, CompositionProfile, PersonalizationSpecification } from "../contracts/personalization";
import type { ArtifactRecord } from "../artifacts/repository";
import { prepareCompositionScene } from "./authorization";
import { validatePersonalization, CompositionError } from "./specification";
import { issueApprovedSpec, privateHash, type ApprovedSpecContent } from "./approved-spec";
import { isUuid } from "@/lib/validation/uuid";
import { jsonSnapshot } from "../validation/json-snapshot";
import type { PrivateArtifactStorage } from "../artifacts/storage";
import type { FfmpegRuntime } from "./ffmpeg-runtime";
import { inspectApprovedBase } from "./base-inspection";

/** Inject a trusted owner-scoped Health Intelligence repository/service, never a request body or LLM. */
export type TrustedHealthContextLoader = (owner: string, signal: AbortSignal) => Promise<HealthIntelligenceContext>;
export class TrustedPersonalizationProducer {
  constructor(private readonly client: SupabaseClient, private readonly load: TrustedHealthContextLoader,
    private readonly mode: "production" | "development", private readonly storage: PrivateArtifactStorage,
    private readonly runtime: FfmpegRuntime) {}
  async approve(owner: string, contextId: string, sceneIndex: number, baseJobId: string, base: ArtifactRecord,
    language: CompositionLanguage, profile: CompositionProfile, signal: AbortSignal): Promise<ApprovedSpecContent> {
    // Medical readiness precedes structured source access; no source can overrule it.
    const { checked, presentation } = await prepareCompositionScene(this.client, owner, contextId, sceneIndex, this.mode);
    if (signal.aborted) throw new CompositionError("COMPOSITION_CANCELLED");
    let health: HealthIntelligenceContext;
    try { health = await this.load(owner, signal); }
    catch { throw new CompositionError("COMPOSITION_PROCESS_FAILED"); }
    if (health.userId !== owner || !health.latestCheckIn) throw new CompositionError("COMPOSITION_INVALID");
    // Snapshot only approved fields; ignore notes, prose, filenames, model summaries and diagnoses.
    const checkIn = jsonSnapshot({ id: health.latestCheckIn.id, wellnessScore: health.latestCheckIn.wellnessScore,
      createdAt: health.latestCheckIn.createdAt }) as { id: string; wellnessScore: number; createdAt: string };
    if (!isUuid(checkIn.id) || !Number.isFinite(checkIn.wellnessScore) || checkIn.wellnessScore < 0 || checkIn.wellnessScore > 100 ||
      !Number.isFinite(Date.parse(checkIn.createdAt)) || !base.persisted || base.userId !== owner || base.jobId !== baseJobId ||
      base.media !== (presentation.scene.renderIntent === "still" ? "still" : "video"))
      throw new CompositionError("COMPOSITION_INVALID");
    const duration = await inspectApprovedBase(base, this.storage, this.runtime, signal, presentation.scene.durationHint);
    const specification: PersonalizationSpecification = { compositionVersion: "1", baseArtifactId: base.id,
      outputProfile: profile, language, baseAudio: "preserve", textOverlays: [{ slot: "subtitle", start: 0, end: duration,
        text: language === "ar" ? "درجة العافية المسجلة" : "Recorded wellness" }],
      numericOverlays: [{ slot: "text-value", start: 0, end: duration, value: checkIn.wellnessScore, unit: "%" }],
      chartOverlays: [], audioSegments: [], dynamicNarrationSlots: [] };
    const validated = validatePersonalization(specification, presentation, { userId: owner, contextId, baseSha256: base.sha256, duration });
    const identity = { schemaVersion: "1" as const, producerVersion: "1" as const, compositionVersion: "1" as const,
      userId: owner, contextId, sceneIndex, baseJobId, baseArtifactId: base.id, baseFingerprint: presentation.baseFingerprint,
      baseOutputFingerprint: presentation.outputFingerprint, renderSignature: checked.request.renderSignature, baseSha256: base.sha256,
      duration, fingerprint: validated.fingerprint, approvalDisposition: "structured-source" as const,
      source: { kind: "health-check-in" as const, id: checkIn.id, field: "wellnessScore" as const, fingerprint: privateHash(checkIn) },
      specification: validated.specification };
    if (signal.aborted) throw new CompositionError("COMPOSITION_CANCELLED");
    return issueApprovedSpec({ ...identity, logicalIdentity: privateHash(identity) });
  }
}
