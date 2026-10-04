import "server-only";
import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { isUuid } from "@/lib/validation/uuid";
import { PaymentError, requirePaymentTestMode, requirePaymentTestDatabase } from "./payment-config";
import { PaymentRepository, type PurchaseAttempt } from "./payment-repository";
import { stripeTestClient } from "./stripe.service";
import { stripePaidPeriod } from "./stripe-paid-period";
const ref = (value: unknown): string | null => typeof value==='string'?value:value&&typeof value==='object'&&'id' in value&&typeof value.id==='string'?value.id:null;
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const subscriptionEvents = new Set(['customer.subscription.created','customer.subscription.updated','customer.subscription.deleted']);
const checkoutEvents = new Set(['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed']);
const invoiceEvents = new Set(['invoice.paid','invoice.payment_failed']);
/** Signature verification belongs to the route. The provider is re-read before normalized fulfillment. */
export class PaymentFulfillmentService {
  constructor(private readonly repository: PaymentRepository, private readonly stripe: Stripe = stripeTestClient()) {}
  private async subscription(id: string) {
    const sub=await this.stripe.subscriptions.retrieve(id,{expand:['latest_invoice']});
    const attempt=sub.metadata.organheal_attempt;
    if(sub.livemode!==false || !isUuid(attempt)||sub.items.data.length!==1)throw new PaymentError('PAYMENT_EVENT_REJECTED');
    const a=await this.repository.lookup(attempt);
    const item=sub.items.data[0];
    if(a.offer==='one-time-analysis'||a.customer_id!==ref(sub.customer)||item.price.livemode||item.price.id!==a.price_id||item.quantity!==1||sub.metadata.organheal_attempt!==a.id)
      throw new PaymentError('PAYMENT_EVENT_REJECTED');
    const invoice=typeof sub.latest_invoice==='object'?sub.latest_invoice:null;
    const status=sub.status==='incomplete'||sub.status==='incomplete_expired'?'expired':sub.status==='paused'?'unpaid':sub.status;
    const paid=status==='active'&&stripePaidPeriod(invoice,sub);
    return {attempt:a, facts:{effect:paid?'paid':'state',offer:a.offer,priceId:a.price_id,customerId:a.customer_id,
      subscriptionId:sub.id,status,periodStart:item.current_period_start,periodEnd:item.current_period_end,cancelAtPeriodEnd:sub.cancel_at_period_end}};
  }
  private async checkout(id: string) {
    const session=await this.stripe.checkout.sessions.retrieve(id,{expand:['line_items']});
    const attempt=session.metadata?.organheal_attempt;
    if(session.livemode!==false||!isUuid(attempt)||session.client_reference_id!==attempt)throw new PaymentError('PAYMENT_EVENT_REJECTED');
    const a=await this.repository.lookup(attempt);
    if(a.checkout_id!==null&&session.id!==a.checkout_id||a.customer_id===null||ref(session.customer)!==a.customer_id||session.line_items?.data.length!==1||session.line_items.data[0].price?.id!==a.price_id||session.line_items.data[0].quantity!==1||session.mode!==(a.offer==='one-time-analysis'?'payment':'subscription'))
      throw new PaymentError('PAYMENT_EVENT_REJECTED');
    // A callback may win the remote-create/local-bind race. Bind only the freshly verified
    // TEST session with the original opaque attempt, registered owner customer and Price.
    if(a.checkout_id===null) {
      await this.repository.call('bind',a.owner_id,a.id,{customerId:a.customer_id,checkoutId:session.id});
      a.checkout_id=session.id;
    }
    if(a.offer!=='one-time-analysis') {
      const subscription=ref(session.subscription);
      if(!subscription || session.mode!=='subscription')throw new PaymentError('PAYMENT_EVENT_REJECTED');
      const resolved=await this.subscription(subscription);
      if(resolved.attempt.id!==a.id)throw new PaymentError('PAYMENT_EVENT_REJECTED');
      return resolved;
    }
    if(session.mode!=='payment')throw new PaymentError('PAYMENT_EVENT_REJECTED');
    return {attempt:a,facts:{effect:session.payment_status==='paid'&&session.status==='complete'?'paid':'pending',offer:a.offer,priceId:a.price_id,
      customerId:a.customer_id,checkoutId:session.id,paymentId:ref(session.payment_intent),amountMinor:session.amount_total,currency:session.currency}};
  }
  async process(event: Stripe.Event, rawDigest: string) {
    requirePaymentTestMode();requirePaymentTestDatabase();
    if(event.livemode!==false||event.account)throw new PaymentError('PAYMENT_EVENT_REJECTED');
    const received=await this.repository.call('receive',null,null,{eventId:event.id,eventType:event.type,created:event.created,digest:rawDigest});
    if(received.status!=='received')return {result:'replayed'};
    try {
      const objectId=ref(event.data.object);
      if((checkoutEvents.has(event.type)||subscriptionEvents.has(event.type)||invoiceEvents.has(event.type)||['charge.refunded','charge.dispute.created'].includes(event.type))&&!objectId)throw new PaymentError('PAYMENT_EVENT_REJECTED');
      let resolved;
      if(checkoutEvents.has(event.type)) resolved=await this.checkout(objectId!);
      else if(subscriptionEvents.has(event.type)) resolved=await this.subscription(objectId!);
      else if(invoiceEvents.has(event.type)) {
        const invoice=await this.stripe.invoices.retrieve(objectId!);
        if(invoice.livemode!==false)throw new PaymentError('PAYMENT_EVENT_REJECTED');
        const id=ref(invoice.parent?.subscription_details?.subscription);
        if(!id)throw new PaymentError('PAYMENT_EVENT_REJECTED');
        resolved=await this.subscription(id);
      } else if(['charge.refunded','charge.dispute.created'].includes(event.type)) {
        let charge: Stripe.Charge;
        if(event.type==='charge.dispute.created') {
          const dispute=await this.stripe.disputes.retrieve(objectId!);
          if(dispute.livemode!==false)throw new PaymentError('PAYMENT_EVENT_REJECTED');
          const id=ref(dispute.charge);if(!id)throw new PaymentError('PAYMENT_EVENT_REJECTED');
          charge=await this.stripe.charges.retrieve(id);
        } else charge=await this.stripe.charges.retrieve(objectId!);
        if(charge.livemode!==false||event.type==='charge.refunded'&&charge.amount_refunded<1)throw new PaymentError('PAYMENT_EVENT_REJECTED');
        const paymentId=ref(charge.payment_intent);
        let a:PurchaseAttempt|null=await this.repository.call('reference',null,null,{paymentId});
        let subscriptionId:string|undefined;
        if(!a) {
          if(!paymentId)throw new PaymentError('PAYMENT_EVENT_REJECTED');
          const intent=await this.stripe.paymentIntents.retrieve(paymentId);
          const attempt=intent.metadata.organheal_attempt;
          if(intent.livemode!==false)throw new PaymentError('PAYMENT_EVENT_REJECTED');
          if(isUuid(attempt)) {
            a=await this.repository.lookup(attempt);
            if(!a.checkout_id)throw new PaymentError('PAYMENT_STATE_UNAVAILABLE');
            const verified=await this.checkout(a.checkout_id);
            if(verified.attempt.id!==a.id||!('paymentId' in verified.facts)||verified.facts.paymentId!==paymentId)throw new PaymentError('PAYMENT_EVENT_REJECTED');
          } else {
            const payments=await this.stripe.invoicePayments.list({payment:{type:'payment_intent',payment_intent:paymentId},limit:2});
            if(payments.data.length!==1||payments.has_more||payments.data[0].livemode!==false)throw new PaymentError('PAYMENT_EVENT_REJECTED');
            const invoiceId=ref(payments.data[0].invoice);if(!invoiceId)throw new PaymentError('PAYMENT_EVENT_REJECTED');
            const invoice=await this.stripe.invoices.retrieve(invoiceId);
            const subId=ref(invoice.parent?.subscription_details?.subscription);
            if(invoice.livemode!==false||!subId)throw new PaymentError('PAYMENT_EVENT_REJECTED');
            const verified=await this.subscription(subId);a=verified.attempt;subscriptionId=subId;
          }
        }
        resolved={attempt:a,facts:{effect:'reverse',customerId:ref(charge.customer),paymentId,checkoutId:a.checkout_id,subscriptionId:subscriptionId??a.subscription_id}};
      } else return await this.repository.call('fulfill',null,null,{eventId:event.id,effect:'unsupported'});
      return await this.repository.call('fulfill',null,resolved.attempt.id,{eventId:event.id,...resolved.facts});
    } catch(e) {
      if(e instanceof PaymentError && e.code==='PAYMENT_EVENT_REJECTED') {
        await this.repository.call('reject',null,null,{eventId:event.id});
        return {result:'reference-rejected'};
      }
      // Retriable failure leaves the durable event received. No raw provider diagnostic escapes.
      throw new PaymentError('PAYMENT_STATE_UNAVAILABLE');
    }
  }
  /** Trusted server operator only: dry-run uses provider facts, never profiles.plan or browser claims. */
  async reconcile(attemptId: string, dryRun=true) {
    requirePaymentTestMode();requirePaymentTestDatabase();
    if(!isUuid(attemptId))throw new PaymentError('PAYMENT_INPUT_INVALID');
    const a=await this.repository.lookup(attemptId);
    const resolved=a.subscription_id?await this.subscription(a.subscription_id):a.checkout_id?await this.checkout(a.checkout_id):null;
    if(!resolved)return {dryRun,action:'no-provider-reference'};
    const digest=sha(JSON.stringify(resolved.facts));
    if(dryRun)return {dryRun:true,attemptId:a.id,effect:resolved.facts.effect};
    // New observations may repeat: grants retain their stable purchase/period identity.
    const created=Math.floor(Date.now()/1000),eventId='reconcile_'+sha(`${a.id}:${digest}:${created}`);
    await this.repository.call('receive',null,null,{eventId,eventType:'purchase.reconciled',created,digest});
    return await this.repository.call('fulfill',null,a.id,{eventId,...resolved.facts});
  }
}
