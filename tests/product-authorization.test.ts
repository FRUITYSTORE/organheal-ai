import { randomUUID } from "node:crypto";
import { describe,it,expect,vi,beforeEach } from "vitest";
import { ProductAuthorizationService } from "../lib/billing/product-authorization";
import { COMMERCIAL_OFFERS,PRODUCT_CAPABILITIES } from "../lib/billing/product-catalog";
import type { SupabaseClient } from "@supabase/supabase-js";
const owner=randomUUID(),rpc=vi.fn(),service=new ProductAuthorizationService({rpc} as unknown as SupabaseClient),account={kind:"account",ref:null} as const;
describe("central commercial authority contracts",()=>{
 beforeEach(()=>{rpc.mockReset();});
 it("offer prices are planning configuration separate from capability identifiers",()=>{expect(COMMERCIAL_OFFERS["one-time-analysis"].amountMinor).toBe(799);expect(COMMERCIAL_OFFERS["plus-monthly"].amountMinor).toBe(999);expect(PRODUCT_CAPABILITIES["safety.alerts"].free).toBe(true);});
 it.each(["report.preview","safety.alerts"])("%s stays free even when commercial storage is down",async cap=>{expect((await service.authorizeProductUse(owner,cap,account)).code).toBe("ALLOWED_FREE");expect(rpc).not.toHaveBeenCalled();});
 it.each(["plus",{plan:"plus"},"__proto__","stripe-price"])("caller plan/provider data is not a capability",async cap=>{await expect(service.authorizeProductUse(owner,cap,account)).rejects.toThrow("PRODUCT_INPUT_INVALID");expect(rpc).not.toHaveBeenCalled();});
 it("raw database diagnostics fail closed without leakage",async()=>{rpc.mockRejectedValue(Error("PASSWORD_AND_PRIVATE_SQL"));await expect(service.authorizeProductUse(owner,"report.full-analysis",{kind:"report",ref:"1"})).rejects.toThrow("PRODUCT_STATE_UNAVAILABLE");});
 it("malformed authorization result cannot grant premium access",async()=>{rpc.mockResolvedValue({data:{allowed:true,code:"DENIED_ENTITLEMENT_REQUIRED"},error:null});await expect(service.authorizeProductUse(owner,"report.full-analysis",{kind:"report",ref:"1"})).rejects.toThrow();});
 it.each([{price:999},{diagnosis:"text"},{durationBand:["short"]},{artifactBytes:-1},{blenderExecutions:1.5}])("cost accounting rejects unsupported data",async units=>{await expect(service.recordCost(owner,randomUUID(),randomUUID(),units as never)).rejects.toThrow("PRODUCT_INPUT_INVALID");});
 it("owner read projects safe fields and excludes provider/provenance keys",async()=>{rpc.mockResolvedValue({data:[{capability:"history.extended",kind:"subscription",scopeKind:"account",scopeRef:null,validUntil:null,remaining:5,secret:"HIDDEN"}],error:null});expect(JSON.stringify(await service.current(owner))).not.toContain("HIDDEN");});
 it("one-time grant cannot unlock an entire account",async()=>{await expect(service.grant(owner,{capability:"report.full-analysis",kind:"one-time",scope:account,sourceRef:randomUUID(),validFrom:"2020-01-01",validUntil:null,allowance:1,offer:"one-time-analysis"})).rejects.toThrow();});
});
