import { PatientSummary } from "@/lib/models/patient";
import { ClinicalFinding } from "@/lib/health-intelligence/models/clinical-findings";
import { EngineResult } from "@/lib/health-intelligence/models/engine-result";

export type RecommendationPriority = "urgent" | "high" | "routine";

export type RecommendationCategory =
  | "assessment"
  | "checkin"
  | "report"
  | "follow-up"
  | "lifestyle";

export type HealthRecommendation = {
  id: string;
  title: string;
  description: string;
  priority: RecommendationPriority;
  category: RecommendationCategory;
  href: string;
  score: number;
  reasons: string[];
};

export type RecommendationData = {
  todaysMission: string;
  primaryAction: HealthRecommendation;
  weeklyActions: HealthRecommendation[];
  nextReviewDays: number;
};

function clampScore(score: number) {
  return Math.min(Math.max(Math.round(score), 0), 100);
}

function getPriorityFromScore(
  score: number
): RecommendationPriority {
  if (score >= 80) return "urgent";
  if (score >= 50) return "high";
  return "routine";
}

function getPriorityAssessment(patient: PatientSummary) {
  if (!patient.assessments.length) return null;

  return [...patient.assessments].sort(
    (a, b) => a.score - b.score
  )[0];
}

function createRecommendation({
  id,
  title,
  description,
  category,
  href,
  score,
  reasons,
}: {
  id: string;
  title: string;
  description: string;
  category: RecommendationCategory;
  href: string;
  score: number;
  reasons: string[];
}): HealthRecommendation {
  const normalizedScore = clampScore(score);

  return {
    id,
    title,
    description,
    category,
    href,
    score: normalizedScore,
    priority: getPriorityFromScore(normalizedScore),
    reasons,
  };
}

function buildRecommendationCandidates(
  patient: PatientSummary,
  findings: ClinicalFinding[]
): HealthRecommendation[] {
  const recommendations: HealthRecommendation[] = [];

  const priorityAssessment = getPriorityAssessment(patient);
  const wellnessScore =
    patient.latestCheckIn?.wellness_score ?? null;

  const criticalFindings = findings.filter(
    (finding) => finding.severity === "critical"
  );

  if (!patient.assessments.length) {
    recommendations.push(
      createRecommendation({
        id: "complete-assessment",
        title: "Complete your first health assessment",
        description:
          "An assessment is needed before OrganHeal can identify your priority health area.",
        category: "assessment",
        href: "/assessment",
        score: 85,
        reasons: [
          "No health assessment is currently available.",
          "Priority organ and assessment score cannot yet be calculated.",
        ],
      })
    );
  }

  if (priorityAssessment) {
    const assessmentUrgency = clampScore(
      100 - priorityAssessment.score
    );

    recommendations.push(
      createRecommendation({
        id: "monitor-priority-area",
        title: `Monitor ${priorityAssessment.organ_name}`,
        description: `Track symptoms, habits, and meaningful changes related to ${priorityAssessment.organ_name}.`,
        category: "follow-up",
        href: "/health-plan",
        score: assessmentUrgency,
        reasons: [
          `The current assessment score is ${priorityAssessment.score}/100.`,
          `${priorityAssessment.organ_name} is the current priority area.`,
        ],
      })
    );
  }

  if (!patient.uploadedReports.length) {
    recommendations.push(
      createRecommendation({
        id: "upload-report",
        title: "Upload a medical report",
        description:
          "Add laboratory or medical report data to make the health plan more specific.",
        category: "report",
        href: "/lab-upload",
        score: patient.assessments.length ? 65 : 45,
        reasons: [
          "No uploaded medical report is currently available.",
          "Clinical report data would improve recommendation quality.",
        ],
      })
    );
  }

  if (
    patient.uploadedReports.length > 0 &&
    !patient.generatedResults.length
  ) {
    recommendations.push(
      createRecommendation({
        id: "analyze-report",
        title: "Analyze the latest medical report",
        description:
          "Generate a patient-friendly summary and doctor-ready health intelligence.",
        category: "report",
        href: "/reports",
        score: 72,
        reasons: [
          "At least one report is available.",
          "No generated report analysis is currently saved.",
        ],
      })
    );
  }

  if (!patient.latestCheckIn) {
    recommendations.push(
      createRecommendation({
        id: "complete-checkin",
        title: "Complete today's Check-In",
        description:
          "Add your current sleep, stress, energy, activity, and mood information.",
        category: "checkin",
        href: "/checkin",
        score: patient.assessments.length ? 58 : 35,
        reasons: [
          "No current wellness Check-In is available.",
          "Daily wellness information is needed to personalize the plan.",
        ],
      })
    );
  }

  if (wellnessScore !== null && wellnessScore < 70) {
    const wellnessUrgency = clampScore(
      100 - wellnessScore + 20
    );

    recommendations.push(
      createRecommendation({
        id: "repeat-checkin",
        title: "Repeat your wellness Check-In",
        description:
          "Update your current symptoms and wellness status within the next few days.",
        category: "checkin",
        href: "/checkin",
        score: wellnessUrgency,
        reasons: [
          `The latest wellness score is ${wellnessScore}/100.`,
          "A lower wellness score needs closer short-term follow-up.",
        ],
      })
    );
  }

  if (criticalFindings.length > 0) {
    recommendations.push(
      createRecommendation({
        id: "professional-review",
        title: "Review the critical health signal",
        description:
          "A critical signal is present and should be reviewed with a qualified healthcare professional.",
        category: "follow-up",
        href: "/doctor-portal",
        score: 100,
        reasons: [
          `${criticalFindings.length} critical finding${
            criticalFindings.length === 1 ? " is" : "s are"
          } present.`,
          "Critical findings require the highest review priority.",
        ],
      })
    );
  }

  if (
    patient.assessments.length > 0 &&
    patient.uploadedReports.length > 0 &&
    patient.generatedResults.length > 0 &&
    patient.latestCheckIn
  ) {
    recommendations.push(
      createRecommendation({
        id: "maintain-healthy-routine",
        title: "Maintain one realistic healthy routine",
        description:
          "Continue one achievable action involving sleep, activity, nutrition, or stress management.",
        category: "lifestyle",
        href: "/health-plan",
        score: 30,
        reasons: [
          "Core health data sources are currently available.",
          "The plan can now focus on practical maintenance and prevention.",
        ],
      })
    );
  }

  if (!recommendations.length) {
    recommendations.push(
      createRecommendation({
        id: "review-health-plan",
        title: "Continue your personalized health plan",
        description:
          "Review today's actions and keep your health information updated.",
        category: "follow-up",
        href: "/health-plan",
        score: 25,
        reasons: [
          "No higher-priority missing data or critical signal was identified.",
        ],
      })
    );
  }

  return recommendations.sort(
    (a, b) => b.score - a.score
  );
}

function buildTodaysMission(
  primaryAction: HealthRecommendation,
  patient: PatientSummary
) {
  const priorityAssessment = getPriorityAssessment(patient);

  if (primaryAction.priority === "urgent") {
    return `Act today: ${primaryAction.title}.`;
  }

  if (priorityAssessment) {
    return `Focus today on ${priorityAssessment.organ_name}: ${primaryAction.title}.`;
  }

  return primaryAction.title;
}

function getNextReviewDays(
  primaryAction: HealthRecommendation
) {
  if (primaryAction.priority === "urgent") return 1;
  if (primaryAction.priority === "high") return 3;
  return 7;
}

function calculateConfidence(patient: PatientSummary) {
  let confidence = 0;

  if (patient.assessments.length > 0) confidence += 30;
  if (patient.uploadedReports.length > 0) confidence += 25;
  if (patient.generatedResults.length > 0) confidence += 25;
  if (patient.latestCheckIn) confidence += 15;
  if (patient.historyItems.length > 0) confidence += 5;

  return clampScore(confidence);
}

export function generateHealthRecommendations(
  patient: PatientSummary,
  findings: ClinicalFinding[]
): EngineResult<RecommendationData> {
  const generatedAt = new Date().toISOString();

  const recommendations = buildRecommendationCandidates(
    patient,
    findings
  );

  const primaryAction = recommendations[0];
  const weeklyActions = recommendations.slice(1, 5);

  if (weeklyActions.length === 0) {
    weeklyActions.push(primaryAction);
  }

  const confidence = calculateConfidence(patient);

  return {
    status:
      patient.assessments.length > 0 ||
      patient.uploadedReports.length > 0
        ? "ready"
        : "insufficient-data",
    confidence,
    generatedAt,
    data: {
      todaysMission: buildTodaysMission(
        primaryAction,
        patient
      ),
      primaryAction,
      weeklyActions,
      nextReviewDays: getNextReviewDays(primaryAction),
    },
  };
}