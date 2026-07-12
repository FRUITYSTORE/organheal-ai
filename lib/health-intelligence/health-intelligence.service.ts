import { PatientSummary } from "@/lib/models/patient";
import { buildClinicalFindings } from "@/lib/health-intelligence/engines/clinical-findings.engine";
import { calculatePatientPriority } from "@/lib/health-intelligence/engines/priority.engine";
import { calculateHealthRisk } from "@/lib/health-intelligence/engines/risk.engine";
import { generateHealthRecommendations } from "@/lib/health-intelligence/engines/recommendation.engine";
import { calculateHealthScore } from "@/lib/health-intelligence/engines/health-score.engine";
import { calculateHealthTrend } from "@/lib/health-intelligence/engines/trend.engine";
import { buildTrendSummary } from "@/lib/health-intelligence/engines/trend-summary.engine";
import { generateDoctorBrief } from "@/lib/health-intelligence/engines/doctor-brief.engine";
import { buildIntelligenceOverview } from "@/lib/health-intelligence/engines/intelligence-overview.engine";
import { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";

export function buildHealthIntelligence(
  patient: PatientSummary
): HealthIntelligenceResult {
  const findings = buildClinicalFindings(patient);

  const priority = calculatePatientPriority(patient.assessments);

  const risk = calculateHealthRisk(patient);

  const recommendations = generateHealthRecommendations(
    patient,
    findings
  );

  const healthScore = calculateHealthScore(
    patient,
    findings
  );

  const trend = calculateHealthTrend(patient);

  const trendSummary = buildTrendSummary(trend);

  const doctorBrief = generateDoctorBrief({
    patient,
    findings,
    priority,
    risk,
    recommendations,
    healthScore,
  });

  const intelligenceOverview = buildIntelligenceOverview({
    patient,
    priority,
    recommendations,
    healthScore,
    doctorBrief,
  });

  return {
    findings,
    priority,
    risk,
    recommendations,
    healthScore,
    trend,
    trendSummary,
    doctorBrief,
    intelligenceOverview,
  };
}