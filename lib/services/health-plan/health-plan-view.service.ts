import type {
  EngineResult,
} from "@/lib/health-intelligence/models/engine-result";

import type {
  HealthRecommendation,
  RecommendationData,
} from "@/lib/health-intelligence/engines/recommendation.engine";

import type {
  HealthScoreData,
} from "@/lib/health-intelligence/engines/health-score.engine";

import type {
  UnifiedIntelligenceExperienceModel,
} from "@/lib/application/unified-intelligence/unified-intelligence-experience.model";

export type HealthPlanPresenterLanguage =
  | "en"
  | "ar";

export type HealthPlanViewModel = {
  status:
    UnifiedIntelligenceExperienceModel["status"];

  confidence:
    number;

  generatedAt:
    string;

  healthScore: {
    score:
      number;

    level:
      HealthScoreData["level"];

    confidence:
      number;

    dataCompleteness:
      number;

    summary:
      string;

    contributors:
      HealthScoreData["contributors"];
  };

  todaysMission: {
    title:
      string;

    primaryAction:
      string;
  };

  nextAction: {
    title:
      string;

    detail:
      string;

    href:
      string;

    button:
      string;

    priority:
      HealthRecommendation["priority"];
  };

  weeklyTasks:
    string[];

  nextReviewDays:
    number;
};

export type BuildHealthPlanViewModelInput = {
  unifiedExperience:
    UnifiedIntelligenceExperienceModel;

  recommendations:
    EngineResult<RecommendationData>;

  healthScore:
    EngineResult<HealthScoreData>;

  language:
    HealthPlanPresenterLanguage;
};

function getActionButton(
  action:
    UnifiedIntelligenceExperienceModel[
      "primaryAction"
    ],
  language:
    HealthPlanPresenterLanguage
): string {
  const isArabic =
    language === "ar";

  switch (action.category) {
    case "assessment":
      return isArabic
        ? "ابدأ التقييم"
        : "Start Assessment";

    case "checkin":
      return isArabic
        ? "افتح التحديث الصحي"
        : "Open Check-In";

    case "report":
      return action.href ===
        "/lab-upload"
        ? isArabic
          ? "ارفع تقريرًا"
          : "Upload Report"
        : isArabic
          ? "راجع التقارير"
          : "Review Reports";

    case "follow-up":
      return isArabic
        ? "راجع المتابعة"
        : "Review Follow-Up";

    case "lifestyle":
      return isArabic
        ? "اعرض الخطة الصحية"
        : "View Health Plan";

    default:
      return isArabic
        ? "متابعة"
        : "Continue";
  }
}

export function buildHealthPlanViewModel({
  unifiedExperience,
  recommendations,
  healthScore,
  language,
}: BuildHealthPlanViewModelInput): HealthPlanViewModel {
  const primaryAction =
    unifiedExperience.primaryAction;

  return {
    status:
      unifiedExperience.status,

    confidence:
      recommendations.confidence,

    generatedAt:
      unifiedExperience.generatedAt,

    healthScore: {
      score:
        healthScore.data.score,

      level:
        healthScore.data.level,

      confidence:
        healthScore.confidence,

      dataCompleteness:
        healthScore.data
          .dataCompleteness,

      summary:
        healthScore.data.summary,

      contributors:
        healthScore.data.contributors,
    },

    todaysMission: {
      title:
        unifiedExperience.story.headline,

      primaryAction:
        primaryAction.description ||
        primaryAction.title,
    },

    nextAction: {
      title:
        primaryAction.title,

      detail:
        primaryAction.description,

      href:
        primaryAction.href,

      button:
        getActionButton(
          primaryAction,
          language
        ),

      priority:
        primaryAction.priority,
    },

    weeklyTasks:
      recommendations.data.weeklyActions.map(
        (action) =>
          action.description ||
          action.title
      ),

    nextReviewDays:
      unifiedExperience.review
        .nextReviewDays,
  };
}