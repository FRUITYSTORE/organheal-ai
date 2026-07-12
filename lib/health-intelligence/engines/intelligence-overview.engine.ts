import { EngineResult } from "@/lib/health-intelligence/models/engine-result";
import { PatientSummary } from "@/lib/models/patient";
import { generateHealthOpportunities } from "@/lib/opportunityEngine";
import { PatientPriorityResult } from "@/lib/health-intelligence/engines/priority.engine";
import {
  HealthRecommendation,
  RecommendationData,
} from "@/lib/health-intelligence/engines/recommendation.engine";
import { HealthScoreData } from "@/lib/health-intelligence/engines/health-score.engine";
import { DoctorBriefData } from "@/lib/health-intelligence/engines/doctor-brief.engine";

export type IntelligenceOverviewData = {
  healthProfile: string;
  overallScore: number;
  healthAgeStatus: string;
  priorityOrgan: string | null;
  priorityScore: number | null;
  potentialScore: number;
  strongestOrgan: string | null;
  strongestScore: number | null;
  riskPattern: string;
  potentialGain: number;
  opportunities: ReturnType<typeof generateHealthOpportunities>;
  opportunityTitle: string;
  bestNextAction: string;
};

type BuildIntelligenceOverviewInput = {
  patient: PatientSummary;
  priority: PatientPriorityResult;
  recommendations: EngineResult<RecommendationData>;
  healthScore: EngineResult<HealthScoreData>;
  doctorBrief: EngineResult<DoctorBriefData>;
};

function getStrongestAssessment(patient: PatientSummary) {
  if (!patient.assessments.length) return null;

  return [...patient.assessments].sort(
    (a, b) => b.score - a.score
  )[0];
}

function getPotentialGain(score: number) {
  if (score < 50) return 20;
  if (score < 60) return 16;
  if (score < 70) return 12;
  if (score < 80) return 8;

  return 4;
}

function getHealthAgeStatus(score: number) {
  if (score >= 85) return "Younger Health Profile";
  if (score >= 70) return "Balanced Health Age";
  if (score >= 50) return "Elevated Health Age";

  return "High Health Age";
}

function getOpportunityTitle(priorityOrgan: string | null) {
  switch (priorityOrgan) {
    case "Heart":
      return "Improve Heart Health";
    case "Metabolic":
      return "Improve Metabolic Health";
    case "Kidney":
      return "Support Kidney Health";
    case "Lung":
      return "Improve Lung Health";
    case "Brain":
      return "Improve Sleep & Recovery";
    default:
      return "Strengthen Preventive Health";
  }
}

function getBestNextAction(
  primaryAction: HealthRecommendation
) {
  return (
    primaryAction.description ||
    primaryAction.title ||
    "Continue regular health follow-up."
  );
}

export function buildIntelligenceOverview({
  patient,
  priority,
  recommendations,
  healthScore,
  doctorBrief,
}: BuildIntelligenceOverviewInput): EngineResult<IntelligenceOverviewData> {
  const overallScore = healthScore.data.score;
  const priorityOrgan = priority.data.priorityOrgan;
  const priorityScore = priority.data.priorityScore;
  const strongestAssessment = getStrongestAssessment(patient);

  const potentialGain = getPotentialGain(overallScore);
  const potentialScore = Math.min(
    100,
    overallScore + potentialGain
  );

  const opportunities = generateHealthOpportunities(
    patient.assessments.map((assessment) => ({
      organ: assessment.organ_name,
      score: assessment.score,
    }))
  );

  return {
    status:
      healthScore.status === "ready" ||
      priority.status === "ready"
        ? "ready"
        : "insufficient-data",

    confidence: Math.round(
      (
        healthScore.confidence +
        priority.confidence +
        recommendations.confidence +
        doctorBrief.confidence
      ) / 4
    ),

    generatedAt: new Date().toISOString(),

    data: {
      healthProfile: doctorBrief.data.profile,
      overallScore,
      healthAgeStatus: getHealthAgeStatus(overallScore),
      priorityOrgan,
      priorityScore,
      potentialScore,
      strongestOrgan: strongestAssessment?.organ_name ?? null,
      strongestScore: strongestAssessment?.score ?? null,
      riskPattern: doctorBrief.data.riskPattern,
      potentialGain,
      opportunities,
      opportunityTitle: getOpportunityTitle(priorityOrgan),
      bestNextAction: getBestNextAction(
        recommendations.data.primaryAction
      ),
    },
  };
}