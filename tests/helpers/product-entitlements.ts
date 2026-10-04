import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { deliverySchema } from "./medical-motion-delivery";
import { configuration,sql } from "./medical-motion-postgres";
import { client } from "./medical-motion-rpc";
import { ProductAuthorizationService } from "../../lib/billing/product-authorization";
export async function productSchema() {
  configuration(); await deliverySchema();
  if(await sql("select to_regclass('public.product_entitlements') is null;")==="t")
    await sql(readFileSync("supabase/migrations/20261003063120_product_entitlements.sql","utf8"));
}
/** Explicit TEST grant, not a production default/free premium allowance. */
export function grantTestMotion(owner:string,allowance=1000) {
  return new ProductAuthorizationService(client).grant(owner,{capability:"medical-motion.personalized",kind:"admin",scope:{kind:"account",ref:null},
    allowance,sourceRef:randomUUID(),offer:null,validFrom:"2020-01-01T00:00:00Z",validUntil:"2099-01-01T00:00:00Z"});
}
