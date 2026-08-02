import type {
  HealthTimelineEventType,
  HealthTimelineSeverity,
} from "@/lib/health-intelligence/engines/health-timeline.engine";

export type HealthJourneyStageType =
  | "profile_started"
  | "assessment_completed"
  | "priority_identified"
  | "checkin_recorded"
  | "followup_due"
  | "report_uploaded"
  | "analysis_generated"
  | "passport_updated"
  | "trend_changed"
  | "plan_updated"
  | "doctor_brief_ready";

export type HealthJourneyStageStatus =
  | "completed"
  | "current"
  | "upcoming";

export type HealthJourneyStageTone =
  | "information"
  | "success"
  | "warning"
  | "critical";

export type HealthJourneyStage = {
  id: string;
  type: HealthJourneyStageType;
  status: HealthJourneyStageStatus;
  tone: HealthJourneyStageTone;

    title: string;
  description: string;

  reason: string | null;
  recommendedAction: string | null;
  confidence: number | null;

  date: string | null;
  organ: string | null;
  score: number | null;
  href: string | null;

  metadata: Record<
    string,
    string | number | boolean | null
  >;
};

export type HealthJourneyMilestone = {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
};

export type HealthJourneyData = {
  stages: HealthJourneyStage[];

  completedStages: number;
  currentStage: HealthJourneyStage | null;
  latestCompletedStage: HealthJourneyStage | null;

  journeyProgress: number;
  journeyStarted: boolean;

  nextMilestone: HealthJourneyMilestone | null;

  summary: string;
  lastUpdated: string | null;
};

export type HealthJourneyEngineInput = {
  language?: "en" | "ar";

  timelineEvents: Array<{
  id: string;
  type: HealthTimelineEventType;
  severity: HealthTimelineSeverity;
  title: string;
  description: string;
  date: string;
  organ: string | null;
  score: number | null;
  href: string | null;
}>;

  passport: {
    overallScore: number;
    priorityArea: string | null;
    priorityScore: number | null;
    availableSourceCount: number;
    totalDataPoints: number;
    lastUpdated: string | null;
  } | null;

  hasHealthPlan: boolean;
  hasDoctorBrief: boolean;
};

const CORE_JOURNEY_TYPES: HealthJourneyStageType[] = [
  "profile_started",
  "assessment_completed",
  "checkin_recorded",
  "report_uploaded",
  "analysis_generated",
  "passport_updated",
  "plan_updated",
  "doctor_brief_ready",
];

function getTimestamp(
  value: string | null
): number {
  if (!value) return 0;

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

function mapTimelineType(
  type: HealthJourneyEngineInput["timelineEvents"][number]["type"]
): HealthJourneyStageType {
  if (type === "assessment") {
    return "assessment_completed";
  }

  if (type === "checkin") {
    return "checkin_recorded";
  }

  if (type === "followup") {
    return "followup_due";
  }

  if (type === "report") {
    return "report_uploaded";
  }

  if (type === "analysis") {
    return "analysis_generated";
  }

  return "trend_changed";
}

function getStageCopy(
  type: HealthJourneyStageType,
  language: "en" | "ar"
): {
  title: string;
  description: string;
} {
  const isArabic = language === "ar";

  const copy: Record<
    HealthJourneyStageType,
    {
      enTitle: string;
      arTitle: string;
      enDescription: string;
      arDescription: string;
    }
  > = {
    profile_started: {
      enTitle: "Health journey started",
      arTitle: "بدأت الرحلة الصحية",
      enDescription:
        "Your first health record started the OrganHeal journey.",
      arDescription:
        "بدأ أول سجل صحي لديك رحلة OrganHeal.",
    },

    assessment_completed: {
      enTitle: "Health assessment completed",
      arTitle: "اكتمل التقييم الصحي",
      enDescription:
        "A structured health assessment was added to your journey.",
      arDescription:
        "تمت إضافة تقييم صحي منظم إلى رحلتك.",
    },

    priority_identified: {
      enTitle: "Health priority identified",
      arTitle: "تم تحديد الأولوية الصحية",
      enDescription:
        "OrganHeal identified the health area that needs the most attention.",
      arDescription:
        "حدد OrganHeal المنطقة الصحية التي تحتاج إلى أكبر قدر من الاهتمام.",
    },

    checkin_recorded: {
      enTitle: "Wellness update recorded",
      arTitle: "تم تسجيل تحديث العافية",
      enDescription:
        "A wellness check-in added new daily context to your journey.",
      arDescription:
        "أضاف Check-In جديد سياقًا يوميًا إلى رحلتك الصحية.",
    },

    followup_due: {
  enTitle: "Health follow-up is due",
  arTitle: "حان موعد المتابعة الصحية",
  enDescription:
    "A new Check-In is needed to refresh your current health journey.",
  arDescription:
    "يلزم إجراء Check-In جديد لتحديث رحلتك الصحية الحالية.",
},

    report_uploaded: {
      enTitle: "Medical evidence added",
      arTitle: "تمت إضافة دليل طبي",
      enDescription:
        "A medical report added new evidence to your Health Passport.",
      arDescription:
        "أضاف تقرير طبي دليلًا جديدًا إلى جواز الصحة.",
    },

    analysis_generated: {
      enTitle: "Health intelligence updated",
      arTitle: "تم تحديث الذكاء الصحي",
      enDescription:
        "OrganHeal generated personalized intelligence from your connected data.",
      arDescription:
        "أنشأ OrganHeal ذكاءً صحيًا مخصصًا من بياناتك المترابطة.",
    },

    passport_updated: {
      enTitle: "Health Passport updated",
      arTitle: "تم تحديث جواز الصحة",
      enDescription:
        "Your connected health profile was refreshed with the latest available data.",
      arDescription:
        "تم تحديث ملفك الصحي المترابط بأحدث البيانات المتاحة.",
    },

    trend_changed: {
      enTitle: "Health trend detected",
      arTitle: "تم اكتشاف اتجاه صحي",
      enDescription:
        "A meaningful change was detected across your health records.",
      arDescription:
        "تم اكتشاف تغير مهم عبر سجلاتك الصحية.",
    },

    plan_updated: {
      enTitle: "Health plan ready",
      arTitle: "الخطة الصحية جاهزة",
      enDescription:
        "Your follow-up actions are organized into a personalized health plan.",
      arDescription:
        "تم تنظيم إجراءات المتابعة ضمن خطة صحية مخصصة.",
    },

    doctor_brief_ready: {
      enTitle: "Doctor Brief ready",
      arTitle: "ملخص الطبيب جاهز",
      enDescription:
        "Your health information is prepared for a more focused clinical discussion.",
      arDescription:
        "تم تجهيز معلوماتك الصحية لمناقشة سريرية أكثر تركيزًا.",
    },
  };

  const selected = copy[type];

  return {
    title: isArabic
      ? selected.arTitle
      : selected.enTitle,
    description: isArabic
      ? selected.arDescription
      : selected.enDescription,
  };
}

function buildNextMilestone(
  input: HealthJourneyEngineInput
): {
  stage: HealthJourneyStage;
  milestone: HealthJourneyMilestone;
} | null {
  const language = input.language ?? "en";
  const isArabic = language === "ar";

  const hasAssessment =
    input.timelineEvents.some(
      (event) => event.type === "assessment"
    );

  const hasCheckIn =
    input.timelineEvents.some(
      (event) => event.type === "checkin"
    );

  const hasReport =
    input.timelineEvents.some(
      (event) => event.type === "report"
    );

  const hasAnalysis =
    input.timelineEvents.some(
      (event) => event.type === "analysis"
    );

  let type: HealthJourneyStageType;
  let href: string;
  let actionLabel: string;

  if (!hasAssessment) {
    type = "assessment_completed";
    href = "/assessment";
    actionLabel = isArabic
      ? "ابدأ التقييم"
      : "Start Assessment";
  } else if (!hasCheckIn) {
    type = "checkin_recorded";
    href = "/checkin";
    actionLabel = isArabic
      ? "افتح Check-In"
      : "Open Check-In";
  } else if (!hasReport) {
    type = "report_uploaded";
    href = "/lab-upload";
    actionLabel = isArabic
      ? "ارفع تقريرًا"
      : "Upload Report";
  } else if (!hasAnalysis) {
    type = "analysis_generated";
    href = "/reports";
    actionLabel = isArabic
      ? "راجع التحليل"
      : "Review Analysis";
  } else if (!input.hasHealthPlan) {
    type = "plan_updated";
    href = "/health-plan";
    actionLabel = isArabic
      ? "افتح الخطة الصحية"
      : "Open Health Plan";
  } else if (!input.hasDoctorBrief) {
    type = "doctor_brief_ready";
    href = "/intelligence";
    actionLabel = isArabic
      ? "جهّز ملخص الطبيب"
      : "Prepare Doctor Brief";
  } else {
    return null;
  }

  const copy = getStageCopy(
    type,
    language
  );

  return {
    stage: {
      id: `upcoming-${type}`,
      type,
      status: "upcoming",
      tone: "information",
            title: copy.title,
      description: copy.description,
      reason:
        language === "ar"
          ? "هذه هي أول مرحلة أساسية غير مكتملة في رحلتك الصحية."
          : "This is the first incomplete core stage in your health journey.",
      recommendedAction: actionLabel,
      confidence: null,
      date: null,
      organ: null,
      score: null,
      href,
      metadata: {
        generatedBy: "health-journey-engine",
        upcoming: true,
      },
    },

    milestone: {
      title: copy.title,
      description: copy.description,
      href,
      actionLabel,
    },
  };
}

export function buildHealthJourney(
  input: HealthJourneyEngineInput
): HealthJourneyData {
  const language = input.language ?? "en";
  const stages: HealthJourneyStage[] = [];

  const sortedEvents = [
    ...input.timelineEvents,
  ].sort(
    (first, second) =>
      getTimestamp(first.date) -
      getTimestamp(second.date)
  );

  const journeyStarted =
    sortedEvents.length > 0 ||
    input.passport !== null;

  const firstDate =
    sortedEvents[0]?.date ??
    input.passport?.lastUpdated ??
    null;

  if (journeyStarted) {
    const profileCopy = getStageCopy(
      "profile_started",
      language
    );

    stages.push({
      id: "journey-profile-started",
      type: "profile_started",
      status: "completed",
      tone: "information",
            title: profileCopy.title,
      description: profileCopy.description,
      reason:
        language === "ar"
          ? "تم اكتشاف أول سجل صحي أو جواز صحة متاح للمستخدم."
          : "The first available health record or Health Passport was detected.",
      recommendedAction: getRecommendedAction(
        "profile_started",
        language
      ),
      confidence: null,
      date: firstDate,
      organ: null,
      score: null,
      href: "/profile",
      metadata: {
        generatedBy: "health-journey-engine",
      },
    });
  }

  for (const event of sortedEvents) {
    const stageType = mapTimelineType(
      event.type
    );

    const defaultCopy = getStageCopy(
      stageType,
      language
    );

    stages.push({
      id: `journey-${event.id}`,
      type: stageType,
      status: "completed",
      tone: event.severity,
      title:
        event.title.trim().length > 0
          ? event.title
          : defaultCopy.title,
            description:
        event.description.trim().length > 0
          ? event.description
          : defaultCopy.description,
      reason:
        event.description.trim().length > 0
          ? event.description
          : null,
      recommendedAction: getRecommendedAction(
        stageType,
        language
      ),
      confidence: null,
      date: event.date,
      organ: event.organ,
      score: event.score,
      href: event.href,
      metadata: {
        sourceEventId: event.id,
        sourceEventType: event.type,
      },
    });
  }

  if (
    input.passport?.priorityArea
  ) {
    const priorityCopy = getStageCopy(
      "priority_identified",
      language
    );

    stages.push({
      id: "journey-priority-identified",
      type: "priority_identified",
      status: "completed",
      tone:
        input.passport.priorityScore !== null &&
        input.passport.priorityScore < 40
          ? "critical"
          : "warning",
      title: priorityCopy.title,
            description:
        language === "ar"
          ? `تم تحديد ${input.passport.priorityArea} كأولوية صحية حالية.`
          : `${input.passport.priorityArea} was identified as your current health priority.`,
      reason:
        input.passport.priorityScore !== null
          ? language === "ar"
            ? `تم تحديد الأولوية بناءً على مؤشر ${input.passport.priorityScore}/100 مقارنة ببقية البيانات الصحية المتاحة.`
            : `The priority was identified from a score of ${input.passport.priorityScore}/100 compared with the other available health data.`
          : language === "ar"
            ? "تم تحديد الأولوية من نمط البيانات الصحية المترابطة المتاحة."
            : "The priority was identified from the available connected health-data pattern.",
      recommendedAction: getRecommendedAction(
        "priority_identified",
        language
      ),
      confidence: null,
      date: input.passport.lastUpdated,
      organ:
        input.passport.priorityArea,
      score:
        input.passport.priorityScore,
      href: "/dashboard",
      metadata: {
        overallScore:
          input.passport.overallScore,
      },
    });
  }

  if (input.passport) {
    const passportCopy = getStageCopy(
      "passport_updated",
      language
    );

    stages.push({
      id: "journey-passport-updated",
      type: "passport_updated",
      status: "completed",
      tone: "success",
      title: passportCopy.title,
            description:
        language === "ar"
          ? `يجمع جواز الصحة حاليًا ${input.passport.totalDataPoints} نقطة بيانات من ${input.passport.availableSourceCount} مصادر صحية.`
          : `Your Health Passport currently connects ${input.passport.totalDataPoints} data points across ${input.passport.availableSourceCount} health sources.`,
      reason:
        language === "ar"
          ? `تم تحديث جواز الصحة لأن النظام وجد ${input.passport.totalDataPoints} نقطة بيانات مترابطة عبر ${input.passport.availableSourceCount} مصادر.`
          : `The Health Passport was updated because the system found ${input.passport.totalDataPoints} connected data points across ${input.passport.availableSourceCount} sources.`,
      recommendedAction: getRecommendedAction(
        "passport_updated",
        language
      ),
      confidence: null,
      date: input.passport.lastUpdated,
      organ: null,
      score:
        input.passport.overallScore,
      href: "/dashboard",
      metadata: {
        availableSourceCount:
          input.passport.availableSourceCount,
        totalDataPoints:
          input.passport.totalDataPoints,
      },
    });
  }

  if (input.hasHealthPlan) {
    const planCopy = getStageCopy(
      "plan_updated",
      language
    );

    stages.push({
      id: "journey-plan-ready",
      type: "plan_updated",
      status: "completed",
      tone: "success",
            title: planCopy.title,
      description: planCopy.description,
      reason:
        language === "ar"
          ? "تتوفر بيانات صحية كافية لتنظيم إجراءات المتابعة ضمن خطة واحدة."
          : "Sufficient health information is available to organize follow-up actions into one plan.",
      recommendedAction: getRecommendedAction(
        "plan_updated",
        language
      ),
      confidence: null,
      date:
        input.passport?.lastUpdated ??
        null,
      organ: null,
      score: null,
      href: "/health-plan",
      metadata: {
        available: true,
      },
    });
  }

  if (input.hasDoctorBrief) {
    const doctorCopy = getStageCopy(
      "doctor_brief_ready",
      language
    );

    stages.push({
      id: "journey-doctor-brief-ready",
      type: "doctor_brief_ready",
      status: "completed",
      tone: "success",
            title: doctorCopy.title,
      description:
        doctorCopy.description,
      reason:
        language === "ar"
          ? "تم تجهيز البيانات الصحية المترابطة في صيغة مختصرة تدعم التحضير للمناقشة السريرية."
          : "Connected health information was organized into a concise format for clinical discussion preparation.",
      recommendedAction: getRecommendedAction(
        "doctor_brief_ready",
        language
      ),
      confidence: null,
      date:
        input.passport?.lastUpdated ??
        null,
      organ: null,
      score: null,
      href: "/intelligence",
      metadata: {
        available: true,
      },
    });
  }

  const completedStages = stages
    .filter(
      (stage) =>
        stage.status === "completed"
    )
    .sort(
      (first, second) =>
        getTimestamp(first.date) -
        getTimestamp(second.date)
    );

  const latestCompletedStage =
    completedStages.at(-1) ?? null;

  if (latestCompletedStage) {
    latestCompletedStage.status =
      "current";
  }

  function getRecommendedAction(
  type: HealthJourneyStageType,
  language: "en" | "ar"
): string | null {
  const isArabic = language === "ar";

  const actions: Record<
    HealthJourneyStageType,
    {
      en: string | null;
      ar: string | null;
    }
  > = {
    profile_started: {
      en: "Review your health profile.",
      ar: "راجع ملفك الصحي.",
    },

    assessment_completed: {
      en: "Review the assessment result and follow the recommended next step.",
      ar: "راجع نتيجة التقييم واتبع الخطوة التالية المقترحة.",
    },

    priority_identified: {
      en: "Focus your next health actions on the identified priority area.",
      ar: "ركّز إجراءاتك الصحية القادمة على منطقة الأولوية المحددة.",
    },

    checkin_recorded: {
      en: "Continue regular check-ins to improve trend accuracy.",
      ar: "استمر في Check-Ins المنتظمة لتحسين دقة الاتجاهات.",
    },

    followup_due: {
  en: "Complete a new Check-In to refresh your current health status.",
  ar: "أكمل Check-In جديدًا لتحديث حالتك الصحية الحالية.",
},

    report_uploaded: {
      en: "Review the uploaded report and continue to health analysis.",
      ar: "راجع التقرير المرفوع وتابع إلى التحليل الصحي.",
    },

    analysis_generated: {
      en: "Review the generated intelligence and update your health plan.",
      ar: "راجع الذكاء الصحي الناتج وحدّث خطتك الصحية.",
    },

    passport_updated: {
      en: "Review your updated Health Passport.",
      ar: "راجع جواز الصحة المحدث.",
    },

    trend_changed: {
      en: "Review the detected trend and compare it with recent records.",
      ar: "راجع الاتجاه المكتشف وقارنه بالسجلات الحديثة.",
    },

    plan_updated: {
      en: "Continue the actions listed in your personalized health plan.",
      ar: "تابع الإجراءات الموجودة في خطتك الصحية المخصصة.",
    },

    doctor_brief_ready: {
      en: "Use the Doctor Brief during your next clinical discussion.",
      ar: "استخدم ملخص الطبيب خلال مناقشتك السريرية القادمة.",
    },
  };

  return isArabic
    ? actions[type].ar
    : actions[type].en;
}

  const next = buildNextMilestone(input);

  if (next) {
    stages.push(next.stage);
  }

  const completedCoreTypes = new Set(
    completedStages
      .map((stage) => stage.type)
      .filter((type) =>
        CORE_JOURNEY_TYPES.includes(type)
      )
  );

  const journeyProgress = Math.min(
    100,
    Math.round(
      (completedCoreTypes.size /
        CORE_JOURNEY_TYPES.length) *
        100
    )
  );

  const orderedStages = stages.sort(
    (first, second) => {
      if (first.status === "upcoming") {
        return 1;
      }

      if (second.status === "upcoming") {
        return -1;
      }

      return (
        getTimestamp(first.date) -
        getTimestamp(second.date)
      );
    }
  );

  const lastUpdated =
    [...completedStages]
      .sort(
        (first, second) =>
          getTimestamp(second.date) -
          getTimestamp(first.date)
      )[0]?.date ?? null;

  const summary =
    language === "ar"
      ? journeyStarted
        ? `تتضمن رحلتك الصحية ${completedStages.length} مرحلة مكتملة، مع تقدم إجمالي بنسبة ${journeyProgress}%.`
        : "لم تبدأ الرحلة الصحية بعد. ابدأ بتقييم صحي لإنشاء أول مرحلة."
      : journeyStarted
        ? `Your health journey includes ${completedStages.length} completed stages with ${journeyProgress}% overall journey progress.`
        : "Your health journey has not started yet. Complete an assessment to create the first stage.";

  return {
    stages: orderedStages,
    completedStages:
      completedStages.length,
    currentStage:
      latestCompletedStage,
    latestCompletedStage,
    journeyProgress,
    journeyStarted,
    nextMilestone:
      next?.milestone ?? null,
    summary,
    lastUpdated,
  };
}