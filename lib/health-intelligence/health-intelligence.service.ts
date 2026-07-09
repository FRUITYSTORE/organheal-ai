import { PatientSummary } from "@/lib/models/patient";
import { calculatePatientPriority } from "@/lib/health-intelligence/engines/priority.engine";
import { calculateHealthRisk } from "@/lib/health-intelligence/engines/risk.engine";
import { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";

export function buildHealthIntelligence(
  patient: PatientSummary
): HealthIntelligenceResult {
  return {
    priority: calculatePatientPriority(patient.assessments),
    risk: calculateHealthRisk(patient),
  };
}