import { readFileSync } from "node:fs";
import { configuration, sql } from "./medical-motion-postgres";
import { artifactSchema } from "./medical-motion-artifacts";
export async function compositionSchema() {
  configuration(); await artifactSchema();
  if (await sql("select to_regclass('public.medical_motion_compositions') is null;") === "t")
    await sql(readFileSync("supabase/migrations/20261003015442_medical_motion_composition_provenance.sql", "utf8"));
}
