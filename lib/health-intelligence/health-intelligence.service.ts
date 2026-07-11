import { PatientSummary } from "@/lib/models/patient";
import { buildClinicalFindings } from "@/lib/health-intelligence/engines/clinical-findings.engine";
import { calculatePatientPriority } from "@/lib/health-intelligence/engines/priority.engine";
import { calculateHealthRisk } from "@/lib/health-intelligence/engines/risk.engine";
import { generateHealthRecommendations } from "@/lib/health-intelligence/engines/recommendation.engine";
import { calculateHealthScore } from "@/lib/health-intelligence/engines/health-score.engine";
import { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";

export function buildHealthIntelligence(
  patient: PatientSummary
): HealthIntelligenceResult {
  const findings = buildClinicalFindings(patient);

  const recommendations = generateHealthRecommendations(
    patient,
    findings
  );

  const healthScore = calculateHealthScore(
    patient,
    findings
  );

  return {
    findings,
    priority: calculatePatientPriority(patient.assessments),
    risk: calculateHealthRisk(patient),
    recommendations,
    healthScore,
  };
}