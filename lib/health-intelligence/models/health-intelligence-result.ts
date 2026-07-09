import { PatientPriorityResult } from "@/lib/health-intelligence/engines/priority.engine";
import { HealthRiskResult } from "@/lib/health-intelligence/engines/risk.engine";

export type HealthIntelligenceResult = {
  priority: PatientPriorityResult;
  risk: HealthRiskResult;
};