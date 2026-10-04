import "server-only";
import { PLUS_CAPABILITIES, type ProductCapability } from "./product-catalog";
import type { EntitlementGrant } from "./product-contracts";
import { ProductAuthorizationService } from "./product-authorization";
/** Verified provider/admin facts only, never HTTP body, user metadata or a payment redirect.
 * Existing Stripe/profile projection and API rate limits remain compatibility concerns.
 * A future verified webhook adapter supplies these neutral facts; no provider call here. */
export class ProviderEntitlements {
  constructor(private readonly authorization: ProductAuthorizationService) {}
  confirmAnalysis(owner: string, reportRef: string, provenance: {sourceRef:string;validFrom:string;validUntil:string|null;purchase?:{amountMinor:number;currency:string}}) {
    return this.authorization.grant(owner,{...provenance,capability:"report.full-analysis",kind:"one-time",
      scope:{kind:"report",ref:reportRef},allowance:1,offer:"one-time-analysis"});
  }
  async activateSubscription(owner: string, period: {sourceRef:string;validFrom:string;validUntil:string},
    allowances: Partial<Record<ProductCapability,number | null>>) {
    // Explicit configured grants only. Unconfigured capabilities are not implicitly unlimited.
    const grants:EntitlementGrant[]=[];
    for(const capability of PLUS_CAPABILITIES) if(Object.hasOwn(allowances,capability))
      grants.push({...period,capability,kind:"subscription",scope:{kind:"account",ref:null},
        allowance:allowances[capability]!,offer:"plus-monthly"});
    return grants.length?this.authorization.grantBatch(owner,grants):[];
  }
  revoke(owner: string,id: string) {return this.authorization.revoke(owner,id);}
  refundUsage(owner: string,reservation: string) {return this.authorization.settle(owner,reservation,"released","refund");}
  grant(owner: string, grant: EntitlementGrant) {return this.authorization.grant(owner,grant);}
}
