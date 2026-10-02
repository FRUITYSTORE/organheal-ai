import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/validation/uuid";
import { ARTIFACT_MAX_BYTES, ArtifactError } from "./repository";

export const MEDICAL_MOTION_BUCKET="medical-motion-artifacts";
export type StoredBytes = {bytes:Buffer;contentType:string};
/** Private put-if-absent plus readback. No overwrite, URL, or delete capability. */
export interface PrivateArtifactStorage {
  read(key:string,signal?:AbortSignal):Promise<StoredBytes|undefined>;
  put(key:string,bytes:Buffer,contentType:string):Promise<void>;
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
      await this.ensure();const r=await this.client.storage.from(MEDICAL_MOTION_BUCKET).upload(key,bytes,{contentType,upsert:false});
      if(r.error) throw new Error();
    } catch {throw new ArtifactError("ARTIFACT_STORAGE_UNAVAILABLE");}
  }
}
