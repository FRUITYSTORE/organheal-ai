import { EngineResult } from "@/lib/health-intelligence/models/engine-result";
import {
  HealthRecommendation,
  RecommendationData,
} from "@/lib/health-intelligence/engines/recommendation.engine";
import { HealthScoreData } from "@/lib/health-intelligence/engines/health-score.engine";

export type HealthPlanViewModel = {
  status: EngineResult<RecommendationData>["status"];
  confidence: number;
  generatedAt: string;

  healthScore: {
  score: number;
  level: HealthScoreData["level"];
  confidence: number;
  dataCompleteness: number;
  summary: string;
  contributors: HealthScoreData["contributors"];
};

  todaysMission: {
    title: string;
    primaryAction: string;
  };

  nextAction: {
    title: string;
    detail: string;
    href: string;
    button: string;
    priority: HealthRecommendation["priority"];
  };

  weeklyTasks: string[];
  nextReviewDays: number;
};

function getActionButton(action: HealthRecommendation) {
  switch (action.category) {
    case "assessment":
      return "Start Assessment";
    case "checkin":
      return "Open Check-In";
    case "report":
      return action.href === "/lab-upload"
        ? "Upload Report"
        : "Review Reports";
    case "follow-up":
      return "Review Follow-Up";
    case "lifestyle":
      return "View Health Plan";
    default:
      return "Continue";
  }
}

export function buildHealthPlanViewModel(
  recommendations: EngineResult<RecommendationData>,
  healthScore: EngineResult<HealthScoreData>
): HealthPlanViewModel {
  const { data, status, confidence, generatedAt } = recommendations;

  return {
    status,
    confidence,
    generatedAt,

 healthScore: {
  score: healthScore.data.score,
  level: healthScore.data.level,
  confidence: healthScore.confidence,
  dataCompleteness: healthScore.data.dataCompleteness,
  summary: healthScore.data.summary,
  contributors: healthScore.data.contributors,
},

    todaysMission: {
      title: data.todaysMission,
      primaryAction: data.primaryAction.description,
    },

    nextAction: {
      title: data.primaryAction.title,
      detail: data.primaryAction.description,
      href: data.primaryAction.href,
      button: getActionButton(data.primaryAction),
      priority: data.primaryAction.priority,
    },

    weeklyTasks: data.weeklyActions.map(
      (action) => action.description || action.title
    ),

    nextReviewDays: data.nextReviewDays,
  };
}