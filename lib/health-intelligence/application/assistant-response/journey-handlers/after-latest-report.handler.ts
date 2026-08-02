import {
  buildPatientJourneyAnalysis,
} from "@/lib/application/journey/patient-journey-analysis.service";

import {
  buildPatientJourneyReasoning,
} from "@/lib/application/journey/patient-journey-reasoning.service";

import type {
  PatientJourneyEvent,
} from "@/lib/application/journey/patient-journey-events.service";

import type {
  JourneyHandler,
  JourneyHandlerLanguage,
} from "@/lib/health-intelligence/application/assistant-response/journey-handlers/journey-handler.types";

function formatJourneyDate(
  value: string,
  language: JourneyHandlerLanguage
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

function getJourneyEventLabel(
  event: PatientJourneyEvent,
  language: JourneyHandlerLanguage
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

function getFollowUpMessage(
  status:
    | "up_to_date"
    | "follow_up_needed"
    | "unknown",
  language: JourneyHandlerLanguage
): string {
  const isArabic =
    language === "ar";

  if (status === "up_to_date") {
    return isArabic
      ? "المتابعة الصحية محدثة حاليًا."
      : "Your health follow-up is currently up to date.";
  }

  if (status === "follow_up_needed") {
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
  language: JourneyHandlerLanguage
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

export const handleAfterLatestReportJourneyIntent:
  JourneyHandler = ({
    language,
    healthContext,
    nextAction,
  }) => {
    const isArabic =
      language === "ar";

    const patientJourney =
      healthContext.patientJourney;

    const patientJourneyEvents =
      healthContext.patientJourneyEvents ??
      [];

    if (!patientJourney) {
      return isArabic
        ? "لا تتوفر حاليًا بيانات كافية لتحليل ما حدث بعد أحدث تقرير."
        : "There is not enough journey data to analyze what happened after the latest report.";
    }

    const analysis =
      buildPatientJourneyAnalysis({
        patientJourney,
        patientJourneyEvents,
      });

    const reasoning =
      buildPatientJourneyReasoning({
        analysis,
      });

    if (!analysis.latestReportDate) {
      return isArabic
        ? "لا يوجد تقرير طبي حديث محفوظ يمكن استخدامه كنقطة بداية لهذا التحليل."
        : "There is no saved medical report available to use as the starting point for this analysis.";
    }

    const followUpStatus =
      patientJourney.followUpStatus;

    const journeyNextAction =
      getJourneyNextAction(
        followUpStatus,
        nextAction,
        language
      );

    if (
      reasoning.state ===
        "no_change_after_report" ||
      reasoning.state ===
        "follow_up_due"
    ) {
      return isArabic
        ? `لم أجد أحداثًا صحية مسجلة بعد أحدث تقرير.

تاريخ التقرير:
${formatJourneyDate(
  analysis.latestReportDate,
  language
)}

حالة المتابعة:
${getFollowUpMessage(
  followUpStatus,
  language
)}

الخطوة التالية:
${journeyNextAction}`
        : `I did not find any recorded health events after your latest report.

Report date:
${formatJourneyDate(
  analysis.latestReportDate,
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

    const eventsSummary =
      analysis.eventsAfterLatestReport
        .slice(0, 5)
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
        .join("\n");

    return isArabic
      ? `منذ أحدث تقرير، وجدت التغييرات الصحية التالية:

${eventsSummary}

عدد الأحداث اللاحقة للتقرير:
${reasoning.eventsAfterReportCount}

حالة المتابعة:
${getFollowUpMessage(
  followUpStatus,
  language
)}

الخطوة التالية المقترحة:
${journeyNextAction}`
      : `Since your latest report, I found the following health changes:

${eventsSummary}

Events recorded after the report:
${reasoning.eventsAfterReportCount}

Follow-up status:
${getFollowUpMessage(
  followUpStatus,
  language
)}

Suggested next step:
${journeyNextAction}`;
  };