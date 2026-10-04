import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/validation/uuid";
import { getBillingProfileByUserId } from "@/lib/repositories/billing.repository";
import { paymentOffer, PaymentError, requirePaymentTestDatabase } from "./payment-config";
import { PaymentRepository, type PurchaseAttempt } from "./payment-repository";
import { stripeTestClient } from "./stripe.service";
import { stripePaidPeriod } from "./stripe-paid-period";
/** Server operator only. Protected historical references are hints, not entitlement authority. */
export async function reconcileLegacyBilling(client: SupabaseClient, owner: string, offerId: 'plus-monthly' | 'plus-annual', dryRun=true) {
  requirePaymentTestDatabase();
  if(!isUuid(owner))throw new PaymentError('PAYMENT_INPUT_INVALID');
  const offer=paymentOffer(offerId),profile=await getBillingProfileByUserId(owner,client);
  if(!profile?.stripe_customer_id||!profile.stripe_subscription_id)return {dryRun,action:'no-verified-provider-reference'};
  try {
    const sub=await stripeTestClient().subscriptions.retrieve(profile.stripe_subscription_id,{expand:['latest_invoice']});
    const item=sub.items.data[0],invoice=typeof sub.latest_invoice==='object'?sub.latest_invoice:null;
    if(sub.livemode!==false||sub.customer!==profile.stripe_customer_id||sub.metadata.supabase_user_id!==owner||sub.items.data.length!==1||item.price.id!==offer.priceId||item.price.livemode||item.quantity!==1)
      throw new PaymentError('PAYMENT_EVENT_REJECTED');
    const status=sub.status==='incomplete'||sub.status==='incomplete_expired'?'expired':sub.status==='paused'?'unpaid':sub.status;
    const effect=status==='active'&&stripePaidPeriod(invoice,sub)?'paid':'state';
    if(dryRun)return {dryRun:true,action:effect==='paid'?'verified-period-grant':'state-only',offer:offerId};
    const repository=new PaymentRepository(client);
    const a:PurchaseAttempt=await repository.call('attempt',owner,null,{offer:offer.id,priceId:offer.priceId,scopeRef:null,allowances:offer.allowances});
    await repository.call('bind',owner,a.id,{customerId:profile.stripe_customer_id});
    const facts={effect,status,offer:offer.id,priceId:a.price_id,customerId:profile.stripe_customer_id,subscriptionId:sub.id,
      periodStart:item.current_period_start,periodEnd:item.current_period_end,cancelAtPeriodEnd:sub.cancel_at_period_end};
    const created=Math.floor(Date.now()/1000),digest=createHash('sha256').update(JSON.stringify(facts)).digest('hex');
    const eventId='reconcile_'+createHash('sha256').update(`${a.id}:${digest}:${created}`).digest('hex');
    await repository.call('receive',null,null,{eventId,eventType:'legacy.reconciled',created,digest});
    return await repository.call('fulfill',null,a.id,{eventId,...facts});
  }catch(e){if(e instanceof PaymentError)throw e;throw new PaymentError('PAYMENT_STATE_UNAVAILABLE');}
}
