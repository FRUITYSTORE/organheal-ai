import { AssessmentSummary } from "@/lib/models/assessment";
import {
  calculatePatientPriority,
  PatientPriorityResult,
} from "@/lib/health-intelligence/engines/priority.engine";

export type HealthIntelligenceResult = {
  priority: PatientPriorityResult;
};

export function buildHealthIntelligence(input: {
  assessments: AssessmentSummary[];
}): HealthIntelligenceResult {
  return {
    priority: calculatePatientPriority(input.assessments),
  };
}