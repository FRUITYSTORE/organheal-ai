import { createHash } from 'node:crypto';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { PaymentRepository } from '@/lib/billing/payment-repository';
import { PaymentFulfillmentService } from '@/lib/billing/payment-fulfillment';
import { verifiedStripeEvent } from '@/lib/billing/stripe.service';
import { PaymentError, requirePaymentTestMode, requirePaymentTestDatabase } from '@/lib/billing/payment-config';
import { logApiInfo } from '@/lib/api/api-logger';
export const runtime='nodejs';
export async function POST(request:Request) {
 try {
  requirePaymentTestMode();requirePaymentTestDatabase();
  if(Number(request.headers.get('content-length')??0)>262144)return Response.json({error:'invalid-event'},{status:413});
  const raw=await request.text();if(Buffer.byteLength(raw)>262144)return Response.json({error:'invalid-event'},{status:413});
  const event=verifiedStripeEvent(raw,request.headers.get('stripe-signature'));
  const objectId='id' in event.data.object?event.data.object.id:null;
  // Provider retries can serialize whitespace/key order differently. Persist only a
  // canonical envelope fingerprint; fulfillment re-reads the referenced provider object.
  const digest=createHash('sha256').update(JSON.stringify([event.id,event.type,event.created,event.livemode,event.account??null,objectId])).digest('hex');
  const result=await new PaymentFulfillmentService(new PaymentRepository(getSupabaseAdminClient())).process(event,digest);
  const code=['fulfilled','replayed','stale','pending','unsupported','reversed','state-only','reference-rejected'].includes(result.result)?result.result:'unknown';
  logApiInfo('billing.test_webhook_processed',{route:'/api/billing/webhook',result:code});
  return Response.json({success:true});
 } catch(e) {
  const rejected=e instanceof PaymentError&&e.code==='PAYMENT_EVENT_REJECTED';
  logApiInfo(rejected?'billing.test_webhook_rejected':'billing.test_webhook_retry',{route:'/api/billing/webhook'});
  return Response.json({success:false,error:rejected?'invalid-event':'test-payment-unavailable'},{status:rejected?400:503});
 }
}
