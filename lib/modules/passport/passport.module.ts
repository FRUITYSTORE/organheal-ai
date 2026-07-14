import type { EngineResult } from "@/lib/health-intelligence/models/engine-result";
import type { HealthPassportData } from "@/lib/health-intelligence/engines/health-passport.engine";
import type { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";

export type PassportModuleResult =
  EngineResult<HealthPassportData>;

export function getPassportFromIntelligence(
  intelligence: HealthIntelligenceResult
): PassportModuleResult {
  return intelligence.healthPassport;
}