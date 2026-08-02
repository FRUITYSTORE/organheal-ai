import type {
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

import {
  detectJourneyIntent,
} from "@/lib/health-intelligence/application/assistant-response/journey-intent";

import {
  getJourneyHandler,
} from "@/lib/health-intelligence/application/assistant-response/journey-handlers/journey-handler.registry";

export type BuildJourneyResponseInput = {
  lowerMessage: string;
  language: "en" | "ar";
  healthContext:
    AssistantResponseHealthContext;
  nextAction: string;
};


function formatJourneyDate(
  value: string,
  language: "en" | "ar"
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    language === "ar"
      ? "ar"
      : "en",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  ).format(date);
}

function getSourceLabel(
  source:
    | "check_in"
    | "report"
    | "intelligence"
    | "history"
    | "unknown",
  language: "en" | "ar"
): string {
  const isArabic =
    language === "ar";

  const labels = {
    check_in:
      isArabic
        ? "تم تسجيل Check-In صحي"
        : "A health Check-In was recorded",

    report:
      isArabic
        ? "تمت إضافة تقرير طبي"
        : "A medical report was added",

    intelligence:
      isArabic
        ? "تم تحديث الذكاء الصحي"
        : "Health intelligence was updated",

    history:
      isArabic
        ? "تم تحديث التاريخ الصحي"
        : "Health history was updated",

    unknown:
      isArabic
        ? "تم تسجيل تحديث صحي"
        : "A health update was recorded",
  };

  return labels[source];
}

function getFollowUpMessage(
  status:
    | "up_to_date"
    | "follow_up_needed"
    | "unknown",
  language: "en" | "ar"
): string {
  const isArabic =
    language === "ar";

  if (
    status ===
    "up_to_date"
  ) {
    return isArabic
      ? "المتابعة الصحية محدثة حاليًا."
      : "Your health follow-up is currently up to date.";
  }

  if (
    status ===
    "follow_up_needed"
  ) {
    return isArabic
      ? "تحتاج المتابعة الصحية إلى Check-In جديد."
      : "Your health follow-up needs a new Check-In.";
  }

  return isArabic
    ? "لا تتوفر معلومات كافية لتحديد حالة المتابعة."
    : "There is not enough information to determine the follow-up status.";
}

function getJourneyNextAction(
  status:
    | "up_to_date"
    | "follow_up_needed"
    | "unknown",
  nextAction: string,
  language: "en" | "ar"
): string {
  const isArabic =
    language === "ar";

  if (status === "follow_up_needed") {
    return isArabic
      ? "أكمل Check-In جديدًا لتحديث حالتك الصحية الحالية."
      : "Complete a new Check-In to refresh your current health status.";
  }

  if (status === "unknown") {
    return isArabic
      ? "أضف تحديثًا صحيًا حديثًا لتحديد حالة المتابعة والخطوة التالية."
      : "Add a recent health update to clarify your follow-up status and next step.";
  }

  return nextAction;
}


function getJourneyEventLabel(
  event: NonNullable<
    AssistantResponseHealthContext[
      "patientJourneyEvents"
    ]
  >[number],
  language: "en" | "ar"
): string {
  const isArabic =
    language === "ar";

  switch (event.type) {
    case "check_in_completed":
      return isArabic
        ? "تم تسجيل Check-In صحي"
        : "A health Check-In was recorded";

    case "health_intelligence_generated":
      return isArabic
        ? "تم إنشاء ذكاء صحي جديد"
        : "New health intelligence was generated";

    case "health_history_updated":
      return isArabic
        ? "تم تحديث التاريخ الصحي"
        : "Health history was updated";

    case "report_uploaded":
      return isArabic
        ? "تم رفع تقرير طبي"
        : "A medical report was uploaded";
  }
}

export function buildJourneyResponse({
  lowerMessage,
  language,
  healthContext,
  nextAction,
}: BuildJourneyResponseInput): string | null {
  const detectedIntent =
    detectJourneyIntent(
      lowerMessage
    );

  if (
    detectedIntent.intent ===
    "unknown"
  ) {
    return null;
  }

  const registeredHandler =
  getJourneyHandler(
    detectedIntent.intent
  );

if (registeredHandler) {
  return registeredHandler({
    intent:
      detectedIntent.intent,

    lowerMessage,

    language,

    healthContext,

    nextAction,
  });
}

  const patientJourney =
    healthContext.patientJourney;

    const patientJourneyEvents =
  healthContext.patientJourneyEvents ??
  [];

  const latestUpdate =
    patientJourney
      ?.lastMeaningfulUpdate ??
    null;

  const followUpStatus =
    patientJourney
      ?.followUpStatus ??
    "unknown";

    const journeyNextAction =
  getJourneyNextAction(
    followUpStatus,
    nextAction,
    language
  );

  const isArabic =
    language === "ar";

    if (
  detectedIntent.intent ===
  "last_update"
) {
  if (!latestUpdate) {
    return isArabic
      ? `لا يوجد حتى الآن تحديث صحي مهم مسجل في رحلتك الصحية.

${getFollowUpMessage(
  followUpStatus,
  language
)}

الخطوة التالية:
${journeyNextAction}`
      : `No meaningful health update has been recorded yet.

${getFollowUpMessage(
  followUpStatus,
  language
)}

Suggested next step:
${journeyNextAction}`;
  }

  return isArabic
    ? `آخر تحديث مهم في رحلتك الصحية:

${getSourceLabel(
  latestUpdate.source,
  language
)}

التاريخ:
${formatJourneyDate(
  latestUpdate.occurredAt,
  language
)}

حالة المتابعة:
${getFollowUpMessage(
  followUpStatus,
  language
)}

الخطوة التالية المقترحة:
${journeyNextAction}`
    : `Your latest meaningful health update:

${getSourceLabel(
  latestUpdate.source,
  language
)}

Date:
${formatJourneyDate(
  latestUpdate.occurredAt,
  language
)}

Follow-up status:
${getFollowUpMessage(
  followUpStatus,
  language
)}

Suggested next step:
${journeyNextAction}`;
}

   if (
  detectedIntent.intent ===
  "journey_summary"
) {
  if (!patientJourney) {
    return isArabic
      ? "لا تتوفر حاليًا بيانات كافية لبناء ملخص رحلتك الصحية."
      : "There is not enough journey data to build your health journey summary.";
  }

  const journeyEvents =
    patientJourneyEvents.slice(
      0,
      5
    );

  const eventsSummary =
    journeyEvents.length > 0
      ? journeyEvents
          .map(
            (event) =>
              `• ${getJourneyEventLabel(
                event,
                language
              )} — ${formatJourneyDate(
                event.occurredAt,
                language
              )}`
          )
          .join("\n")
      : isArabic
        ? "لا توجد أحداث صحية حديثة مسجلة."
        : "No recent health journey events are recorded.";

  const latestReportDate =
    patientJourney.latestReport
      ?.created_at
      ? formatJourneyDate(
          patientJourney.latestReport.created_at,
          language
        )
      : null;

  return isArabic
    ? `ملخص رحلتك الصحية الحالية:

الأولوية الصحية:
${patientJourney.currentPriority || "غير محددة حاليًا"}

آخر تقرير:
${latestReportDate || "لا يوجد تقرير محفوظ"}

حالة المتابعة:
${getFollowUpMessage(
  followUpStatus,
  language
)}

أحدث الأحداث:
${eventsSummary}

الخطوة التالية المقترحة:
${journeyNextAction}`
    : `Your current health journey summary:

Health priority:
${patientJourney.currentPriority || "Not currently identified"}

Latest report:
${latestReportDate || "No saved report"}

Follow-up status:
${getFollowUpMessage(
  followUpStatus,
  language
)}

Recent events:
${eventsSummary}

Suggested next step:
${journeyNextAction}`;
}

  if (!latestUpdate) {
    return isArabic
      ? `لا يوجد حتى الآن تغيير صحي مهم مسجل في رحلتك الصحية.

${getFollowUpMessage(
  followUpStatus,
  language
)}

الخطوة التالية:
${journeyNextAction}`
      : `No meaningful health journey change has been recorded yet.

${getFollowUpMessage(
  followUpStatus,
  language
)}

Suggested next step:
${journeyNextAction}`;
  }

  const updateLabel =
    getSourceLabel(
      latestUpdate.source,
      language
    );

  const updateDate =
    formatJourneyDate(
      latestUpdate.occurredAt,
      language
    );

  return isArabic
    ? `آخر تغيير مهم في رحلتك الصحية:

${updateLabel}

التاريخ:
${updateDate}

حالة المتابعة:
${getFollowUpMessage(
  followUpStatus,
  language
)}

الخطوة التالية المقترحة:
${journeyNextAction}`
    : `Latest meaningful change in your health journey:

${updateLabel}

Date:
${updateDate}

Follow-up status:
${getFollowUpMessage(
  followUpStatus,
  language
)}

Suggested next step:
${journeyNextAction}`;
}