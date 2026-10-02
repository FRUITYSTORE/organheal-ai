import { describe,it,expect,vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabasePrivateArtifactStorage,MEDICAL_MOTION_BUCKET } from "@/lib/medical-motion/artifacts/storage";
const id="11111111-1111-4111-8111-111111111111";
function seam(publicBucket=false) {
  const upload=vi.fn().mockResolvedValue({data:{},error:null}),download=vi.fn().mockResolvedValue({data:new Blob(["bytes"],{type:"video/mp4"}),error:null});
  const getBucket=vi.fn().mockResolvedValue({data:{public:publicBucket},error:null}),createBucket=vi.fn(),from=vi.fn().mockReturnValue({upload,download});
  return {client:{storage:{getBucket,createBucket,from}} as unknown as SupabaseClient,upload,download,getBucket,createBucket,from};
}
describe("Supabase private adapter SDK contract only (no live provider claim)",()=>{
  it("rejects public bucket before any I/O",async()=>{const s=seam(true);await expect(new SupabasePrivateArtifactStorage(s.client).put(id,Buffer.from("bytes"),"video/mp4")).rejects.toThrow("ARTIFACT_STORAGE_UNAVAILABLE");expect(s.upload).not.toHaveBeenCalled();});
  it("upload is opaque, MIME explicit and never upsert",async()=>{const s=seam();await new SupabasePrivateArtifactStorage(s.client).put(id,Buffer.from("bytes"),"video/mp4");expect(s.from).toHaveBeenCalledWith(MEDICAL_MOTION_BUCKET);expect(s.upload).toHaveBeenCalledWith(id,expect.any(Buffer),{contentType:"video/mp4",upsert:false});});
  it("missing bucket is created private then rechecked",async()=>{const s=seam();s.getBucket.mockResolvedValueOnce({data:null,error:{statusCode:"404"}});await new SupabasePrivateArtifactStorage(s.client).read(id);expect(s.createBucket).toHaveBeenCalledWith(MEDICAL_MOTION_BUCKET,expect.objectContaining({public:false}));});
  it("download cancellation is passed through without cache",async()=>{const s=seam(),signal=new AbortController().signal;await new SupabasePrivateArtifactStorage(s.client).read(id,signal);expect(s.download).toHaveBeenCalledWith(id,{}, {signal,cache:"no-store"});});
  it("structured 404 means absent object",async()=>{const s=seam();s.download.mockResolvedValue({data:null,error:{status:400,statusCode:"404"}});expect(await new SupabasePrivateArtifactStorage(s.client).read(id)).toBeUndefined();});
  it("non-404 provider error is never absence or raw diagnostic",async()=>{const s=seam();s.download.mockResolvedValue({data:null,error:{status:500,message:"PRIVATE TOKEN"}});await expect(new SupabasePrivateArtifactStorage(s.client).read(id)).rejects.toThrow(/^ARTIFACT_STORAGE_UNAVAILABLE$/);});
  it.each(["../private","patient-name","/local/path"])("invalid key %s cannot be accessed",async key=>{const s=seam();await expect(new SupabasePrivateArtifactStorage(s.client).read(key)).rejects.toThrow("ARTIFACT_INVALID");expect(s.getBucket).not.toHaveBeenCalled();});
});
