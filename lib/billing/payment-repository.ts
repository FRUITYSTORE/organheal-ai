import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PaymentError } from "./payment-config";
import type { ProductCapability, OfferId } from "./product-catalog";
export type PurchaseAttempt = { id: string; owner_id: string; offer: OfferId; scope_ref: string | null; price_id: string;
  allowances: Partial<Record<ProductCapability, number | null>>; customer_id: string | null; checkout_id: string | null;
  subscription_id: string | null; payment_id: string | null; state: string };
/** Service-role RPC only. No browser-facing mutation or raw provider diagnostic. */
export class PaymentRepository {
  constructor(private readonly client: SupabaseClient) {}
  async call(action: string, owner: string | null, id: string | null, input: unknown): Promise<any> {
    try {
      const r = await this.client.rpc("payment_operation", { p_action: action, p_owner: owner, p_id: id, p_input: input });
      if (r.error) throw Error();
      return r.data;
    } catch { throw new PaymentError("PAYMENT_STATE_UNAVAILABLE"); }
  }
  async lookup(id: string): Promise<PurchaseAttempt> {
    const r = await this.call("lookup", null, id, null);
    if (!r) throw new PaymentError("PAYMENT_EVENT_REJECTED");
    return r;
  }
}
