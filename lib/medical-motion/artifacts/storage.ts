import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/validation/uuid";
import { ARTIFACT_MAX_BYTES, ArtifactError } from "./repository";

export const MEDICAL_MOTION_BUCKET="medical-motion-artifacts";
export type StoredBytes = {bytes:Buffer;contentType:string};
export type StoredMetadata = { byteSize:number; contentType:string; sha256?:string };
/** Private put-if-absent plus readback. No overwrite, URL, or delete capability. */
export interface PrivateArtifactStorage {
  read(key:string,signal?:AbortSignal):Promise<StoredBytes|undefined>;
  put(key:string,bytes:Buffer,contentType:string):Promise<void>;
  inspect?(key:string,signal?:AbortSignal):Promise<StoredMetadata|undefined>;
}
export const contentTypeFor=(media:"still"|"video")=>media==="still"?"image/png":"video/mp4";
const missing=(error:{status?:number;statusCode?:string})=>error.status===404||error.statusCode==="404";
export class SupabasePrivateArtifactStorage implements PrivateArtifactStorage {
  constructor(private readonly client:SupabaseClient) {}
  private async ensure() {
    let bucket=await this.client.storage.getBucket(MEDICAL_MOTION_BUCKET);
    if(bucket.error && missing(bucket.error)) {
      await this.client.storage.createBucket(MEDICAL_MOTION_BUCKET,{public:false,fileSizeLimit:ARTIFACT_MAX_BYTES,allowedMimeTypes:["image/png","video/mp4"]});
      bucket=await this.client.storage.getBucket(MEDICAL_MOTION_BUCKET);
    }
    if(bucket.error || !bucket.data || bucket.data.public!==false) throw new ArtifactError("ARTIFACT_STORAGE_UNAVAILABLE");
  }
  async read(key:string,signal?:AbortSignal):Promise<StoredBytes|undefined> {
    if(!isUuid(key)) throw new ArtifactError("ARTIFACT_INVALID");
    try {
      await this.ensure();const r=await this.client.storage.from(MEDICAL_MOTION_BUCKET).download(key,{}, {signal,cache:"no-store"});
      if(r.error) {if(missing(r.error)) return undefined;throw new Error();}
      if(!r.data || r.data.size<1 || r.data.size>ARTIFACT_MAX_BYTES) throw new ArtifactError("ARTIFACT_CONFLICT");
      return {bytes:Buffer.from(await r.data.arrayBuffer()),contentType:r.data.type};
    } catch(error) {throw error instanceof ArtifactError?error:new ArtifactError("ARTIFACT_STORAGE_UNAVAILABLE");}
  }
  async put(key:string,bytes:Buffer,contentType:string) {
    if(!isUuid(key)||bytes.length<1||bytes.length>ARTIFACT_MAX_BYTES||!["image/png","video/mp4"].includes(contentType)) throw new ArtifactError("ARTIFACT_INVALID");
    try {
      await this.ensure();const r=await this.client.storage.from(MEDICAL_MOTION_BUCKET).upload(key,bytes,{contentType,upsert:false,
        metadata:{sha256:createHash("sha256").update(bytes).digest("hex")}});
      if(r.error) throw new Error();
    } catch {throw new ArtifactError("ARTIFACT_STORAGE_UNAVAILABLE");}
  }
  async inspect(key:string):Promise<StoredMetadata|undefined> {
    if(!isUuid(key)) throw new ArtifactError("ARTIFACT_INVALID");
    try {
      await this.ensure();const r=await this.client.storage.from(MEDICAL_MOTION_BUCKET).info(key);
      if(r.error) {if(missing(r.error)) return undefined;throw Error();}
      if(!r.data || !Number.isSafeInteger(r.data.size) || r.data.size===undefined || r.data.size<1 || r.data.size>ARTIFACT_MAX_BYTES || typeof r.data.contentType!=="string" || !["image/png","video/mp4"].includes(r.data.contentType)) throw new ArtifactError("ARTIFACT_CONFLICT");
      const sha256=(r.data.metadata as Record<string,unknown>|undefined)?.sha256;
      if(sha256!==undefined && (typeof sha256!=="string" || !/^[a-f0-9]{64}$/.test(sha256))) throw new ArtifactError("ARTIFACT_CONFLICT");
      return {byteSize:r.data.size,contentType:r.data.contentType,...(typeof sha256==="string"?{sha256}:{})};
    } catch(error) {throw error instanceof ArtifactError?error:new ArtifactError("ARTIFACT_STORAGE_UNAVAILABLE");}
  }
}
