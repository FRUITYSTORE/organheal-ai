import { AssessmentSummary } from "@/lib/models/assessment";
import {
  calculatePatientPriority,
  PatientPriorityResult,
} from "@/lib/health-intelligence/engines/priority.engine";

import { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";

export function buildHealthIntelligence(input: {
  assessments: AssessmentSummary[];
}): HealthIntelligenceResult {
  return {
    priority: calculatePatientPriority(input.assessments),
  };
}