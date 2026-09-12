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

type RecommendationText = {
  title: string;
  description: string;
};

const ORGAN_NAME_AR: Record<
  string,
  string
> = {
  heart: "القلب",
  liver: "الكبد",
  lung: "الرئة",
  lungs: "الرئتان",
  kidney: "الكلى",
  kidneys: "الكلى",
  brain: "الدماغ",
  metabolic: "الأيض",
  metabolism: "الأيض",
  general: "الصحة العامة",
  "general health":
    "الصحة العامة",
};

function localizeOrganName(
  value: string
): string {
  const clean =
    value.trim();

  return (
    ORGAN_NAME_AR[
      clean.toLowerCase()
    ] ??
    clean
  );
}

function getMonitorOrgan(
  action: HealthRecommendation
): string | null {
  const prefix =
    "Monitor ";

  if (
    action.id !==
      "monitor-priority-area" ||
    !action.title.startsWith(
      prefix
    )
  ) {
    return null;
  }

  return action.title
    .slice(prefix.length)
    .trim();
}

function getArabicRecommendationFallback(
  action: HealthRecommendation
): RecommendationText {
  switch (action.category) {
    case "assessment":
      return {
        title:
          "أكمل التقييم الصحي",
        description:
          "أكمل التقييم الصحي لتحديث أولوياتك وبناء صورة صحية أكثر وضوحًا.",
      };

    case "checkin":
      return {
        title:
          "حدّث حالتك الصحية",
        description:
          "أضف تحديثك الصحي الحالي لدعم المتابعة ومقارنة التغيّرات مع الوقت.",
      };

    case "report":
      return {
        title:
          "راجع التقارير الطبية",
        description:
          "أضف أو راجع بيانات التقارير الطبية لتحسين المعلومات الصحية المتاحة.",
      };

    case "follow-up":
      return {
        title:
          "تابع أولويتك الصحية",
        description:
          "استمر في متابعة أولويتك الصحية وحدّث المعلومات المهمة عند حدوث أي تغيّر.",
      };

    case "lifestyle":
      return {
        title:
          "استمر في العادات الصحية",
        description:
          "حافظ على خطوة صحية واقعية يمكن الاستمرار عليها ضمن روتينك اليومي.",
      };

    default:
      return {
        title:
          "تابع خطتك الصحية",
        description:
          "استمر في تحديث معلوماتك الصحية ومراجعة الخطوات التالية.",
      };
  }
}

function localizeRecommendation(
  action: HealthRecommendation,
  language: HealthPlanPresenterLanguage
): RecommendationText {
  if (language !== "ar") {
    return {
      title:
        action.title,

      description:
        action.description,
    };
  }

  switch (action.id) {
    case "complete-assessment":
      return {
        title:
          "أكمل أول تقييم صحي لك",
        description:
          "يلزم إكمال التقييم حتى يتمكن OrganHeal من تحديد المنطقة الصحية ذات الأولوية.",
      };

    case "monitor-priority-area": {
      const rawOrgan =
        getMonitorOrgan(action);

      const organ =
        rawOrgan
          ? localizeOrganName(
              rawOrgan
            )
          : "منطقة الأولوية الصحية";

      return {
        title:
          `تابع ${organ}`,

        description:
          `تابع الأعراض والعادات والتغيّرات المهمة المتعلقة بـ${organ}.`,
      };
    }

    case "upload-report":
      return {
        title:
          "ارفع تقريرًا طبيًا",
        description:
          "أضف بيانات المختبر أو التقرير الطبي لجعل خطتك الصحية أكثر تحديدًا.",
      };

    case "analyze-report":
      return {
        title:
          "حلّل أحدث تقرير طبي",
        description:
          "أنشئ ملخصًا واضحًا للمريض وتحليلًا صحيًا يساعد في التحضير لمراجعة الطبيب.",
      };

    case "compare-latest-reports":
      return {
        title:
          "قارن أحدث تقاريرك",
        description:
          "راجع الفروقات الموثقة بين أحدث التقارير وافهم ما تغيّر في البيانات الصحية المنظمة المتاحة.",
      };

    case "complete-checkin":
      return {
        title:
          "أكمل التحديث الصحي اليوم",
        description:
          "أضف معلوماتك الحالية عن النوم والتوتر والطاقة والنشاط والمزاج.",
      };

    case "repeat-checkin":
      return {
        title:
          "حدّث حالتك الصحية مرة أخرى",
        description:
          "حدّث الأعراض والحالة الصحية الحالية خلال الأيام القادمة لدعم المتابعة.",
      };

    case "professional-review":
      return {
        title:
          "راجع المؤشر الصحي المهم",
        description:
          "يوجد مؤشر صحي مهم يحتاج إلى المراجعة مع مختص مؤهل في الرعاية الصحية.",
      };

    case "maintain-healthy-routine":
      return {
        title:
          "حافظ على عادة صحية واقعية",
        description:
          "استمر في خطوة قابلة للتطبيق تتعلق بالنوم أو النشاط أو التغذية أو إدارة التوتر.",
      };

    case "review-health-plan":
      return {
        title:
          "استمر في خطتك الصحية الشخصية",
        description:
          "راجع خطوات اليوم واستمر في تحديث معلوماتك الصحية.",
      };

    default:
      return getArabicRecommendationFallback(
        action
      );
  }
}

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

function localizeHealthScoreSummary(
  healthScore:
    EngineResult<HealthScoreData>,
  language:
    HealthPlanPresenterLanguage
): string {
  if (language !== "ar") {
    return healthScore.data.summary;
  }

  return (
    `نتيجة الذكاء الصحي الحالية هي ${healthScore.data.score}/100، ` +
    `بناءً على البيانات الصحية المتاحة ونسبة اكتمالها. ` +
    `تتحسن جودة المتابعة كلما تم تحديث التقييمات والتحديثات الصحية والتقارير.`
  );
}

function localizeContributorLabel(
  contributor:
    HealthScoreData[
      "contributors"
    ][number]
): string {
  switch (contributor.id) {
    case "assessment":
      return "التقييم الصحي";

    case "checkin":
      return "التحديث الصحي";

    case "reports":
      return "التقارير الطبية";

    case "analysis":
      return "تحليل التقارير";

    case "history":
      return "السجل الصحي";

    case "findings":
      return "المؤشرات السريرية";

    default:
      return contributor.label;
  }
}

function localizeContributorExplanation(
  contributor:
    HealthScoreData[
      "contributors"
    ][number]
): string {
  switch (contributor.id) {
    case "assessment":
      return contributor.available
        ? `أدنى نتيجة حالية في التقييم الصحي هي ${contributor.score}/100.`
        : "لا يوجد تقييم صحي مكتمل متاح حاليًا.";

    case "checkin":
      return contributor.available
        ? `أحدث نتيجة للعافية هي ${contributor.score}/100.`
        : "لا يوجد تحديث صحي حديث متاح حاليًا.";

    case "reports":
      return contributor.available
        ? "تتوفر تقارير طبية ضمن بياناتك الصحية وتساهم في احتساب النتيجة."
        : "لا يوجد تقرير طبي متاح حاليًا.";

    case "analysis":
      return contributor.available
        ? "يوجد تحليل محفوظ للتقارير الطبية ضمن بياناتك الصحية."
        : "لا يوجد تحليل محفوظ للتقارير الطبية متاح حاليًا.";

    case "history":
      return contributor.available
        ? "يتوفر سجل صحي للمتابعة مع الوقت ويساهم في احتساب النتيجة."
        : "لا يتوفر سجل صحي طولي للمتابعة حاليًا.";

    case "findings":
      return contributor.available
        ? "تتوفر مؤشرات سريرية منظمة وتساهم في احتساب النتيجة."
        : "لا تتوفر مؤشرات سريرية منظمة حاليًا.";

    default:
      return contributor.explanation;
  }
}

function localizeHealthScoreContributors(
  contributors:
    HealthScoreData["contributors"],
  language:
    HealthPlanPresenterLanguage
): HealthScoreData["contributors"] {
  if (language !== "ar") {
    return contributors;
  }

  return contributors.map(
    (contributor) => ({
      ...contributor,

      label:
        localizeContributorLabel(
          contributor
        ),

      explanation:
        localizeContributorExplanation(
          contributor
        ),
    })
  );
}

export function buildHealthPlanViewModel({
  unifiedExperience,
  recommendations,
  healthScore,
  language,
}: BuildHealthPlanViewModelInput): HealthPlanViewModel {
  const primaryAction =
    unifiedExperience.primaryAction;

  const localizedPrimaryAction =
    localizeRecommendation(
      primaryAction,
      language
    );

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
        localizeHealthScoreSummary(
          healthScore,
          language
        ),

      contributors:
        localizeHealthScoreContributors(
          healthScore.data
            .contributors,
          language
        ),
    },

    todaysMission: {
      title:
        unifiedExperience.story
          .headline,

      primaryAction:
        localizedPrimaryAction
          .description ||
        localizedPrimaryAction.title,
    },

    nextAction: {
      title:
        localizedPrimaryAction
          .title,

      detail:
        localizedPrimaryAction
          .description,

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
      recommendations.data
        .weeklyActions
        .map((action) => {
          const localizedAction =
            localizeRecommendation(
              action,
              language
            );

          return (
            localizedAction.description ||
            localizedAction.title
          );
        }),

    nextReviewDays:
      unifiedExperience.review
        .nextReviewDays,
  };
}