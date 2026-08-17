import type {
  FollowUpChannel,
  FollowUpDecision,
  FollowUpPriority,
  FollowUpSafetyEscalation,
} from "@/lib/health-intelligence/application/follow-up-decision.service";

import type {
  RecommendationId,
} from "@/lib/health-intelligence/engines/recommendation-decision-policy";

export type FollowUpMessageLanguage =
  | "en"
  | "ar";

export type FollowUpMessagePurpose =
  | "routine-continuity"
  | "complete-health-data"
  | "complete-report-analysis"
  | "repeat-checkin"
  | "review-health-plan"
  | "professional-review"
  | "urgent-review";

export type FollowUpMessage = {
  available:
    boolean;

  language:
    FollowUpMessageLanguage;

  channel:
    FollowUpChannel;

  priority:
    FollowUpPriority;

  purpose:
    FollowUpMessagePurpose;

  title:
    string;

  body:
    string;

  actionLabel:
    string | null;

  actionHref:
    string | null;

  safetyNote:
    string | null;

  recommendedDelayHours:
    number;

  requiresImmediateDelivery:
    boolean;

  reason:
    string;

  generatedAt:
    string;
};

export type BuildFollowUpMessageInput = {
  decision:
    FollowUpDecision;

  language?:
    FollowUpMessageLanguage;

  referenceTime?:
    string | Date;
};

type FollowUpActionPresentation = {
  purpose:
    FollowUpMessagePurpose;

  titleEn:
    string;

  titleAr:
    string;

  bodyEn:
    string;

  bodyAr:
    string;

  actionLabelEn:
    string | null;

  actionLabelAr:
    string | null;

  actionHref:
    string | null;
};

function normalizeReferenceTime(
  value:
    string | Date | undefined
): Date {
  if (
    value instanceof Date &&
    !Number.isNaN(
      value.getTime()
    )
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    const parsed =
      new Date(
        value
      );

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {
      return parsed;
    }
  }

  return new Date();
}

function resolveActionPresentation(
  action:
    RecommendationId | null
): FollowUpActionPresentation {
  switch (action) {
    case "complete-assessment":
      return {
        purpose:
          "complete-health-data",

        titleEn:
          "Complete your health baseline",

        titleAr:
          "أكمل خط الأساس الصحي",

        bodyEn:
          "Complete your health assessment so OrganHeal can build a more connected and reliable picture of your health.",

        bodyAr:
          "أكمل تقييمك الصحي حتى يتمكن OrganHeal من بناء صورة صحية أكثر ترابطًا وموثوقية.",

        actionLabelEn:
          "Start Assessment",

        actionLabelAr:
          "ابدأ التقييم",

        actionHref:
          "/assessment",
      };

    case "upload-report":
      return {
        purpose:
          "complete-health-data",

        titleEn:
          "Add medical evidence",

        titleAr:
          "أضف دليلًا طبيًا",

        bodyEn:
          "Upload a medical report to strengthen the evidence available for your health analysis and follow-up plan.",

        bodyAr:
          "ارفع تقريرًا طبيًا لتعزيز الأدلة المتوفرة للتحليل الصحي وخطة المتابعة.",

        actionLabelEn:
          "Upload Report",

        actionLabelAr:
          "ارفع تقريرًا",

        actionHref:
          "/lab-upload",
      };

    case "analyze-report":
      return {
        purpose:
          "complete-report-analysis",

        titleEn:
          "Complete your report analysis",

        titleAr:
          "أكمل تحليل تقريرك",

        bodyEn:
          "Your uploaded report still needs analysis before its findings can fully support your health intelligence and next actions.",

        bodyAr:
          "ما زال تقريرك المرفوع يحتاج إلى التحليل قبل أن تدعم نتائجه الذكاء الصحي والخطوات التالية بشكل كامل.",

        actionLabelEn:
          "Analyze Report",

        actionLabelAr:
          "حلّل التقرير",

        actionHref:
          "/reports",
      };

    case "compare-latest-reports":
      return {
        purpose:
          "professional-review",

        titleEn:
          "Review changes across your reports",

        titleAr:
          "راجع التغيرات بين تقاريرك",

        bodyEn:
          "Compare your recent reports to understand whether important findings are improving, stable, or changing over time.",

        bodyAr:
          "قارن تقاريرك الحديثة لفهم ما إذا كانت النتائج المهمة تتحسن أو مستقرة أو تتغير مع الوقت.",

        actionLabelEn:
          "Compare Reports",

        actionLabelAr:
          "قارن التقارير",

        actionHref:
          "/intelligence",
      };

    case "complete-checkin":
    case "repeat-checkin":
      return {
        purpose:
          "repeat-checkin",

        titleEn:
          "Add a new health check-in",

        titleAr:
          "أضف تحديثًا صحيًا جديدًا",

        bodyEn:
          "Complete a new check-in so OrganHeal can compare your recent wellness signals and identify meaningful changes.",

        bodyAr:
          "أكمل تحديثًا صحيًا جديدًا حتى يتمكن OrganHeal من مقارنة إشارات العافية الحديثة وتحديد التغيرات المهمة.",

        actionLabelEn:
          "Open Check-In",

        actionLabelAr:
          "افتح التحديث الصحي",

        actionHref:
          "/checkin",
      };

    case "professional-review":
      return {
        purpose:
          "professional-review",

        titleEn:
          "Clinical review is recommended",

        titleAr:
          "يوصى بمراجعة سريرية",

        bodyEn:
          "The available information should be reviewed by an appropriate healthcare professional before stronger conclusions or changes are made.",

        bodyAr:
          "ينبغي أن يراجع مختص صحي مناسب المعلومات المتوفرة قبل الوصول إلى استنتاجات أقوى أو إجراء تغييرات.",

        actionLabelEn:
          "Prepare Doctor Brief",

        actionLabelAr:
          "حضّر موجز الطبيب",

        actionHref:
          "/doctor-portal",
      };

    case "review-health-plan":
      return {
        purpose:
          "review-health-plan",

        titleEn:
          "Review your health plan",

        titleAr:
          "راجع خطتك الصحية",

        bodyEn:
          "Review your current actions and follow-up steps to keep your health plan aligned with your latest information.",

        bodyAr:
          "راجع إجراءاتك الحالية وخطوات المتابعة للحفاظ على توافق خطتك الصحية مع أحدث معلوماتك.",

        actionLabelEn:
          "Open Health Plan",

        actionLabelAr:
          "افتح الخطة الصحية",

        actionHref:
          "/health-plan",
      };

    case "monitor-priority-area":
      return {
        purpose:
          "routine-continuity",

        titleEn:
          "Continue monitoring your priority area",

        titleAr:
          "واصل متابعة المجال ذي الأولوية",

        bodyEn:
          "Continue tracking the health area currently identified as most important and update OrganHeal when new information becomes available.",

        bodyAr:
          "واصل متابعة المجال الصحي المحدد حاليًا كأولوية، وحدّث OrganHeal عند توفر معلومات جديدة.",

        actionLabelEn:
          "Open Dashboard",

        actionLabelAr:
          "افتح لوحة التحكم",

        actionHref:
          "/dashboard",
      };

    case "maintain-healthy-routine":
    default:
      return {
        purpose:
          "routine-continuity",

        titleEn:
          "Continue your current health routine",

        titleAr:
          "استمر في روتينك الصحي الحالي",

        bodyEn:
          "Your current information supports routine follow-up. Continue your health plan and update your information when something changes.",

        bodyAr:
          "تدعم معلوماتك الحالية المتابعة الاعتيادية. استمر في خطتك الصحية وحدّث معلوماتك عند حدوث أي تغيير.",

        actionLabelEn:
          "Open Health Plan",

        actionLabelAr:
          "افتح الخطة الصحية",

        actionHref:
          "/health-plan",
      };
  }
}

function resolveSafetyNote(
  escalation:
    FollowUpSafetyEscalation,
  language:
    FollowUpMessageLanguage
): string | null {
  if (
    escalation ===
      "urgent-review"
  ) {
    return language ===
      "ar"
      ? "هذه الرسالة لا تؤكد تشخيصًا. إذا كانت لديك أعراض شديدة أو متفاقمة، فاطلب الرعاية الطبية العاجلة فورًا."
      : "This message does not confirm a diagnosis. Seek urgent medical care immediately if you have severe or worsening symptoms.";
  }

  if (
    escalation ===
      "professional-review"
  ) {
    return language ===
      "ar"
      ? "لا تمثل هذه الرسالة تشخيصًا أو بديلًا عن التقييم السريري. راجع مختصًا صحيًا مناسبًا."
      : "This message is not a diagnosis or a substitute for clinical assessment. Review the information with an appropriate healthcare professional.";
  }

  return null;
}

function resolvePurpose(
  decision:
    FollowUpDecision,
  presentation:
    FollowUpActionPresentation
): FollowUpMessagePurpose {
  if (
    decision.safetyEscalation ===
      "urgent-review"
  ) {
    return "urgent-review";
  }

  if (
    decision.safetyEscalation ===
      "professional-review"
  ) {
    return "professional-review";
  }

  return presentation.purpose;
}

export function buildFollowUpMessage({
  decision,
  language = "en",
  referenceTime,
}: BuildFollowUpMessageInput):
  FollowUpMessage {
  const presentation =
    resolveActionPresentation(
      decision.recommendedAction
    );

  const purpose =
    resolvePurpose(
      decision,
      presentation
    );

  const generatedAt =
    normalizeReferenceTime(
      referenceTime
    ).toISOString();

  const isArabic =
    language ===
      "ar";

  return {
    available:
      Boolean(
        decision.recommendedAction
      ),

    language,

    channel:
      decision.recommendedChannel,

    priority:
      decision.priority,

    purpose,

    title:
      isArabic
        ? presentation.titleAr
        : presentation.titleEn,

    body:
      isArabic
        ? presentation.bodyAr
        : presentation.bodyEn,

    actionLabel:
      isArabic
        ? presentation.actionLabelAr
        : presentation.actionLabelEn,

    actionHref:
      presentation.actionHref,

    safetyNote:
      resolveSafetyNote(
        decision.safetyEscalation,
        language
      ),

    recommendedDelayHours:
      decision.recommendedDelayHours,

    requiresImmediateDelivery:
      decision.priority ===
        "critical" ||
      decision.recommendedDelayHours ===
        0,

    reason:
      "A patient-safe follow-up message was generated from the existing follow-up decision without changing its clinical priority, timing, recommended action, channel, or safety escalation.",

    generatedAt,
  };
}