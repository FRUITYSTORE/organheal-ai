import { handleDeliveryApi } from "@/lib/medical-motion/delivery/api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{requestId: string}> }) {
  return handleDeliveryApi(request,"access",(await context.params).requestId);
}
