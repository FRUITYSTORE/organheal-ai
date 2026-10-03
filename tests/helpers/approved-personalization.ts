import { readFileSync } from "node:fs";
import { compositionSchema } from "./composition-postgres";
import { sql } from "./medical-motion-postgres";
import type { HealthIntelligenceContext } from "../../lib/health-intelligence/context/health-intelligence-context";
export async function approvedSpecSchema() {
  await compositionSchema();
  if (await sql("select to_regclass('public.medical_motion_approved_specs') is null;") === "t")
    await sql(readFileSync("supabase/migrations/20261003042649_medical_motion_approved_personalization.sql", "utf8"));
}
/** Minimal trusted server source TEST fixture, never a medical risk inference. */
export function testHealth(owner: string, score = 42): HealthIntelligenceContext {
  return { userId: owner, language: "en", latestCheckIn: { id: "71234567-89ab-4def-8123-456789abcdef", wellnessScore: score,
    createdAt: "2026-10-03T00:00:00Z" } } as HealthIntelligenceContext;
}
