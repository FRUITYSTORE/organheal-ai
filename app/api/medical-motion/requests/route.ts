import { handleDeliveryApi } from "@/lib/medical-motion/delivery/api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = (request: Request) => handleDeliveryApi(request,"create");
export const GET = (request: Request) => handleDeliveryApi(request,"history");
