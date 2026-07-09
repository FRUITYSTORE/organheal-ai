import { PatientPriorityResult } from "@/lib/health-intelligence/engines/priority.engine";

export type HealthIntelligenceResult = {
  priority: PatientPriorityResult;
};