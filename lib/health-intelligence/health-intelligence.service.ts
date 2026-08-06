import { PatientSummary } from "@/lib/models/patient";
import { buildClinicalFindings } from "@/lib/health-intelligence/engines/clinical-findings.engine";
import { calculatePatientPriority } from "@/lib/health-intelligence/engines/priority.engine";
import { calculateHealthRisk } from "@/lib/health-intelligence/engines/risk.engine";
import { generateHealthRecommendations } from "@/lib/health-intelligence/engines/recommendation.engine";
import { calculateHealthScore } from "@/lib/health-intelligence/engines/health-score.engine";
import { calculateHealthTrend } from "@/lib/health-intelligence/engines/trend.engine";
import { buildTrendSummary } from "@/lib/health-intelligence/engines/trend-summary.engine";
import { buildHealthTimeline } from "@/lib/health-intelligence/engines/health-timeline.engine";
import { generateDoctorBrief } from "@/lib/health-intelligence/engines/doctor-brief.engine";
import { buildIntelligenceOverview } from "@/lib/health-intelligence/engines/intelligence-overview.engine";
import { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";
import { detectHealthPatterns } from "@/lib/health-intelligence/engines/health-pattern.engine";
import { buildHealthEvidence } from "@/lib/health-intelligence/engines/health-evidence.engine";
import { buildHealthPassport } from "@/lib/health-intelligence/engines/health-passport.engine";
import {
  buildWholeBodyClinicalKnowledge,
} from "@/lib/health-intelligence/builders/whole-body-clinical-knowledge.builder";

export function buildHealthIntelligence(
  patient: PatientSummary
): HealthIntelligenceResult {
    const findings =
    buildClinicalFindings(
      patient
    );

  const wholeBodyKnowledge =
    buildWholeBodyClinicalKnowledge(
      patient
    );

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
  const timeline = buildHealthTimeline({
  patient,
  trend,
});

  const doctorBrief = generateDoctorBrief({
    patient,
    findings,
    priority,
    risk,
    recommendations,
    healthScore,
  });

  const patterns = detectHealthPatterns({
  patient,
  findings,
  trend,
  timeline,
});

const evidence = buildHealthEvidence({
  patient,
  findings,
  priority,
  healthScore,
  trend,
  patterns,
  timeline,
});

  const intelligenceOverview = buildIntelligenceOverview({
    patient,
    priority,
    recommendations,
    healthScore,
    doctorBrief,
  });

  const healthPassport = buildHealthPassport({
  patient,
  healthScore,
  priority,
  intelligenceOverview,
});

  return {
  findings,
  priority,
  risk,
  recommendations,
  healthScore,
  trend,
  trendSummary,
  timeline,
  patterns,
  evidence,
  doctorBrief,
    intelligenceOverview,
  healthPassport,
  wholeBodyKnowledge,
};
}