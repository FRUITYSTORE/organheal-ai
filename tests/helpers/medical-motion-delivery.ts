import { readFileSync } from "node:fs";
import { approvedSpecSchema } from "./approved-personalization";
import { sql } from "./medical-motion-postgres";
export async function deliverySchema() {
  await approvedSpecSchema();
  if(await sql("select to_regclass('public.medical_motion_delivery_requests') is null;")==="t")
    await sql(readFileSync("supabase/migrations/20261003053232_medical_motion_patient_delivery.sql","utf8"));
}
