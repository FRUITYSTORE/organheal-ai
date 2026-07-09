import { PatientSummary } from "@/lib/models/patient";
import { buildClinicalFindings } from "@/lib/health-intelligence/engines/clinical-findings.engine";
import { calculatePatientPriority } from "@/lib/health-intelligence/engines/priority.engine";
import { calculateHealthRisk } from "@/lib/health-intelligence/engines/risk.engine";
import { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";

export function buildHealthIntelligence(
  patient: PatientSummary
): HealthIntelligenceResult {
  const findings = buildClinicalFindings(patient);

  return {
    findings,
    priority: calculatePatientPriority(patient.assessments),
    risk: calculateHealthRisk(patient),
  };
}