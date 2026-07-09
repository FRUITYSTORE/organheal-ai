import { ClinicalFinding } from "@/lib/health-intelligence/engines/clinical-findings.engine";
import { PatientPriorityResult } from "@/lib/health-intelligence/engines/priority.engine";
import { HealthRiskResult } from "@/lib/health-intelligence/engines/risk.engine";

export type HealthIntelligenceResult = {
  findings: ClinicalFinding[];
  priority: PatientPriorityResult;
  risk: HealthRiskResult;
};