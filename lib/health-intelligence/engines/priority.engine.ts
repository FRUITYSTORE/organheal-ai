import { AssessmentSummary } from "@/lib/models/assessment";
import { EngineResult } from "@/lib/health-intelligence/models/engine-result";

export type PatientPriorityData = {
  priorityOrgan: string | null;
  priorityScore: number | null;
  riskLevel: "low" | "moderate" | "high" | "unknown";
  reason: string;
  nextAction: string;
};

export type PatientPriorityResult = EngineResult<PatientPriorityData>;

export function calculatePatientPriority(
  assessments: AssessmentSummary[]
): PatientPriorityResult {
  const generatedAt = new Date().toISOString();

  if (!assessments.length) {
    return {
      status: "insufficient-data",
      confidence: 0,
      generatedAt,
      data: {
        priorityOrgan: null,
        priorityScore: null,
        riskLevel: "unknown",
        reason: "No assessment data is available yet.",
        nextAction: "Complete your first health assessment.",
      },
    };
  }

  const sorted = [...assessments].sort((a, b) => a.score - b.score);
  const priority = sorted[0];

  const riskLevel =
    priority.score < 50 ? "high" : priority.score < 75 ? "moderate" : "low";

  const nextAction =
    riskLevel === "high"
      ? "Review this result with a healthcare professional."
      : riskLevel === "moderate"
      ? "Follow your health plan and monitor changes."
      : "Maintain healthy habits and continue regular follow-up.";

  return {
    status: "ready",
    confidence: assessments.length >= 3 ? 80 : 60,
    generatedAt,
    data: {
      priorityOrgan: priority.organ_name,
      priorityScore: priority.score,
      riskLevel,
      reason: `${priority.organ_name} has the lowest current score among available assessments.`,
      nextAction,
    },
  };
}