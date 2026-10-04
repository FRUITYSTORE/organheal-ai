import "server-only";
import Stripe from "stripe";
import { PaymentError, requirePaymentTestMode } from "./payment-config";
export type PlanInterval = "month" | "year";
/** Existing provider boundary: one official SDK factory, explicitly TEST gated. */
export function stripeTestClient() {
  requirePaymentTestMode();
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { maxNetworkRetries: 2, timeout: 10000 });
}
export function getStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret?.startsWith("whsec_")) throw new PaymentError("PAYMENT_CONFIG_UNAVAILABLE");
  return secret;
}
export function getStripePriceId(interval: PlanInterval) {
  const id = process.env[interval === "year" ? "STRIPE_PRICE_ID_PLUS_YEARLY" : "STRIPE_PRICE_ID_PLUS_MONTHLY"]?.trim();
  if (!id?.startsWith("price_")) throw new PaymentError("PAYMENT_CONFIG_UNAVAILABLE");
  return id;
}
export function isBillingConfigured() {
  try { requirePaymentTestMode(); getStripePriceId("month"); return true; } catch { return false; }
}
export function verifyStripeWebhookSignature({payload,signatureHeader,secret}: {payload:string;signatureHeader:string|null;secret:string}) {
  if (!signatureHeader) return false;
  try { Stripe.webhooks.constructEvent(payload,signatureHeader,secret,300); return true; } catch { return false; }
}
export function verifiedStripeEvent(payload:string,signature:string|null) {
  requirePaymentTestMode();
  if (!signature) throw new PaymentError("PAYMENT_EVENT_REJECTED");
  let event: Stripe.Event;
  try { event=Stripe.webhooks.constructEvent(payload,signature,getStripeWebhookSecret(),300); }
  catch (e) { if(e instanceof PaymentError) throw e; throw new PaymentError("PAYMENT_EVENT_REJECTED"); }
  if (event.livemode !== false || event.account || !/^evt_[a-zA-Z0-9_]{1,120}$/.test(event.id) || !Number.isSafeInteger(event.created) || event.created < 1 || !event.data?.object || typeof event.data.object !== 'object' || typeof event.type !== 'string')
    throw new PaymentError("PAYMENT_EVENT_REJECTED");
  return event;
}
export async function createStripeCustomer({userId}: {userId:string;email?:string|null}) {
  try {
    const c=await stripeTestClient().customers.create({metadata:{organheal_owner:userId}}, {idempotencyKey:`organheal:test:customer:${userId}`});
    if(c.livemode || !/^cus_[a-zA-Z0-9_]+$/.test(c.id))throw Error();
    return c.id;
  } catch { throw new PaymentError("PAYMENT_STATE_UNAVAILABLE"); }
}
export async function createBillingPortalSession({customerId,returnUrl}: {customerId:string;returnUrl:string}) {
  try { return await stripeTestClient().billingPortal.sessions.create({customer:customerId,return_url:returnUrl}); }
  catch { throw new PaymentError("PAYMENT_STATE_UNAVAILABLE"); }
}
