import { PatientSummary } from "@/lib/models/patient";
import { ClinicalFinding } from "@/lib/health-intelligence/models/clinical-findings";
import { EngineResult } from "@/lib/health-intelligence/models/engine-result";

export type RecommendationPriority = "urgent" | "high" | "routine";

export type HealthRecommendation = {
  id: string;
  title: string;
  description: string;
  priority: RecommendationPriority;
  category:
    | "assessment"
    | "checkin"
    | "report"
    | "follow-up"
    | "lifestyle";
  href: string;
};

export type RecommendationData = {
  todaysMission: string;
  primaryAction: HealthRecommendation;
  weeklyActions: HealthRecommendation[];
  nextReviewDays: number;
};

function getPriorityAssessment(patient: PatientSummary) {
  if (!patient.assessments.length) return null;

  return [...patient.assessments].sort((a, b) => a.score - b.score)[0];
}

function buildPrimaryAction(
  patient: PatientSummary,
  findings: ClinicalFinding[]
): HealthRecommendation {
  const criticalFinding = findings.find(
    (finding) => finding.severity === "critical"
  );

  if (criticalFinding) {
    return {
      id: "review-critical-finding",
      title: "Review the highest-priority health signal",
      description:
        "Review the current priority result and consider discussing it with a healthcare professional.",
      priority: "urgent",
      category: "follow-up",
      href: "/health-plan",
    };
  }

  if (!patient.assessments.length) {
    return {
      id: "complete-assessment",
      title: "Complete your first health assessment",
      description:
        "An assessment is needed before OrganHeal can build a personalized follow-up plan.",
      priority: "high",
      category: "assessment",
      href: "/assessment",
    };
  }

  if (!patient.uploadedReports.length) {
    return {
      id: "upload-report",
      title: "Upload a medical report",
      description:
        "Connect your assessment with laboratory or medical report data.",
      priority: "high",
      category: "report",
      href: "/lab-upload",
    };
  }

  if (!patient.generatedResults.length) {
    return {
      id: "analyze-report",
      title: "Generate report analysis",
      description:
        "Turn the uploaded report into patient-friendly and doctor-ready intelligence.",
      priority: "high",
      category: "report",
      href: "/reports",
    };
  }

  if (!patient.latestCheckIn) {
    return {
      id: "complete-checkin",
      title: "Complete today’s Check-In",
      description:
        "Add your current wellness status so the plan reflects how you feel today.",
      priority: "high",
      category: "checkin",
      href: "/checkin",
    };
  }

  return {
    id: "review-health-plan",
    title: "Continue your personalized health plan",
    description:
      "Review today’s actions and keep your follow-up information updated.",
    priority: "routine",
    category: "follow-up",
    href: "/health-plan",
  };
}

function buildWeeklyActions(
  patient: PatientSummary,
  findings: ClinicalFinding[]
): HealthRecommendation[] {
  const actions: HealthRecommendation[] = [];
  const priorityAssessment = getPriorityAssessment(patient);

  if (priorityAssessment) {
    actions.push({
      id: "monitor-priority-area",
      title: `Monitor ${priorityAssessment.organ_name}`,
      description: `Track symptoms, habits, and changes related to ${priorityAssessment.organ_name} during the next 7 days.`,
      priority: priorityAssessment.score < 50 ? "high" : "routine",
      category: "follow-up",
      href: "/health-plan",
    });
  }

  if (
    !patient.latestCheckIn ||
    (patient.latestCheckIn.wellness_score ?? 100) < 70
  ) {
    actions.push({
      id: "repeat-checkin",
      title: "Update your wellness Check-In",
      description:
        "Complete another Check-In within the next 3 days to track changes.",
      priority: "high",
      category: "checkin",
      href: "/checkin",
    });
  }

  if (patient.uploadedReports.length && !patient.generatedResults.length) {
    actions.push({
      id: "complete-report-analysis",
      title: "Complete report analysis",
      description:
        "Generate structured intelligence from your latest uploaded report.",
      priority: "high",
      category: "report",
      href: "/reports",
    });
  }

  if (findings.some((finding) => finding.severity === "critical")) {
    actions.push({
      id: "professional-review",
      title: "Consider professional review",
      description:
        "A critical signal is present. Review it with a qualified healthcare professional.",
      priority: "urgent",
      category: "follow-up",
      href: "/doctor-portal",
    });
  }

  actions.push({
    id: "healthy-routine",
    title: "Maintain one realistic healthy routine",
    description:
      "Choose one achievable action involving sleep, activity, nutrition, or stress management.",
    priority: "routine",
    category: "lifestyle",
    href: "/health-plan",
  });

  return actions.slice(0, 4);
}

export function generateHealthRecommendations(
  patient: PatientSummary,
  findings: ClinicalFinding[]
): EngineResult<RecommendationData> {
  const generatedAt = new Date().toISOString();
  const primaryAction = buildPrimaryAction(patient, findings);
  const weeklyActions = buildWeeklyActions(patient, findings);
  const priorityAssessment = getPriorityAssessment(patient);

  const todaysMission = priorityAssessment
    ? `Focus today on ${priorityAssessment.organ_name} and complete the highest-impact action.`
    : "Complete the first step needed to build your personalized health plan.";

  const hasMinimumData =
    patient.assessments.length > 0 || patient.uploadedReports.length > 0;

  return {
    status: hasMinimumData ? "ready" : "insufficient-data",
    confidence:
      patient.assessments.length > 0 &&
      patient.latestCheckIn &&
      patient.uploadedReports.length > 0
        ? 85
        : hasMinimumData
          ? 60
          : 0,
    generatedAt,
    data: {
      todaysMission,
      primaryAction,
      weeklyActions,
      nextReviewDays: primaryAction.priority === "urgent" ? 1 : 7,
    },
  };
}