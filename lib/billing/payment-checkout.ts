import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "@/lib/validation/uuid";
import { PaymentError, paymentOffer } from "./payment-config";
import { PaymentRepository, type PurchaseAttempt } from "./payment-repository";
import { createStripeCustomer, stripeTestClient } from "./stripe.service";
export class PaymentCheckoutService {
  constructor(private readonly client: SupabaseClient) {}
  async create(owner: string, body: unknown) {
    const input=body as {offer?:unknown;reportId?:unknown};
    if(!isUuid(owner)||!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).some(k=>!['offer','reportId'].includes(k)))throw new PaymentError("PAYMENT_INPUT_INVALID");
    const offer=paymentOffer(input.offer);
    let scopeRef:string|null=null;
    if(offer.mode==='payment') {
      if(!Number.isSafeInteger(input.reportId)||Number(input.reportId)<1)throw new PaymentError("PAYMENT_INPUT_INVALID");
      const r=await this.client.from('uploaded_lab_files').select('id,extraction_status').eq('user_id',owner).eq('id',input.reportId).maybeSingle();
      if(r.error)throw new PaymentError("PAYMENT_STATE_UNAVAILABLE");
      if(!r.data||r.data.extraction_status!=='Completed')throw new PaymentError("PAYMENT_INPUT_INVALID");
      scopeRef=String(input.reportId);
    } else if(input.reportId!==undefined)throw new PaymentError("PAYMENT_INPUT_INVALID");
    const repository=new PaymentRepository(this.client);
    const a:PurchaseAttempt=await repository.call('attempt',owner,null,{offer:offer.id,scopeRef,priceId:offer.priceId,allowances:offer.allowances});
    if(['paid','active','reversed','canceled','expired'].includes(a.state))throw new PaymentError("PAYMENT_INPUT_INVALID");
    try {
      const stripe=stripeTestClient();
      const price=await stripe.prices.retrieve(a.price_id);
      if(price.livemode || !price.active || price.type!==(offer.mode==='payment'?'one_time':'recurring') || offer.mode==='subscription'&&price.recurring?.interval!==(offer.id==='plus-monthly'?'month':'year'))throw new PaymentError("PAYMENT_EVENT_REJECTED");
      const customerId=a.customer_id??await createStripeCustomer({userId:owner});
      await repository.call('bind',owner,a.id,{customerId});
      let session;
      if(a.checkout_id)session=await stripe.checkout.sessions.retrieve(a.checkout_id);
      else {
        const origin=new URL(process.env.ORGANHEAL_BILLING_TEST_RETURN_ORIGIN??'http://localhost:3000');
        if(!['http:','https:'].includes(origin.protocol)||origin.username||origin.password||origin.search||origin.hash||origin.pathname!=='/')throw new PaymentError("PAYMENT_CONFIG_UNAVAILABLE");
        session=await stripe.checkout.sessions.create({mode:offer.mode,customer:customerId,line_items:[{price:a.price_id,quantity:1}],
          success_url:origin.origin+'/pricing?checkout=success',cancel_url:origin.origin+'/pricing?checkout=canceled',client_reference_id:a.id,
          metadata:{organheal_attempt:a.id},...(offer.mode==='subscription'?{subscription_data:{metadata:{organheal_attempt:a.id}}}:{payment_intent_data:{metadata:{organheal_attempt:a.id}}})},
          {idempotencyKey:`organheal:test:checkout:${a.id}`});
      }
      if(session.livemode || session.customer!==customerId || !session.id.startsWith('cs_test_') || !session.url || new URL(session.url).hostname!=='checkout.stripe.com')throw new PaymentError("PAYMENT_EVENT_REJECTED");
      await repository.call('bind',owner,a.id,{customerId,checkoutId:session.id});
      return {url:session.url};
    } catch(e) { if(e instanceof PaymentError)throw e;throw new PaymentError("PAYMENT_STATE_UNAVAILABLE"); }
  }
}
