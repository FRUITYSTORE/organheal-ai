import { PatientSummary } from "@/lib/models/patient";
import { EngineResult } from "@/lib/health-intelligence/models/engine-result";

export type HealthRiskLevel = "low" | "moderate" | "high" | "unknown";

export type HealthRiskData = {
  overallRisk: HealthRiskLevel;
  drivers: string[];
  recommendation: string;
};

export type HealthRiskResult = EngineResult<HealthRiskData>;

export function calculateHealthRisk(
  patient: PatientSummary
): HealthRiskResult {
  const generatedAt = new Date().toISOString();
  const drivers: string[] = [];

  if (!patient.assessments.length) {
    return {
      status: "insufficient-data",
      confidence: 0,
      generatedAt,
      data: {
        overallRisk: "unknown",
        drivers: ["No assessment data is available yet."],
        recommendation: "Complete your first health assessment.",
      },
    };
  }

  const lowestAssessment = [...patient.assessments].sort(
    (a, b) => a.score - b.score
  )[0];

  if (lowestAssessment.score < 50) {
    drivers.push(`${lowestAssessment.organ_name} assessment is below 50.`);
  } else if (lowestAssessment.score < 75) {
    drivers.push(`${lowestAssessment.organ_name} assessment is below target.`);
  }

  if (
    patient.latestCheckIn &&
    patient.latestCheckIn.wellness_score < 60
  ) {
    drivers.push("Latest Check-In wellness score is below 60.");
  }

  const hasReports = patient.uploadedReports.length > 0;
  const hasGeneratedInsights = patient.generatedResults.length > 0;

  if (hasReports && !hasGeneratedInsights) {
    drivers.push(
      "Reports are uploaded but analysis is not fully generated yet."
    );
  }

  const overallRisk =
    lowestAssessment.score < 50 ||
    (patient.latestCheckIn?.wellness_score ?? 100) < 50
      ? "high"
      : lowestAssessment.score < 75 ||
        (patient.latestCheckIn?.wellness_score ?? 100) < 70
      ? "moderate"
      : "low";

  return {
    status: "ready",
    confidence:
      patient.assessments.length >= 3
        ? 85
        : patient.assessments.length >= 1
        ? 65
        : 0,
    generatedAt,
    data: {
      overallRisk,
      drivers: drivers.length
        ? drivers
        : ["No major risk drivers detected."],
      recommendation:
        overallRisk === "high"
          ? "Review this risk with a healthcare professional and keep your follow-up data updated."
          : overallRisk === "moderate"
          ? "Follow your health plan and update Check-In regularly."
          : "Maintain healthy habits and continue routine follow-up.",
    },
  };
}