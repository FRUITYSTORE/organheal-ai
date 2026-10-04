import { authenticateApiRequest } from "@/lib/api/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { PaymentCheckoutService } from "@/lib/billing/payment-checkout";
import { PaymentError, requirePaymentTestMode, requirePaymentTestDatabase } from "@/lib/billing/payment-config";
import { logApiInfo } from "@/lib/api/api-logger";
export const runtime='nodejs';
export async function POST(request:Request) {
 const headers={'Cache-Control':'private, no-store'};
 try {
  requirePaymentTestMode(); requirePaymentTestDatabase();
  const auth=await authenticateApiRequest(request);
  if(!auth.success||auth.user.is_anonymous)return Response.json({success:false,error:'authentication-required'},{status:401,headers});
  let body:unknown;try{body=await request.json()}catch{return Response.json({success:false,error:'invalid-offer'},{status:400,headers})}
  const result=await new PaymentCheckoutService(getSupabaseAdminClient()).create(auth.user.id,body);
  logApiInfo('billing.test_checkout_created',{route:'/api/billing/checkout'});
  return Response.json({success:true,...result},{headers});
 } catch(e) {
  const status=e instanceof PaymentError&&e.code==='PAYMENT_INPUT_INVALID'?400:503;
  return Response.json({success:false,error:status===400?'invalid-offer':'test-payment-unavailable'},{status,headers});
 }
}
