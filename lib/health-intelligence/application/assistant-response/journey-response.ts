import type {
  AssistantResponseHealthContext,
} from "@/lib/health-intelligence/application/assistant-response/assistant-response.types";

export type BuildJourneyResponseInput = {
  lowerMessage: string;
  language: "en" | "ar";
  healthContext:
    AssistantResponseHealthContext;
  nextAction: string;
};

function isJourneyQuestion(
  lowerMessage: string
): boolean {
  return (
    lowerMessage.includes("what changed") ||
    lowerMessage.includes("what's changed") ||
    lowerMessage.includes("recent changes") ||
    lowerMessage.includes("latest update") ||
    lowerMessage.includes("health journey") ||
    lowerMessage.includes("my journey") ||
    lowerMessage.includes("what happened recently") ||
    lowerMessage.includes("آخر تغيير") ||
    lowerMessage.includes("آخر تحديث") ||
    lowerMessage.includes("ماذا تغير") ||
    lowerMessage.includes("ما الذي تغير") ||
    lowerMessage.includes("رحلتي الصحية")
  );
}

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

export function buildJourneyResponse({
  lowerMessage,
  language,
  healthContext,
  nextAction,
}: BuildJourneyResponseInput): string | null {
  if (
    !isJourneyQuestion(
      lowerMessage
    )
  ) {
    return null;
  }

  const patientJourney =
    healthContext.patientJourney;

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
{nextAction}`;
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