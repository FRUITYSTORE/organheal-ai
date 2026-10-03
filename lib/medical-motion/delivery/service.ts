import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DeliveryRepository } from "./repository";
import { deliveryInput, DeliveryError, type DeliveryInput, type DeliverySnapshot, type ProductDeliveryRequest, type DeliveryDescriptor } from "./contracts";
import { prepareCompositionScene } from "../composition/authorization";
import { ApprovedPersonalizationRepository } from "../composition/approved-spec.repository";
import type { TrustedPersonalizationProducer } from "../composition/producer";
import type { MedicalMotionArtifactService } from "../artifacts/service";
import { resolveOutputDimensions } from "../render/dimension-policy";
import { CompositionError } from "../composition/specification";
import { MEDICAL_MOTION_BUCKET } from "../artifacts/storage";
import { ExecutionContextError } from "../execution-context.repository";
const medicallyUnavailable = (e: unknown) => e instanceof CompositionError && e.code === "COMPOSITION_INVALID" ||
  e instanceof ExecutionContextError && e.code === "CONTEXT_VERSION_UNAVAILABLE";
export type ProductUseAuthorization = (owner: string, input: DeliveryInput) => Promise<boolean>;
/** Single server eligibility hook. Entitlements/credits can replace this policy later. */
export const authorizeProductUse: ProductUseAuthorization = async () => true;
export type DeliveryUsage = Readonly<{ outputProfile: DeliveryInput["aspectRatio"]; durationBand: "short" | "medium" | "long" | "unknown";
  baseRenderNeeded: boolean | null; baseCacheHit: boolean | null; compositionNeeded: boolean; compositionReused: boolean }>;
export class MedicalMotionDeliveryService {
  readonly repository: DeliveryRepository;
  constructor(private readonly client: SupabaseClient, private readonly artifacts: MedicalMotionArtifactService,
    private readonly mode: "production" | "development", private readonly producer?: TrustedPersonalizationProducer,
    private readonly eligibility: ProductUseAuthorization = authorizeProductUse,
    private readonly usage: (v: DeliveryUsage) => void = () => {}) { this.repository = new DeliveryRepository(client); }
  private async gate(owner: string, context: string, scene: number) { await prepareCompositionScene(this.client,owner,context,scene,this.mode); }
  async create(owner: string, value: unknown): Promise<ProductDeliveryRequest> {
    const input = deliveryInput(value);
    if (!await this.eligibility(owner,input)) throw new DeliveryError("product-use-not-allowed");
    const source = await this.repository.source(owner,input); let eligible = true;
    try { await this.gate(owner,source.contextId,input.sceneIndex); }
    catch (e) { if (medicallyUnavailable(e)) eligible = false; else throw new DeliveryError("temporarily-unavailable"); }
    const row = await this.repository.create(owner,input,eligible);
    try { this.usage(Object.freeze({ outputProfile: input.aspectRatio, durationBand: "unknown", baseCacheHit: row.baseCacheHit,
      baseRenderNeeded: row.baseCacheHit === null ? null : !row.baseCacheHit,
      compositionNeeded: row.specId === null && eligible, compositionReused: row.specId !== null })); } catch { /* telemetry grants no authority */ }
    if (!eligible) return {requestId:row.id,status:"failed",stage:"unavailable",createdAt:row.createdAt,updatedAt:row.updatedAt,
      retryable:false,pollAfterSeconds:null,failureCode:"medical-visualization-not-available"};
    return this.project(row);
  }
  private async descriptor(row: DeliverySnapshot): Promise<DeliveryDescriptor> {
    if (!row.specId) throw new DeliveryError("temporarily-unavailable");
    const spec = await new ApprovedPersonalizationRepository(this.client).read(row.specId,row.userId);
    // Status/history use fenced registry metadata, never download video bytes.
    const artifact = await this.artifacts.repository.published(spec.jobId,row.userId);
    const size = resolveOutputDimensions(row.aspectRatio,"720p");
    if (!artifact || artifact.media !== "video" || !size.ok) throw new DeliveryError("temporarily-unavailable");
    return { artifactId: artifact.id, mediaType: "video/mp4", duration: spec.duration, dimensions: size.dimensions, language: row.language, createdAt: spec.createdAt };
  }
  private async project(row: DeliverySnapshot): Promise<ProductDeliveryRequest> {
    if (row.status === "ready") {
      try { await this.gate(row.userId,row.contextId,row.sceneIndex); }
      catch(e) { if (!medicallyUnavailable(e)) throw new DeliveryError("temporarily-unavailable");
        return {requestId:row.id,status:"failed",stage:"unavailable",createdAt:row.createdAt,updatedAt:row.updatedAt,
          retryable:false,pollAfterSeconds:null,failureCode:"source-no-longer-eligible"}; }
    }
    const terminal = ["ready","failed","cancelled"].includes(row.status);
    return { requestId: row.id, status: row.status, stage: row.stage, createdAt: row.createdAt, updatedAt: row.updatedAt,
      retryable: false, pollAfterSeconds: terminal ? null : 5, failureCode: row.status === "failed" ? row.failureCode ?? "unable-to-create-video" : null,
      ...(row.status === "ready" ? { artifact: await this.descriptor(row) } : {}) };
  }
  async status(owner: string,id: string) { return this.project(await this.repository.read(owner,id)); }
  async cancel(owner: string,id: string) { return this.project(await this.repository.cancel(owner,id)); }
  async history(owner: string,offset = 0) { const rows = await this.repository.list(owner,offset); return { requests: await Promise.all(rows.map(r=>this.project(r))), nextOffset: rows.length === 20 && offset + 20 <= 1000 ? offset + 20 : null }; }
  /** Long-lived worker hook only. No Blender/FFmpeg or source reads in status polling. */
  async advancePending(signal: AbortSignal) {
    if (!this.producer) throw new DeliveryError("temporarily-unavailable");
    for (const row of await this.repository.pending()) {
      if (signal.aborted) return;
      try {
        await this.gate(row.userId,row.contextId,row.sceneIndex);
        const base = await this.artifacts.retrieval(row.baseJobId,row.userId); if (!base) continue;
        const spec = await this.producer.approve(row.userId,row.contextId,row.sceneIndex,row.baseJobId,base,row.language,
          {aspectRatio:row.aspectRatio,resolution:"720p",policy:"fit"},signal);
        if (!signal.aborted) {
          await this.repository.approve(row.userId,row.id,spec);
          try { this.usage(Object.freeze({outputProfile:row.aspectRatio,baseCacheHit:row.baseCacheHit,
            baseRenderNeeded:row.baseCacheHit===null?null:!row.baseCacheHit,compositionNeeded:true,compositionReused:false,
            durationBand:spec.duration<=10?"short":spec.duration<=30?"medium":"long"})); } catch { /* metrics only */ }
        }
      } catch(e) {
        if (signal.aborted) return;
        if (medicallyUnavailable(e)) await this.repository.ineligible(row.userId,row.id);
        // Transport failures retain durable pending work for the existing bounded host cadence.
      }
    }
  }
  async access(owner: string,id: string) {
    const row = await this.repository.read(owner,id);
    if (row.status !== "ready") throw new DeliveryError("not-ready");
    try { await this.gate(owner,row.contextId,row.sceneIndex); }
    catch { throw new DeliveryError("not-ready"); }
    const artifact = await this.descriptor(row);
    try {
      const bucket = await this.client.storage.getBucket(MEDICAL_MOTION_BUCKET);
      if (bucket.error || bucket.data?.public !== false) throw Error();
      const r = await this.client.storage.from(MEDICAL_MOTION_BUCKET).createSignedUrl(artifact.artifactId,60);
      if (r.error || !r.data?.signedUrl) throw Error();
      const url = new URL(r.data.signedUrl), origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
      if (url.protocol !== "https:" || url.origin !== origin.origin || url.username || url.password || url.hash ||
        url.pathname !== `/storage/v1/object/sign/${MEDICAL_MOTION_BUCKET}/${artifact.artifactId}`) throw Error();
      return { artifact, url: r.data.signedUrl, expiresAt: new Date(Date.now()+60_000).toISOString(), expiresInSeconds: 60 };
    } catch { throw new DeliveryError("temporarily-unavailable"); }
  }
}
