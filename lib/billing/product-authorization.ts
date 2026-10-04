import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/validation/uuid";
import { isCapability, PRODUCT_CAPABILITIES, COMMERCIAL_OFFERS } from "./product-catalog";
import { ProductAuthorizationError, type ProductScope, type ProductDecision, type EntitlementGrant, type CostUnits } from "./product-contracts";
function scopeInput(scope: ProductScope) {
  if (!scope || scope.kind !== "account" && scope.kind !== "report" && scope.kind !== "context" ||
    (scope.kind === "account" ? scope.ref !== null : scope.kind==="report" ? typeof scope.ref!=="string"||!(/^[1-9][0-9]{0,15}$/.test(scope.ref)||isUuid(scope.ref)) : !isUuid(scope.ref))) throw new ProductAuthorizationError("PRODUCT_INPUT_INVALID");
  return {scopeKind:scope.kind,scopeRef:scope.ref};
}
const codes = ["ALLOWED_FREE","ALLOWED_SUBSCRIPTION","ALLOWED_ONE_TIME","ALLOWED_CREDIT","DENIED_ENTITLEMENT_REQUIRED","DENIED_ALLOWANCE_EXHAUSTED","DENIED_PRODUCT_UNAVAILABLE"];
function decision(v: unknown): ProductDecision {
  const r=v as ProductDecision;
  if(!r||!codes.includes(r.code)||typeof r.allowed!=="boolean"||r.allowed!==r.code.startsWith("ALLOWED_")||
    r.entitlementId!==null&&!isUuid(r.entitlementId)||r.reservationId!==null&&!isUuid(r.reservationId)||
    r.remaining!==null&&(!Number.isSafeInteger(r.remaining)||r.remaining<0)||![null,"reserved","consumed","released"].includes(r.state)||
    r.allowed&&r.code!=="ALLOWED_FREE"&&r.entitlementId===null||r.allowed&&r.state==="released"||
    (r.reservationId===null)!==(r.state===null))
    throw new ProductAuthorizationError("PRODUCT_STATE_UNAVAILABLE");
  return Object.freeze(r);
}
export class ProductAuthorizationService {
  constructor(private readonly client: SupabaseClient) {}
  private async call(owner: string, action: string, id: string | null, input: unknown) {
    if (!isUuid(owner)||id!==null&&!isUuid(id)) throw new ProductAuthorizationError("PRODUCT_INPUT_INVALID");
    try { const r=await this.client.rpc("product_operation",{p_owner:owner,p_action:action,p_id:id,p_input:input});
      if(r.error)throw Error();return r.data; } catch {throw new ProductAuthorizationError("PRODUCT_STATE_UNAVAILABLE");}
  }
  /** Owner comes from verified server auth. Safety is a dedicated free capability, never a premium override flag. */
  async authorizeProductUse(owner: string, capability: unknown, scope: ProductScope, actionRef: string | null = null): Promise<ProductDecision> {
    if(!isUuid(owner)||!isCapability(capability)||actionRef!==null&&!isUuid(actionRef))throw new ProductAuthorizationError("PRODUCT_INPUT_INVALID");
    const input={capability,...scopeInput(scope),actionRef};
    if(PRODUCT_CAPABILITIES[capability].free)return {allowed:true,code:"ALLOWED_FREE",entitlementId:null,remaining:null,reservationId:null,state:null};
    return decision(await this.call(owner,"authorize",null,input));
  }
  async authorizeMotion(owner: string, input: {sourceRef:string;sceneIndex:number;language:string;aspectRatio:string}) {
    return decision(await this.call(owner,"authorize-motion",null,input));
  }
  async reserve(owner: string, capability: unknown, scope: ProductScope, actionRef: string) {
    if(!isCapability(capability)||!isUuid(actionRef))throw new ProductAuthorizationError("PRODUCT_INPUT_INVALID");
    return decision(await this.call(owner,"reserve",null,{capability,...scopeInput(scope),actionRef}));
  }
  async settle(owner: string,reservationId: string,state: "consumed" | "released",reason: "success" | "cancelled" | "technical-failure" | "medical-unavailable" | "refund") {
    if(!["consumed","released"].includes(state)||!["success","cancelled","technical-failure","medical-unavailable","refund"].includes(reason)||
      (state==="consumed")!==(reason==="success"))throw new ProductAuthorizationError("PRODUCT_INPUT_INVALID");
    return this.call(owner,"settle",reservationId,{state,reason});
  }
  /** Trusted admin/provider adapter only. There is deliberately no grant HTTP route. */
  private grantInput(grant: EntitlementGrant) {
    if(!isCapability(grant.capability)||!["free","subscription","one-time","credit","promotional","admin"].includes(grant.kind)||
      !isUuid(grant.sourceRef)||typeof grant.validFrom!=="string"||!Number.isFinite(Date.parse(grant.validFrom))||
      grant.validUntil!==null&&(typeof grant.validUntil!=="string"||!Number.isFinite(Date.parse(grant.validUntil))||Date.parse(grant.validUntil)<=Date.parse(grant.validFrom))||
      grant.allowance!==null&&(!Number.isSafeInteger(grant.allowance)||grant.allowance<1||grant.allowance>1_000_000)||
      grant.offer!==null&&!Object.hasOwn(COMMERCIAL_OFFERS,grant.offer)||grant.kind==="credit"&&grant.allowance===null||
      grant.kind==="one-time"&&grant.scope.kind!=="report"||grant.purchase&&(!Number.isSafeInteger(grant.purchase.amountMinor)||grant.purchase.amountMinor<0||grant.purchase.amountMinor>1_000_000_000||typeof grant.purchase.currency!=="string"||!(/^[A-Z]{3}$/.test(grant.purchase.currency))))throw new ProductAuthorizationError("PRODUCT_INPUT_INVALID");
    return {capability:grant.capability,kind:grant.kind,...scopeInput(grant.scope),validFrom:grant.validFrom,
      validUntil:grant.validUntil,allowance:grant.allowance,sourceRef:grant.sourceRef,offer:grant.offer,
      purchaseAmountMinor:grant.purchase?.amountMinor??null,purchaseCurrency:grant.purchase?.currency??null};
  }
  async grant(owner: string, grant: EntitlementGrant) { return this.call(owner,"grant",null,this.grantInput(grant)); }
  async grantBatch(owner: string,grants: readonly EntitlementGrant[]) {
    if(!Array.isArray(grants)||grants.length<1||grants.length>12)throw new ProductAuthorizationError("PRODUCT_INPUT_INVALID");
    return this.call(owner,"grant-bundle",null,{grants:grants.map(g=>this.grantInput(g))});
  }
  async revoke(owner: string,id: string) { return this.call(owner,"revoke",id,null); }
  async current(owner: string) {
    const rows=await this.call(owner,"read",null,null);
    if(!Array.isArray(rows)||rows.length>100)throw new ProductAuthorizationError("PRODUCT_STATE_UNAVAILABLE");
    return rows.map(r=>{
      if(!isCapability(r?.capability)||!["free","subscription","one-time","credit","promotional","admin"].includes(r.kind)||
        r.validUntil!==null&&(typeof r.validUntil!=="string"||!Number.isFinite(Date.parse(r.validUntil)))||
        r.remaining!==null&&(!Number.isSafeInteger(r.remaining)||r.remaining<0))throw new ProductAuthorizationError("PRODUCT_STATE_UNAVAILABLE");
      scopeInput({kind:r.scopeKind,ref:r.scopeRef});
      return {capability:r.capability,kind:r.kind,scopeKind:r.scopeKind,scopeRef:r.scopeRef,validUntil:r.validUntil,remaining:r.remaining};
    });
  }
  async recordCost(owner: string,eventRef: string,actionRef: string,units: CostUnits) {
    if(!isUuid(eventRef)||!isUuid(actionRef)||!units||Object.keys(units).length===0||Object.keys(units).length>9)throw new ProductAuthorizationError("PRODUCT_INPUT_INVALID");
    for(const [k,v] of Object.entries(units)) {
      const ok=["baseCacheHit","blenderAvoided","compositionExecuted"].includes(k)?typeof v==="boolean":
        ["blenderExecutions","compositionExecutions","artifactBytes","aiUses"].includes(k)?Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=1_000_000_000:
        k==="durationBand"?typeof v==="string"&&["short","medium","long","unknown"].includes(v):
        k==="outputProfile"?typeof v==="string"&&["16:9","9:16","1:1"].includes(v):false;
      if(!ok)throw new ProductAuthorizationError("PRODUCT_INPUT_INVALID");
    }
    return this.call(owner,"record",null,{eventRef,actionRef,units});
  }
}
