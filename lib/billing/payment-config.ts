import "server-only";
import { PLUS_CAPABILITIES, type OfferId, type ProductCapability } from "./product-catalog";
export class PaymentError extends Error {
  constructor(readonly code: "PAYMENT_CONFIG_UNAVAILABLE" | "PAYMENT_INPUT_INVALID" | "PAYMENT_STATE_UNAVAILABLE" | "PAYMENT_EVENT_REJECTED") { super(code); }
}
/** Explicit isolated TEST deployment. Never fall back to live keys or production Supabase. */
export function requirePaymentTestMode() {
  if (process.env.ORGANHEAL_BILLING_MODE !== "stripe-test" || !process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"))
    throw new PaymentError("PAYMENT_CONFIG_UNAVAILABLE");
}
export function requirePaymentTestDatabase() {
  let url: URL;
  try { url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!); } catch { throw new PaymentError("PAYMENT_CONFIG_UNAVAILABLE"); }
  if (url.protocol !== "https:" || url.hostname !== "pmjuyyqofkdbgqmrdbuh.supabase.co" || url.pathname !== "/" || url.username || url.password || url.port || url.search || url.hash)
    throw new PaymentError("PAYMENT_CONFIG_UNAVAILABLE");
}
export type PaymentOffer = { id: OfferId; priceId: string; mode: "payment" | "subscription"; allowances: Partial<Record<ProductCapability, number | null>> };
export function paymentOffer(value: unknown): PaymentOffer {
  requirePaymentTestMode();
  if (value !== "one-time-analysis" && value !== "plus-monthly" && value !== "plus-annual") throw new PaymentError("PAYMENT_INPUT_INVALID");
  const id = value;
  if (id === "plus-annual" && process.env.ORGANHEAL_BILLING_TEST_ANNUAL_ENABLED !== "true") throw new PaymentError("PAYMENT_CONFIG_UNAVAILABLE");
  const key = id === "one-time-analysis" ? "STRIPE_PRICE_ID_ONE_TIME_ANALYSIS" : id === "plus-monthly" ? "STRIPE_PRICE_ID_PLUS_MONTHLY" : "STRIPE_PRICE_ID_PLUS_YEARLY";
  const priceId = process.env[key]?.trim();
  if (!priceId || !/^price_[a-zA-Z0-9_]{1,100}$/.test(priceId)) throw new PaymentError("PAYMENT_CONFIG_UNAVAILABLE");
  let allowances: PaymentOffer["allowances"] = {};
  if (id !== "one-time-analysis") {
    try {
      const raw = JSON.parse(process.env.ORGANHEAL_BILLING_TEST_PLUS_ALLOWANCES!);
      if (!raw || typeof raw !== "object" || Array.isArray(raw) || !Object.keys(raw).length || Object.keys(raw).some(k => !PLUS_CAPABILITIES.includes(k as ProductCapability) || raw[k] !== null && (!Number.isSafeInteger(raw[k]) || raw[k] < 1 || raw[k] > 1_000_000))) throw Error();
      allowances = raw;
    } catch { throw new PaymentError("PAYMENT_CONFIG_UNAVAILABLE"); }
  }
  return { id, priceId, mode: id === "one-time-analysis" ? "payment" : "subscription", allowances };
}
