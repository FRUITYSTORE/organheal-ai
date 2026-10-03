import "server-only";
import { authenticateApiRequest } from "@/lib/api/api-auth";
import { createApiRequestId } from "@/lib/api/api-logger";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { MedicalMotionArtifactRepository } from "../artifacts/repository";
import { MedicalMotionArtifactService } from "../artifacts/service";
import { SupabasePrivateArtifactStorage } from "../artifacts/storage";
import { MedicalMotionDeliveryService } from "./service";
import { DeliveryError } from "./contracts";
export function deliveryApiService() {
  const client = getSupabaseAdminClient();
  return new MedicalMotionDeliveryService(client,new MedicalMotionArtifactService(new MedicalMotionArtifactRepository(client),new SupabasePrivateArtifactStorage(client)),"production");
}
export async function handleDeliveryApi(request: Request, action: "create" | "history" | "status" | "cancel" | "access", id?: string,
  /** Trusted server/test wiring only; routes never obtain dependencies from HTTP. */
  dependencies = { authenticate: authenticateApiRequest, service: deliveryApiService }) {
  const trace = createApiRequestId();
  const headers = { "Cache-Control":"private, no-store", "Pragma":"no-cache", "Vary":"Authorization", "x-request-id":trace, "Referrer-Policy":"no-referrer" };
  const respond = (v: unknown,status=200) => Response.json(v,{status,headers});
  try {
    const authentication = await dependencies.authenticate(request);
    if (!authentication.success) return respond({error:"authentication-required"},authentication.status);
    if (authentication.user.is_anonymous) return respond({error:"authentication-required"},401);
    const owner=authentication.user.id, service=dependencies.service();
    if (action === "create") {
      if (Number(request.headers.get("content-length")||0)>1024) throw new DeliveryError("invalid-request");
      const reader=request.body?.getReader(); if (!reader) throw new DeliveryError("invalid-request");
      const chunks: Uint8Array[]=[];let length=0;
      try { while(true){ const r=await reader.read(); if(r.done)break;length+=r.value.length;
        if(length>1024){await reader.cancel();throw new DeliveryError("invalid-request");}chunks.push(r.value); } }
      finally { reader.releaseLock(); }
      let value:unknown;try{value=JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{throw new DeliveryError("invalid-request");}
      return respond({request:await service.create(owner,value)},202);
    }
    if (action === "history") {
      const params=new URL(request.url).searchParams;
      if ([...params.keys()].some(k=>k!=="offset") || !/^\d{1,4}$/.test(params.get("offset")??"0")) throw new DeliveryError("invalid-request");
      return respond(await service.history(owner,Number(params.get("offset")||0)));
    }
    if (!id) throw new DeliveryError("invalid-request");
    if (action === "access") return respond(await service.access(owner,id));
    const result=action === "cancel" ? await service.cancel(owner,id) : await service.status(owner,id);
    return Response.json({request:result},{headers:{...headers,...(result.pollAfterSeconds?{"Retry-After":String(result.pollAfterSeconds)}:{})}});
  } catch(e) {
    const code=e instanceof DeliveryError?e.code:"temporarily-unavailable";
    const status=code==="not-found"?404:code==="invalid-request"?400:code==="product-use-not-allowed"?403:code==="not-ready"?409:503;
    return respond({error:code},status);
  }
}
