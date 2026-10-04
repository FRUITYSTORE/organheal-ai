import { authenticateApiRequest } from '@/lib/api/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { requirePaymentTestMode,requirePaymentTestDatabase } from '@/lib/billing/payment-config';
import { PaymentRepository } from '@/lib/billing/payment-repository';
import { createBillingPortalSession } from '@/lib/billing/stripe.service';
export const runtime='nodejs';
export async function POST(request:Request) {
 try {
  requirePaymentTestMode();requirePaymentTestDatabase();
  const auth=await authenticateApiRequest(request);
  if(!auth.success||auth.user.is_anonymous)return Response.json({error:'authentication-required'},{status:401});
  const customerId=await new PaymentRepository(getSupabaseAdminClient()).call('customer',auth.user.id,null,null);
  if(!customerId)return Response.json({error:'test-billing-account-unavailable'},{status:404});
  const origin=new URL(process.env.ORGANHEAL_BILLING_TEST_RETURN_ORIGIN??'http://localhost:3000');
  if(!['http:','https:'].includes(origin.protocol)||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error();
  const result=await createBillingPortalSession({customerId,returnUrl:origin.origin+'/profile'});
  return Response.json({url:result.url},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'test-payment-unavailable'},{status:503})}
}
