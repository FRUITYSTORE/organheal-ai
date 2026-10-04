import { authenticateApiRequest } from "@/lib/api/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { ProductAuthorizationService } from "@/lib/billing/product-authorization";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request: Request) {
  const headers={"Cache-Control":"private, no-store","Vary":"Authorization"};
  try {
    const auth=await authenticateApiRequest(request);
    if(!auth.success||auth.user.is_anonymous)return Response.json({error:"authentication-required"},{status:401,headers});
    return Response.json({entitlements:await new ProductAuthorizationService(getSupabaseAdminClient()).current(auth.user.id)}, {headers});
  } catch {return Response.json({error:"temporarily-unavailable"},{status:503,headers});}
}
