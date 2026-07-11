import { ClinicalFinding } from "@/lib/health-intelligence/models/clinical-findings";
import { EngineResult } from "@/lib/health-intelligence/models/engine-result";
import { PatientSummary } from "@/lib/models/patient";

export type HealthScoreLevel =
  | "critical"
  | "high-concern"
  | "moderate"
  | "stable"
  | "strong";

export type HealthScoreContributor = {
  id:
    | "assessment"
    | "checkin"
    | "reports"
    | "analysis"
    | "history"
    | "findings";
  label: string;
  score: number;
  weight: number;
  weightedScore: number;
  available: boolean;
  explanation: string;
};

export type HealthScoreData = {
  score: number;
  level: HealthScoreLevel;
  contributors: HealthScoreContributor[];
  dataCompleteness: number;
  summary: string;
};

function clampScore(value: number) {
  return Math.min(Math.max(Math.round(value), 0), 100);
}

function getLowestAssessmentScore(patient: PatientSummary) {
  if (!patient.assessments.length) return null;

  return Math.min(
    ...patient.assessments.map((assessment) =>
      clampScore(assessment.score)
    )
  );
}

function getFindingsScore(findings: ClinicalFinding[]) {
  if (!findings.length) return null;

  const criticalCount = findings.filter(
    (finding) => finding.severity === "critical"
  ).length;

  if (criticalCount > 0) {
    return clampScore(40 - criticalCount * 10);
  }

  return 80;
}

function getHealthScoreLevel(score: number): HealthScoreLevel {
  if (score < 30) return "critical";
  if (score < 50) return "high-concern";
  if (score < 70) return "moderate";
  if (score < 85) return "stable";
  return "strong";
}

function getSummary(score: number, level: HealthScoreLevel) {
  switch (level) {
    case "critical":
      return `The current composite score is ${score}/100 and contains signals that need prompt review.`;
    case "high-concern":
      return `The current composite score is ${score}/100 and indicates a need for closer follow-up.`;
    case "moderate":
      return `The current composite score is ${score}/100 with opportunities to strengthen follow-up and data quality.`;
    case "stable":
      return `The current composite score is ${score}/100 and reflects a generally stable health intelligence profile.`;
    case "strong":
      return `The current composite score is ${score}/100 with strong available data and favorable current signals.`;
  }
}

export function calculateHealthScore(
  patient: PatientSummary,
  findings: ClinicalFinding[]
): EngineResult<HealthScoreData> {
  const assessmentScore = getLowestAssessmentScore(patient);
  const checkInScore =
    patient.latestCheckIn?.wellness_score !== undefined
      ? clampScore(patient.latestCheckIn.wellness_score)
      : null;

  const reportsScore =
    patient.uploadedReports.length > 0 ? 100 : null;

  const analysisScore =
    patient.generatedResults.length > 0 ? 100 : null;

  const historyScore =
    patient.historyItems.length > 0 ? 100 : null;

  const findingsScore = getFindingsScore(findings);

  const contributors: HealthScoreContributor[] = [
    {
      id: "assessment",
      label: "Priority assessment",
      score: assessmentScore ?? 0,
      weight: 35,
      weightedScore:
        assessmentScore === null ? 0 : assessmentScore * 0.35,
      available: assessmentScore !== null,
      explanation:
        assessmentScore === null
          ? "No completed assessment is currently available."
          : `The lowest current organ assessment score is ${assessmentScore}/100.`,
    },
    {
      id: "checkin",
      label: "Latest wellness Check-In",
      score: checkInScore ?? 0,
      weight: 20,
      weightedScore:
        checkInScore === null ? 0 : checkInScore * 0.2,
      available: checkInScore !== null,
      explanation:
        checkInScore === null
          ? "No wellness Check-In is currently available."
          : `The latest wellness score is ${checkInScore}/100.`,
    },
    {
      id: "reports",
      label: "Medical reports",
      score: reportsScore ?? 0,
      weight: 10,
      weightedScore:
        reportsScore === null ? 0 : reportsScore * 0.1,
      available: reportsScore !== null,
      explanation:
        reportsScore === null
          ? "No medical report is currently available."
          : `${patient.uploadedReports.length} medical report${
              patient.uploadedReports.length === 1 ? " is" : "s are"
            } available.`,
    },
    {
      id: "analysis",
      label: "Generated analysis",
      score: analysisScore ?? 0,
      weight: 15,
      weightedScore:
        analysisScore === null ? 0 : analysisScore * 0.15,
      available: analysisScore !== null,
      explanation:
        analysisScore === null
          ? "No generated report analysis is currently available."
          : `${patient.generatedResults.length} generated analysis result${
              patient.generatedResults.length === 1 ? " is" : "s are"
            } available.`,
    },
    {
      id: "history",
      label: "Health history",
      score: historyScore ?? 0,
      weight: 5,
      weightedScore:
        historyScore === null ? 0 : historyScore * 0.05,
      available: historyScore !== null,
      explanation:
        historyScore === null
          ? "No longitudinal health history is currently available."
          : `${patient.historyItems.length} health history item${
              patient.historyItems.length === 1 ? " is" : "s are"
            } available.`,
    },
    {
      id: "findings",
      label: "Clinical findings",
      score: findingsScore ?? 0,
      weight: 15,
      weightedScore:
        findingsScore === null ? 0 : findingsScore * 0.15,
      available: findingsScore !== null,
      explanation:
        findingsScore === null
          ? "No structured clinical findings are currently available."
          : `${findings.length} structured clinical finding${
              findings.length === 1 ? " is" : "s are"
            } available.`,
    },
  ];

  const availableContributors = contributors.filter(
    (contributor) => contributor.available
  );

  const availableWeight = availableContributors.reduce(
    (total, contributor) => total + contributor.weight,
    0
  );

  const weightedTotal = availableContributors.reduce(
    (total, contributor) => total + contributor.weightedScore,
    0
  );

  const score =
    availableWeight > 0
      ? clampScore(weightedTotal / (availableWeight / 100))
      : 0;

  const dataCompleteness = clampScore(availableWeight);
  const level = getHealthScoreLevel(score);

  return {
    status:
      availableContributors.length > 0
        ? "ready"
        : "insufficient-data",
    confidence: dataCompleteness,
    generatedAt: new Date().toISOString(),
    data: {
      score,
      level,
      contributors,
      dataCompleteness,
      summary: getSummary(score, level),
    },
  };
}