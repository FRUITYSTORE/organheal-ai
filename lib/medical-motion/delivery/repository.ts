import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/validation/uuid";
import { jsonSnapshot } from "../validation/json-snapshot";
import { deliveryInput, DeliveryError, type DeliveryInput, type DeliverySnapshot } from "./contracts";
import { isIssuedApprovedSpec, type ApprovedSpecContent } from "../composition/approved-spec";
export class DeliveryRepository {
  constructor(private readonly client: SupabaseClient) {}
  private async rpc(owner: string | null, action: string, id: string | null = null, input: unknown = null) {
    if (owner !== null && !isUuid(owner) || id !== null && !isUuid(id)) throw new DeliveryError("invalid-request");
    try { const r = await this.client.rpc("motion_delivery_operation", { p_user_id: owner, p_action: action, p_request_id: id, p_input: input });
      if (r.error) { if(r.error.code==="OB403")throw new DeliveryError("product-use-not-allowed");throw Error(); } return jsonSnapshot(r.data);
    } catch(e) { if(e instanceof DeliveryError)throw e;throw new DeliveryError("temporarily-unavailable"); }
  }
  private row(value: unknown, owner?: string): DeliverySnapshot {
    const v = value as DeliverySnapshot;
    try { deliveryInput({sourceRef:v.sourceRef,sceneIndex:v.sceneIndex,language:v.language,aspectRatio:v.aspectRatio}); }
    catch { throw new DeliveryError("temporarily-unavailable"); }
    if (!v || ![v.id,v.userId,v.contextId,v.baseJobId,v.sourceRef].every(isUuid) || owner && v.userId !== owner ||
      v.specId !== null && !isUuid(v.specId) || !["queued","preparing","rendering","personalizing","ready","failed","cancelled"].includes(v.status) ||
      !["preparation","visualization","personalization","finalizing","ready","failed","cancelled","unavailable"].includes(v.stage) ||
      ![null,"medical-visualization-not-available","source-no-longer-eligible","unable-to-create-video"].includes(v.failureCode) ||
      v.baseCacheHit !== null && typeof v.baseCacheHit !== "boolean" ||
      typeof v.createdAt !== "string" || typeof v.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(v.createdAt)) || !Number.isFinite(Date.parse(v.updatedAt))) throw new DeliveryError("temporarily-unavailable");
    return Object.freeze(v);
  }
  async source(owner: string, input: DeliveryInput) {
    const v = await this.rpc(owner,"source",null,input) as { contextId: string; baseJobId: string } | null;
    if (!v) throw new DeliveryError("not-found");
    if (!isUuid(v.contextId) || !isUuid(v.baseJobId)) throw new DeliveryError("temporarily-unavailable"); return v;
  }
  async create(owner: string, input: DeliveryInput, eligible: boolean) {
    const v = await this.rpc(owner,"create",null,{...input,eligible}); if (!v) throw new DeliveryError("not-found"); return this.row(v,owner);
  }
  async read(owner: string, id: string) { const v = await this.rpc(owner,"read",id); if (!v) throw new DeliveryError("not-found"); return this.row(v,owner); }
  async cancel(owner: string, id: string) { const v = await this.rpc(owner,"cancel",id); if (!v) throw new DeliveryError("not-found"); return this.row(v,owner); }
  async list(owner: string, offset: number) {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000) throw new DeliveryError("invalid-request");
    const v = await this.rpc(owner,"list",null,{offset}); if (!Array.isArray(v) || v.length > 20) throw new DeliveryError("temporarily-unavailable"); return v.map(r=>this.row(r,owner));
  }
  async pending() { const v = await this.rpc(null,"pending"); if (!Array.isArray(v) || v.length > 10) throw new DeliveryError("temporarily-unavailable"); return v.map(r=>this.row(r)); }
  async approve(owner: string, id: string, spec: ApprovedSpecContent) {
    if (!isIssuedApprovedSpec(spec) || spec.userId !== owner) throw new DeliveryError("invalid-request");
    return this.row(await this.rpc(owner,"approve",id,spec),owner);
  }
  async ineligible(owner: string,id: string) { await this.rpc(owner,"ineligible",id); }
}
