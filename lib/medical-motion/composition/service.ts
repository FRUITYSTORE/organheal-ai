import "server-only";
import { createHash } from "node:crypto";
import { open, lstat } from "node:fs/promises";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DurableBackgroundJob } from "@/lib/jobs/background-job-worker.repository";
import { MedicalMotionExecutionContextRepository } from "../execution-context.repository";
import { validateMedicalMotionJobPayload } from "../job.repository";
import { prepareExplanationAuthorization, readExplanationAuthorization } from "@/lib/symptom-explanation/explanation-authorization";
import { validateExplanationRenderRequest } from "../render/explanation-renderer";
import { MedicalMotionArtifactService } from "../artifacts/service";
import { ARTIFACT_MAX_BYTES, ArtifactError } from "../artifacts/repository";
import type { PrivateArtifactStorage } from "../artifacts/storage";
import { validatePersonalization, CompositionError } from "./specification";
import { composePersonalizedMedia, type AudioResolver, type CompositionEvent } from "./compositor";
import type { FfmpegRuntime } from "./ffmpeg-runtime";
import { compileMedicalScene, DEFAULT_SCENE_PRESENTATION } from "../scene-compiler";
import type { OverlayKind } from "../contracts/medical-scene";
import { MEDICAL_MECHANISMS } from "../mechanism-definitions";
import { getOrganModule } from "../organ-modules";
import { WHOLE_BODY_ANATOMY } from "../whole-body-anatomy";

/** Explicit trusted server composition operation, not a public route or shared-cache producer.
 * Caller runs this inside ExecutionOwnership.run and publishes via that same fenced ownership.
 * A separate claimed final job is mandatory: base job/artifact are never overwritten. */
export class MedicalMotionCompositionService {
  constructor(private readonly client: SupabaseClient, private readonly artifacts: MedicalMotionArtifactService,
    private readonly storage: PrivateArtifactStorage, private readonly runtime: FfmpegRuntime,
    private readonly mode: "production" | "development", private readonly audio?: AudioResolver,
    private readonly observe: (event: CompositionEvent) => void = () => {},
    /** Trusted server presentation policy, never read from the spec or job payload. */
    private readonly approvedSlots: readonly OverlayKind[] = DEFAULT_SCENE_PRESENTATION.overlayKinds) {}

  async assertCurrent(job: DurableBackgroundJob, baseJobId: string, specification: unknown,
    expected: { artifactId: string; fingerprint: string }, signal: AbortSignal): Promise<void> {
    // The recorded intent takes the recovery branch, never FFmpeg. Re-run the
    // medical gate, base identity/generation, private fingerprint and readback.
    const current = await this.compose(job, baseJobId, specification, signal);
    if (current.artifact.id !== expected.artifactId || current.fingerprint !== expected.fingerprint)
      throw new ArtifactError("ARTIFACT_CONFLICT");
  }

  async compose(job: DurableBackgroundJob, baseJobId: string, specification: unknown, signal: AbortSignal) {
    const payload = validateMedicalMotionJobPayload(job.payload);
    if (job.type !== "medical-motion-render" || job.status !== "running" || job.id === baseJobId) throw new CompositionError("COMPOSITION_INVALID");
    const contexts = new MedicalMotionExecutionContextRepository(this.client);
    const context = await contexts.read(payload.executionContextId, job.userId);
    const input = await contexts.reconstruct(context.id, job.userId, payload.sceneIndex);
    // The complete current clinical/anatomy gate precedes any artifact access. AI prose is never authority.
    const prepared = prepareExplanationAuthorization({ clinical: input.clinical, plan: input.plan, sceneIndex: input.sceneIndex },
      { clinicalContextId: context.id, assetVersion: context.assetVersion, mode: this.mode, outputPath: "render.mp4" });
    if (!("ok" in prepared)) throw new CompositionError("COMPOSITION_INVALID");
    const checked = validateExplanationRenderRequest(prepared.authorization, "render.mp4", { mode: this.mode });
    if (!("ok" in checked) || !checked.request.medicalScene) throw new CompositionError("COMPOSITION_INVALID");
    const issued = readExplanationAuthorization(prepared.authorization)!;
    const original = checked.request.medicalScene;
    const presentation = compileMedicalScene(checked.request.scene.mechanismIdentity, {
      ...issued.compilationContext, registry: MEDICAL_MECHANISMS, getModule: getOrganModule, catalog: WHOLE_BODY_ANATOMY,
      selections: checked.request.scene.highlight.structures, additionalRequirements: checked.request.scene.anatomyRequirements,
      overview: original.scene.cameraIntent.kind === "organ-overview",
    }, { ...DEFAULT_SCENE_PRESENTATION, renderIntent: original.scene.renderIntent, durationHint: original.scene.durationHint,
      outputProfile: original.scene.outputProfile, overlayKinds: this.approvedSlots });
    // Overlay declarations are presentation authority, not a change to medical
    // geometry, motion, camera or physical base identity. Never derive them from AI input.
    if (!presentation.ok || presentation.compiled.baseFingerprint !== original.baseFingerprint ||
      presentation.compiled.outputFingerprint !== original.outputFingerprint) throw new CompositionError("COMPOSITION_INVALID");
    if (signal.aborted) throw new CompositionError("COMPOSITION_CANCELLED");
    const base = await this.artifacts.retrieval(baseJobId, job.userId);
    if (!base) throw new CompositionError("COMPOSITION_INVALID");
    let baseCheck;
    try { baseCheck = await this.client.rpc("check_motion_composition_base", { p_job_id: job.id, p_user_id: job.userId,
      p_attempt_token: job.attemptToken, p_base_job_id: baseJobId, p_base_artifact_id: base.id,
      p_base_fingerprint: checked.request.medicalScene.baseFingerprint,
      p_output_fingerprint: checked.request.medicalScene.outputFingerprint, p_render_signature: checked.request.renderSignature }); }
    catch { throw new ArtifactError("ARTIFACT_STATE_UNKNOWN"); }
    if (baseCheck.error || baseCheck.data !== true) throw new CompositionError("COMPOSITION_INVALID");
    const stored = await this.storage.read(base.id, signal);
    if (!stored || stored.contentType !== (base.media === "video" ? "video/mp4" : "image/png")) throw new CompositionError("COMPOSITION_INVALID");
    const capability = validatePersonalization(specification, presentation.compiled,
      { userId: job.userId, contextId: context.id, baseSha256: base.sha256, duration: checked.request.medicalScene.scene.durationHint });
    let intent;
    try { intent = await this.client.rpc("read_motion_composition_intent", { p_job_id: job.id, p_user_id: job.userId,
      p_attempt_token: job.attemptToken, p_fingerprint: capability.fingerprint }); }
    catch { throw new ArtifactError("ARTIFACT_STATE_UNKNOWN"); }
    if (intent.error) throw new ArtifactError(intent.error.code === "OM403" ? "ARTIFACT_OWNERSHIP_LOST" : "ARTIFACT_CONFLICT");
    let pendingIntent: string | undefined;
    if (intent.data !== null) {
      const recovered = await this.artifacts.reconcile(job, signal);
      if (recovered) {
        if (recovered.id !== intent.data) throw new ArtifactError("ARTIFACT_CONFLICT");
        return Object.freeze({ artifact: recovered, fingerprint: capability.fingerprint, disposition: "private-composed" as const });
      }
      pendingIntent = intent.data;
    }
    // Persisted provenance RPC also binds this compiler base identity to the authorized current cache generation.
    const candidate = await composePersonalizedMedia(this.runtime, capability, { record: base, bytes: stored.bytes },
      { jobId: job.id, userId: job.userId, attemptToken: job.attemptToken }, signal, this.audio, this.observe);
    let ambiguous = false;
    try {
      if (pendingIntent) {
        const final = await this.artifacts.handoff(job, candidate, signal, pendingIntent);
        return Object.freeze({ artifact: final, fingerprint: capability.fingerprint, disposition: "private-composed" as const });
      }
      const stat = await lstat(candidate.localPath);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > ARTIFACT_MAX_BYTES) throw new CompositionError("COMPOSITION_OUTPUT_INVALID");
      const bytes = Buffer.alloc(stat.size), file = await open(candidate.localPath, "r");
      try {
        let offset = 0;
        while (offset < bytes.length) {
          const read = await file.read(bytes, offset, bytes.length - offset, offset);
          if (!read.bytesRead) throw new CompositionError("COMPOSITION_OUTPUT_INVALID"); offset += read.bytesRead;
        }
        if ((await file.read(Buffer.alloc(1), 0, 1, bytes.length)).bytesRead) throw new CompositionError("COMPOSITION_OUTPUT_INVALID");
      } finally { await file.close(); }
      const reservation = await this.artifacts.repository.reserve(job, { media: "video", byteSize: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex") });
      const spec = capability.specification;
      let response;
      try { response = await this.client.rpc("motion_composition_provenance", {
        p_job_id: job.id, p_user_id: job.userId, p_attempt_token: job.attemptToken, p_artifact_id: reservation.id,
        p_base_job_id: baseJobId, p_base_artifact_id: base.id, p_context_id: context.id,
        p_provenance: { compositionVersion: "1", fingerprint: capability.fingerprint, baseSha256: base.sha256,
          overlaySpecFingerprint: capability.overlaySpecFingerprint,
          baseFingerprint: checked.request.medicalScene.baseFingerprint, outputProfile: spec.outputProfile.aspectRatio,
          baseOutputFingerprint: checked.request.medicalScene.outputFingerprint, baseRenderSignature: checked.request.renderSignature,
          language: spec.language, audioComponents: [...spec.audioSegments, ...spec.dynamicNarrationSlots]
            .map(v => ({ id: v.segment.audioArtifactId, version: v.segment.version })), disposition: "private-composed" },
      }); } catch { throw new ArtifactError("ARTIFACT_STATE_UNKNOWN"); }
      if (response.error || response.data !== true) throw new ArtifactError(response.error?.code === "OM403" ? "ARTIFACT_OWNERSHIP_LOST" : "ARTIFACT_CONFLICT");
      const final = await this.artifacts.handoff(job, candidate, signal);
      return Object.freeze({ artifact: final, fingerprint: capability.fingerprint, disposition: "private-composed" as const });
    } catch (error) {
      ambiguous = error instanceof ArtifactError && ["ARTIFACT_STATE_UNKNOWN", "ARTIFACT_STORAGE_UNAVAILABLE"].includes(error.code);
      throw error;
    } finally { if (!ambiguous) await candidate.discard(); }
  }
}
