import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DurableBackgroundJob } from "@/lib/jobs/background-job-worker.repository";
import type { CompiledMedicalScene } from "../contracts/medical-scene";
import { canonicalSceneJson, validateCompiledMedicalScene } from "../scene-compiler";
import { readExplanationAuthorization } from "@/lib/symptom-explanation/explanation-authorization";
import { validateExplanationRenderRequest } from "../render/explanation-renderer";
import { isUuid } from "@/lib/validation/uuid";
import { ArtifactError, ARTIFACT_MAX_BYTES, type ArtifactRecord } from "./repository";
import { contentTypeFor, type PrivateArtifactStorage } from "./storage";
import { getOrganModule } from "../organ-modules";
import { WHOLE_BODY_ANATOMY } from "../whole-body-anatomy";
import type { OrganModule } from "../contracts/organ-module";
import type { WholeBodyAnatomyCatalog } from "../contracts/anatomy-foundation";
import { checkAssetReadiness } from "@/lib/symptom-explanation/asset-readiness";

export type CacheDisposition = "CACHE_HIT" | "CACHE_MISS" | "CACHE_INELIGIBLE" | "CACHE_STALE" | "CACHE_INVALID" | "CACHE_CONFLICT";
export type ReuseIdentity = Readonly<{ key:string; baseFingerprint:string; outputFingerprint:string; renderSignature:string;
  scope:"internal-review"|"patient-facing"; media:"still"|"video"; sceneDslVersion:"1"; compilerVersion:"1"; mechanismId:string; mechanismVersion:string;
  sourceProfile?: import("../contracts/source-profile").SourceProfileCacheIdentity }>;
export type ReuseEvent = Readonly<{ event:"MEDICAL_MOTION_CACHE"; disposition:CacheDisposition|"CACHE_LOOKUP"|"RENDER_CREATED"|"CONCURRENT_REUSE" }>;
type ReuseRow = { outcome:"CACHE_HIT"|"CACHE_MISS"|"CACHE_INVALID"|"CACHE_CONFLICT"; epoch:number;
  artifact_id:string|null; media:"still"|"video"|null; byte_size:number|null; sha256:string|null; persisted:boolean|null; deep_required:boolean };
const digest=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
const hash=(value:unknown)=>createHash("sha256").update(canonicalSceneJson(value)).digest("hex");
const hex=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
const active=(signal:AbortSignal)=>{if(signal.aborted) throw new ArtifactError("ARTIFACT_OWNERSHIP_LOST");};

/** Generic identity projection only, not user delivery or reuse authorization. */
export function reusableArtifactIdentity(compiled:CompiledMedicalScene,renderSignature:string,media:"still"|"video"):ReuseIdentity|null {
  if(!validateCompiledMedicalScene(compiled)||compiled.reuse.classification!=="reusable-base"||!hex(renderSignature)||
    !["still","video"].includes(media)||(media==="still")!==(compiled.scene.renderIntent==="still")||!/^[A-Za-z][A-Za-z0-9_-]{0,127}$/.test(compiled.scene.mechanismId)||
    !/^[A-Za-z0-9_.-]{1,64}$/.test(compiled.scene.mechanismVersion)) return null;
  const core={...(compiled.scene.sourceProfile ? {sourceProfile:compiled.scene.sourceProfile} : {}),baseFingerprint:compiled.baseFingerprint,outputFingerprint:compiled.outputFingerprint,renderSignature,
    scope:compiled.scene.usage,media,sceneDslVersion:compiled.scene.sceneDslVersion,compilerVersion:compiled.scene.compilerContractVersion,
    mechanismId:compiled.scene.mechanismId,mechanismVersion:compiled.scene.mechanismVersion};
  return Object.freeze({key:hash({reuseIdentityVersion:"1",...core}),...core});
}
/** Current explicit license states, not legal inference. Internal review permits
 * unresolved review only within that weaker scope; rejection always blocks reuse. */
export function cacheSourceLicenseCompatible(compiled:CompiledMedicalScene,getModule:(organ:string)=>OrganModule|null=getOrganModule,catalog:WholeBodyAnatomyCatalog=WHOLE_BODY_ANATOMY):boolean {
  if(!validateCompiledMedicalScene(compiled))return false;
  return compiled.scene.representations.every(({structureId})=>{
    const module=getModule(structureId.split(".")[0]),p=module?.anatomyRegistry.find(e=>e.id===structureId)?.provenance;
    const source=catalog.sources.find(s=>s.id===p?.sourceId&&s.sourceVersion===p?.sourceVersion),license=catalog.licenses.find(l=>l.id===p?.licenseId);
    if(!p||!source||!license||source.licenseId!==p.licenseId||p.licenseReview.status==="rejected")return false;
    return compiled.scene.usage==="internal-review"||(license.reviewStatus==="terms-reviewed"&&license.commercialCompatibility==="permitted-with-obligations"&&p.licenseReview.status==="cleared"&&p.licenseReview.evidenceRefs.some(r=>r.trim()));
  });
}
/** Cache is stricter than illustrative development rendering: unverified anatomy
 * never becomes a shared base, including in internal-review scope. */
export function cacheAnatomyVerified(compiled:CompiledMedicalScene,getModule:(organ:string)=>OrganModule|null=getOrganModule,catalog:WholeBodyAnatomyCatalog=WHOLE_BODY_ANATOMY):boolean {
  if(!validateCompiledMedicalScene(compiled))return false;
  return compiled.scene.organIds.every(organ=>{
    const ids=compiled.scene.representations.filter(r=>r.structureId.startsWith(`${organ}.`)).map(r=>r.structureId);
    const requirements=Object.fromEntries(ids.map(id=>[id,{...compiled.scene.requiredStructures[id],requireVerified:true}]));
    return checkAssetReadiness(organ,ids,compiled.scene.usage==="patient-facing"?"production":"development",getModule,requirements,catalog).ok;
  });
}
export class ReusableArtifactRepository {
  constructor(private readonly client:SupabaseClient) {}
  async operation(job:DurableBackgroundJob,action:"reserve"|"ready"|"link"|"invalidate"|"discard"|"verified",identity:ReuseIdentity,epoch?:number,artifactId?:string):Promise<ReuseRow> {
    if(job.type!=="medical-motion-render"||![job.id,job.userId,job.attemptToken].every(isUuid)||!hex(identity.key)) throw new ArtifactError("ARTIFACT_INVALID");
    let r;
    try {r=await this.client.rpc("motion_reuse_operation",{p_job_id:job.id,p_user_id:job.userId,p_attempt_token:job.attemptToken,
      p_action:action,p_identity:identity,p_epoch:epoch??null,p_artifact_id:artifactId??null});} catch {throw new ArtifactError("ARTIFACT_STATE_UNKNOWN");}
    if(r.error) throw new ArtifactError(r.error.code==="OM403"?"ARTIFACT_OWNERSHIP_LOST":r.error.code==="OM409"?"ARTIFACT_CONFLICT":r.error.code==="22023"?"ARTIFACT_INVALID":"ARTIFACT_STATE_UNKNOWN");
    if(!Array.isArray(r.data)||r.data.length!==1) throw new ArtifactError("ARTIFACT_STATE_UNKNOWN");
    const row=r.data[0] as ReuseRow;
    if(!row||Object.keys(row).length!==8||!["CACHE_HIT","CACHE_MISS","CACHE_INVALID","CACHE_CONFLICT"].includes(row.outcome)||
      !Number.isSafeInteger(Number(row.epoch))||Number(row.epoch)<1||typeof row.deep_required!=="boolean"||
      (row.artifact_id===null ? [row.media,row.byte_size,row.sha256,row.persisted].some(v=>v!==null) :
        !isUuid(row.artifact_id)||!["still","video"].includes(row.media!)||!hex(row.sha256)||typeof row.persisted!=="boolean"||
        !Number.isSafeInteger(Number(row.byte_size))||Number(row.byte_size)<1||Number(row.byte_size)>ARTIFACT_MAX_BYTES)) throw new ArtifactError("ARTIFACT_STATE_UNKNOWN");
    if(row.outcome==="CACHE_HIT"&&(!row.artifact_id||!row.persisted)) throw new ArtifactError("ARTIFACT_STATE_UNKNOWN");
    return {...row,epoch:Number(row.epoch),byte_size:row.byte_size===null?null:Number(row.byte_size)};
  }
}
type Reservation = { jobId:string; attemptToken:string; authorization:object; identity:ReuseIdentity; epoch:number };
export type ReuseLookup = { disposition:CacheDisposition; artifact?:Pick<ArtifactRecord,"id">; reservation?:object };
/** No in-memory coordination. Reservations are database-fenced; WeakMap protects
 * only the local completion capability from copied/AI-authored claims. */
export class ReusableArtifactCache {
  private readonly reservations=new WeakMap<object,Reservation>();
  private readonly counts:Partial<Record<ReuseEvent["disposition"],number>>={};
  constructor(private readonly repository:ReusableArtifactRepository,private readonly storage:PrivateArtifactStorage,
    private readonly observe:(event:ReuseEvent)=>void=()=>{}) {}
  get metrics() {return Object.freeze({...this.counts});}
  private event(disposition:ReuseEvent["disposition"]) {
    this.counts[disposition]=(this.counts[disposition]??0)+1;
    try {this.observe(Object.freeze({event:"MEDICAL_MOTION_CACHE",disposition}));} catch { /* telemetry never grants authority */ }
  }
  private identity(job:DurableBackgroundJob,authorization:unknown):ReuseIdentity|null {
    const issued=readExplanationAuthorization(authorization);
    if(!issued||issued.options.clinicalContextId!==(job.payload as {executionContextId?:string})?.executionContextId) return null;
    const checked=validateExplanationRenderRequest(authorization,issued.options.outputPath,{mode:issued.options.mode,timeoutMs:issued.options.timeoutMs});
    return "ok" in checked&&checked.request.medicalScene&&cacheSourceLicenseCompatible(checked.request.medicalScene) ? reusableArtifactIdentity(checked.request.medicalScene,checked.request.renderSignature,checked.request.scene.output.media) : null;
  }
  private current(job:DurableBackgroundJob,authorization:object,identity:ReuseIdentity) {
    if(this.identity(job,authorization)?.key!==identity.key||!this.verified(authorization)) {this.event("CACHE_STALE");throw new ArtifactError("ARTIFACT_INVALID");}
  }
  private verified(authorization:object):boolean {
    const issued=readExplanationAuthorization(authorization);if(!issued)return false;
    const checked=validateExplanationRenderRequest(authorization,issued.options.outputPath,{mode:issued.options.mode,timeoutMs:issued.options.timeoutMs});
    return "ok" in checked&&!!checked.request.medicalScene&&cacheAnatomyVerified(checked.request.medicalScene);
  }
  private async integrity(row:Pick<ReuseRow,"artifact_id"|"media"|"byte_size"|"sha256"|"deep_required">,signal:AbortSignal):Promise<boolean> {
    active(signal);let deadline:ReturnType<typeof setTimeout>|undefined;
    const controller=new AbortController();let cancel=()=>{};
    const abort=()=>{controller.abort();cancel();};signal.addEventListener("abort",abort,{once:true});
    try {return await Promise.race([
      (async()=>{
        const metadata=this.storage.inspect?await this.storage.inspect(row.artifact_id!,controller.signal):undefined;active(signal);
        if(controller.signal.aborted)throw new ArtifactError("ARTIFACT_STORAGE_UNAVAILABLE");
        if(this.storage.inspect&&!metadata) return false;
        if(metadata&&(metadata.contentType!==contentTypeFor(row.media!)||metadata.byteSize!==row.byte_size||metadata.sha256!==undefined&&metadata.sha256!==row.sha256)) return false;
        if(metadata?.sha256&&!row.deep_required) return true;
        const stored=await this.storage.read(row.artifact_id!,controller.signal);active(signal);
        return !!stored&&stored.bytes.length<=ARTIFACT_MAX_BYTES&&stored.contentType===contentTypeFor(row.media!)&&stored.bytes.length===row.byte_size&&digest(stored.bytes)===row.sha256;
      })(),
      new Promise<never>((_,reject)=>{cancel=()=>reject(new ArtifactError("ARTIFACT_OWNERSHIP_LOST"));if(signal.aborted)cancel();}),
      new Promise<never>((_,reject)=>{deadline=setTimeout(()=>{controller.abort();reject(new ArtifactError("ARTIFACT_STORAGE_UNAVAILABLE"));},10000);}),
    ]);} catch(error) {if(signal.aborted) throw new ArtifactError("ARTIFACT_OWNERSHIP_LOST");if(error instanceof ArtifactError&&error.code==="ARTIFACT_CONFLICT")return false;throw error instanceof ArtifactError?error:new ArtifactError("ARTIFACT_STORAGE_UNAVAILABLE");}
    finally {if(deadline)clearTimeout(deadline);signal.removeEventListener("abort",abort);}
  }
  async lookup(job:DurableBackgroundJob,authorization:object,signal:AbortSignal):Promise<ReuseLookup> {
    active(signal);this.event("CACHE_LOOKUP");const identity=this.identity(job,authorization);
    if(!identity) {const disposition=readExplanationAuthorization(authorization)?"CACHE_STALE":"CACHE_INELIGIBLE";this.event(disposition);return {disposition};}
    if(!this.verified(authorization)) {this.event("CACHE_INELIGIBLE");return {disposition:"CACHE_INELIGIBLE"};}
    const row=await this.repository.operation(job,"reserve",identity);active(signal);
    if(row.outcome==="CACHE_CONFLICT") {this.event("CONCURRENT_REUSE");this.event("CACHE_CONFLICT");return {disposition:"CACHE_CONFLICT"};}
    if(row.artifact_id) {
      if(row.media!==identity.media||!await this.integrity(row,signal)) {
        if(row.outcome==="CACHE_HIT") {
          await this.repository.operation(job,"invalidate",identity,row.epoch,row.artifact_id);
          this.event("CACHE_INVALID");return {disposition:"CACHE_INVALID"};
        }
        await this.repository.operation(job,"discard",identity,row.epoch);
      } else {
        this.current(job,authorization,identity);active(signal);
        if(row.outcome==="CACHE_HIT"&&row.deep_required) await this.repository.operation(job,"verified",identity,row.epoch,row.artifact_id);
        const ready=await this.repository.operation(job,row.outcome==="CACHE_HIT"?"link":"ready",identity,row.epoch,row.artifact_id);
        active(signal);if(row.outcome==="CACHE_MISS")this.event("CONCURRENT_REUSE");this.event("CACHE_HIT");return {disposition:"CACHE_HIT",artifact:{id:ready.artifact_id!}};
      }
    }
    const reservation=Object.freeze(Object.create(null)) as object;
    this.reservations.set(reservation,{jobId:job.id,attemptToken:job.attemptToken,authorization,identity,epoch:row.epoch});
    this.event("CACHE_MISS");return {disposition:"CACHE_MISS",reservation};
  }
  async created(job:DurableBackgroundJob,reservation:object,artifact:ArtifactRecord,signal:AbortSignal):Promise<void> {
    active(signal);const proof=this.reservations.get(reservation);
    if(!proof||proof.jobId!==job.id||proof.attemptToken!==job.attemptToken||artifact.jobId!==job.id||artifact.userId!==job.userId||artifact.originAttempt!==job.attemptToken||!artifact.persisted||artifact.media!==proof.identity.media) throw new ArtifactError("ARTIFACT_INVALID");
    this.current(job,proof.authorization,proof.identity);
    if(!await this.integrity({artifact_id:artifact.id,media:artifact.media,byte_size:artifact.byteSize,sha256:artifact.sha256,deep_required:true},signal)) throw new ArtifactError("ARTIFACT_CONFLICT");
    this.current(job,proof.authorization,proof.identity);active(signal);
    await this.repository.operation(job,"ready",proof.identity,proof.epoch,artifact.id);
    active(signal);this.event("RENDER_CREATED");
  }
  /** Revalidate immediately before fenced publication, including a late revocation. */
  assertCurrent(job:DurableBackgroundJob,authorization:object) {
    if(!this.identity(job,authorization)||!this.verified(authorization)) {this.event("CACHE_STALE");throw new ArtifactError("ARTIFACT_INVALID");}
  }
}
