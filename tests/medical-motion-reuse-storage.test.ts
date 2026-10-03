import { createHash,randomUUID } from "node:crypto";
import { describe,expect,it,vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabasePrivateArtifactStorage,MEDICAL_MOTION_BUCKET } from "../lib/medical-motion/artifacts/storage";
import { ARTIFACT_MAX_BYTES } from "../lib/medical-motion/artifacts/repository";
function fixture(data:unknown={size:12,contentType:"video/mp4",metadata:{sha256:"a".repeat(64)}},error:unknown=null) {
  const info=vi.fn().mockResolvedValue({data,error}),upload=vi.fn().mockResolvedValue({error:null}),download=vi.fn();
  const from=vi.fn(()=>({info,upload,download})),getBucket=vi.fn().mockResolvedValue({data:{public:false},error:null});
  const storage=new SupabasePrivateArtifactStorage({storage:{from,getBucket}} as unknown as SupabaseClient);
  return {storage,info,upload,download,from};
}
describe("Supabase metadata-first integrity transport",()=>{
  it("uploads only SHA metadata under an opaque UUID without overwrite",async()=>{
    const {storage,upload,from}=fixture(),key=randomUUID(),bytes=Buffer.from("TEST MEDIA");
    await storage.put(key,bytes,"video/mp4");
    expect(from).toHaveBeenCalledWith(MEDICAL_MOTION_BUCKET);
    expect(upload).toHaveBeenCalledWith(key,bytes,{contentType:"video/mp4",upsert:false,metadata:{sha256:createHash("sha256").update(bytes).digest("hex")}});
  });
  it("reads bounded MIME/size/digest metadata without download",async()=>{
    const {storage,info,download}=fixture(),key=randomUUID();
    expect(await storage.inspect(key)).toEqual({byteSize:12,contentType:"video/mp4",sha256:"a".repeat(64)});
    expect(info).toHaveBeenCalledWith(key);expect(download).not.toHaveBeenCalled();
  });
  it("missing object is explicit",async()=>expect(await fixture(null,{statusCode:"404"}).storage.inspect(randomUUID())).toBeUndefined());
  it("legacy absent SHA metadata permits bounded deeper verification by the cache",async()=>{
    expect(await fixture({size:12,contentType:"video/mp4"}).storage.inspect(randomUUID())).toEqual({byteSize:12,contentType:"video/mp4"});
  });
  it.each([0,-1,ARTIFACT_MAX_BYTES+1,"12",NaN])("rejects invalid metadata size %s",async size=>{
    await expect(fixture({size,contentType:"video/mp4"}).storage.inspect(randomUUID())).rejects.toMatchObject({code:"ARTIFACT_CONFLICT"});
  });
  it("invalid digest metadata fails explicitly",async()=>await expect(fixture({size:12,contentType:"video/mp4",metadata:{sha256:"bad"}}).storage.inspect(randomUUID())).rejects.toMatchObject({code:"ARTIFACT_CONFLICT"}));
  it("provider failure is sanitized",async()=>await expect(fixture(null,{message:"SECRET PRIVATE PROVIDER ERROR"}).storage.inspect(randomUUID())).rejects.toThrow(/^ARTIFACT_STORAGE_UNAVAILABLE$/));
  it("rejects semantic or user-controlled object paths",async()=>{
    const {storage,info}=fixture();await expect(storage.inspect("heart/patient-x.mp4")).rejects.toMatchObject({code:"ARTIFACT_INVALID"});expect(info).not.toHaveBeenCalled();
  });
});
