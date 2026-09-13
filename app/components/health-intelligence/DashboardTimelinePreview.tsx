import Link from "next/link";

import type {
  HealthTimelineData,
} from "@/lib/health-intelligence/engines/health-timeline.engine";

type DashboardTimelinePreviewProps = {
  timeline: HealthTimelineData;
  confidence: number;
  isArabic?: boolean;
};

type TimelineEvent =
  HealthTimelineData["events"][number];

function formatDate(
  value: string,
  isArabic: boolean
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return isArabic
      ? "تاريخ غير متاح"
      : value;
  }

  return new Intl.DateTimeFormat(
    isArabic ? "ar-AE" : "en",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  ).format(date);
}

function getEventTypeLabel(
  type: TimelineEvent["type"],
  isArabic: boolean
) {
  if (!isArabic) {
    switch (type) {
      case "assessment":
        return "Assessment";

      case "checkin":
        return "Check-In";

      case "report":
        return "Report";

      case "analysis":
        return "Analysis";

      case "trend":
        return "Trend";

      case "followup":
        return "Follow-Up";
    }
  }

  switch (type) {
    case "assessment":
      return "تقييم";

    case "checkin":
      return "تحديث يومي";

    case "report":
      return "تقرير";

    case "analysis":
      return "تحليل";

    case "trend":
      return "اتجاه";

    case "followup":
      return "متابعة";
  }
}

function getSeverityLabel(
  severity: TimelineEvent["severity"],
  isArabic: boolean
) {
  if (!isArabic) {
    switch (severity) {
      case "information":
        return "Information";

      case "success":
        return "Positive";

      case "warning":
        return "Warning";

      case "critical":
        return "Critical";
    }
  }

  switch (severity) {
    case "information":
      return "معلومة";

    case "success":
      return "إيجابي";

    case "warning":
      return "تنبيه";

    case "critical":
      return "مهم";
  }
}

function getArabicOrganLabel(
  organ: string | null
): string | null {
  if (!organ) {
    return null;
  }

  switch (
    organ
      .trim()
      .toLowerCase()
  ) {
    case "heart":
    case "cardiovascular":
      return "القلب والأوعية الدموية";

    case "kidney":
    case "kidneys":
    case "renal":
      return "الكلى";

    case "liver":
      return "الكبد";

    case "lung":
    case "lungs":
    case "respiratory":
      return "الجهاز التنفسي";

    case "brain":
    case "neurological":
      return "الدماغ والجهاز العصبي";

    case "metabolic":
    case "metabolism":
      return "الأيض";

    default:
      return null;
  }
}

function getArabicTrendDescription(
  event: TimelineEvent
): string {
  const direction =
    typeof event.metadata.direction === "string"
      ? event.metadata.direction
          .trim()
          .toLowerCase()
      : null;

  switch (direction) {
    case "improving":
      return "تشير البيانات الصحية المسجلة إلى اتجاه تحسن خلال فترة المتابعة.";

    case "worsening":
      return "تشير البيانات الصحية المسجلة إلى اتجاه يحتاج إلى مزيد من المتابعة.";

    case "stable":
      return "تشير البيانات الصحية المسجلة إلى اتجاه مستقر خلال فترة المتابعة.";

    default:
      return "تم تحديث اتجاه الصحة بالاعتماد على البيانات الصحية المتاحة عبر الزمن.";
  }
}

function getArabicEventTitle(
  event: TimelineEvent
): string {
  const organ =
    getArabicOrganLabel(
      event.organ
    );

  switch (event.type) {
    case "assessment":
      return organ
        ? `تقييم ${organ}`
        : "تقييم صحي";

    case "checkin":
      return "تم إكمال التحديث الصحي اليومي";

    case "followup":
      return "حان موعد المتابعة الصحية";

    case "report":
      return "تمت إضافة تقرير طبي";

    case "analysis":
      return "تم حفظ تحليل الذكاء الصحي";

    case "trend":
      return "تم تحديث اتجاه الصحة";
  }
}

function getArabicEventDescription(
  event: TimelineEvent
): string {
  const organ =
    getArabicOrganLabel(
      event.organ
    );

  switch (event.type) {
    case "assessment":
      if (event.score !== null) {
        return organ
          ? `تم حفظ نتيجة تقييم ${organ} بدرجة ${event.score}/100 ضمن سجلك الصحي.`
          : `تم حفظ نتيجة تقييم صحي بدرجة ${event.score}/100 ضمن سجلك الصحي.`;
      }

      return "تم حفظ نتيجة تقييم صحي ضمن سجلك الصحي.";

    case "checkin":
      if (event.score !== null) {
        return `تم تسجيل التحديث الصحي اليومي بدرجة عافية ${event.score}/100.`;
      }

      return "تم تسجيل تحديث صحي يومي جديد.";

    case "followup":
      return "مرّ وقت على آخر تحديث صحي، ويُنصح بإكمال تحديث جديد للحفاظ على استمرارية المتابعة.";

    case "report":
      return "تمت إضافة تقرير طبي إلى سجلك الصحي ليصبح جزءًا من بياناتك الصحية المترابطة.";

    case "analysis":
      return "تم إنشاء وحفظ تحليل صحي منظم بالاعتماد على البيانات المتاحة.";

    case "trend":
      return getArabicTrendDescription(
        event
      );
  }
}

function getDisplayTitle(
  event: TimelineEvent,
  isArabic: boolean
) {
  return isArabic
    ? getArabicEventTitle(event)
    : event.title;
}

function getDisplayDescription(
  event: TimelineEvent,
  isArabic: boolean
) {
  return isArabic
    ? getArabicEventDescription(
        event
      )
    : event.description;
}

export default function DashboardTimelinePreview({
  timeline,
  confidence,
  isArabic = false,
}: DashboardTimelinePreviewProps) {
  const events =
    timeline.events.slice(
      0,
      3
    );

  if (events.length === 0) {
    return null;
  }

  return (
    <section
      className="dashboardTimelinePreview"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <div className="dashboardTimelinePreviewHeader">
        <div>
          <span className="dashboardTimelinePreviewKicker">
            {isArabic
              ? "المسار الصحي"
              : "Health Timeline"}
          </span>

          <h2>
            {isArabic
              ? "أحدث الأحداث الصحية"
              : "Your latest health events"}
          </h2>

          <p>
            {isArabic
              ? `يعرض هذا الملخص أحدث ${events.length} أحداث من بياناتك الصحية المترابطة.`
              : `This preview shows the latest ${events.length} events from your connected health data.`}
          </p>
        </div>

        <div className="dashboardTimelinePreviewMeta">
          <span>
            {timeline.totalEvents}{" "}
            {isArabic
              ? "حدث"
              : "events"}
          </span>

          <strong>
            {confidence}%
          </strong>
        </div>
      </div>

      <div className="dashboardTimelinePreviewList">
        {events.map((event) => {
          const organLabel =
            isArabic
              ? getArabicOrganLabel(
                  event.organ
                )
              : event.organ;

          const content = (
            <>
              <div className="dashboardTimelinePreviewItemTop">
                <div>
                  <span
                    className={`dashboardTimelineSeverity ${event.severity}`}
                  >
                    {getSeverityLabel(
                      event.severity,
                      isArabic
                    )}
                  </span>

                  <span className="dashboardTimelineType">
                    {getEventTypeLabel(
                      event.type,
                      isArabic
                    )}
                  </span>
                </div>

                <time
                  dateTime={
                    event.date
                  }
                >
                  {formatDate(
                    event.date,
                    isArabic
                  )}
                </time>
              </div>

              <strong className="dashboardTimelineTitle">
                {getDisplayTitle(
                  event,
                  isArabic
                )}
              </strong>

              <p className="dashboardTimelineDescription">
                {getDisplayDescription(
                  event,
                  isArabic
                )}
              </p>

              {(organLabel ||
                event.score !== null) && (
                <div className="dashboardTimelineSignals">
                  {organLabel && (
                    <span>
                      {organLabel}
                    </span>
                  )}

                  {event.score !== null && (
                    <span>
                      {event.score}/100
                    </span>
                  )}
                </div>
              )}
            </>
          );

          return event.href ? (
            <Link
              key={event.id}
              href={event.href}
              className="dashboardTimelinePreviewItem"
            >
              {content}
            </Link>
          ) : (
            <article
              key={event.id}
              className="dashboardTimelinePreviewItem"
            >
              {content}
            </article>
          );
        })}
      </div>

      <div className="dashboardTimelinePreviewFooter">
        <div>
          <span>
            {isArabic
              ? "تنبيهات مهمة"
              : "Important signals"}
          </span>

          <strong>
            {timeline.criticalEvents +
              timeline.warningEvents}
          </strong>
        </div>

        <Link
          href="/history"
          className="dashboardSecondaryAction"
        >
          {isArabic
            ? "عرض المسار الكامل"
            : "View Full Timeline"}
        </Link>
      </div>
    </section>
  );
}