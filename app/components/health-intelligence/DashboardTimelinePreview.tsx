import Link from "next/link";

import type { HealthTimelineData } from "@/lib/health-intelligence/engines/health-timeline.engine";

type DashboardTimelinePreviewProps = {
  timeline: HealthTimelineData;
  confidence: number;
  isArabic?: boolean;
};

function formatDate(
  value: string,
  isArabic: boolean
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    isArabic ? "ar" : "en",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  ).format(date);
}

function getEventTypeLabel(
  type: HealthTimelineData["events"][number]["type"],
  isArabic: boolean
) {
  const labels = {
    assessment: isArabic ? "تقييم" : "Assessment",
    checkin: isArabic ? "تحديث يومي" : "Check-In",
    report: isArabic ? "تقرير" : "Report",
    analysis: isArabic ? "تحليل" : "Analysis",
    trend: isArabic ? "اتجاه" : "Trend",
    followup:
  isArabic
    ? "متابعة"
    : "Follow-Up",
  };

  return labels[type];
}

function getSeverityLabel(
  severity: HealthTimelineData["events"][number]["severity"],
  isArabic: boolean
) {
  const labels = {
    information: isArabic ? "معلومة" : "Information",
    success: isArabic ? "إيجابي" : "Positive",
    warning: isArabic ? "تنبيه" : "Warning",
    critical: isArabic ? "مهم" : "Critical",
  };

  return labels[severity];
}

export default function DashboardTimelinePreview({
  timeline,
  confidence,
  isArabic = false,
}: DashboardTimelinePreviewProps) {
  const events = timeline.events.slice(0, 3);

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
            {isArabic ? "حدث" : "events"}
          </span>

          <strong>{confidence}%</strong>
        </div>
      </div>

      <div className="dashboardTimelinePreviewList">
        {events.map((event) => {
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

                <time dateTime={event.date}>
                  {formatDate(
                    event.date,
                    isArabic
                  )}
                </time>
              </div>

              <strong className="dashboardTimelineTitle">
                {event.title}
              </strong>

              <p className="dashboardTimelineDescription">
                {event.description}
              </p>

              {(event.organ || event.score !== null) && (
                <div className="dashboardTimelineSignals">
                  {event.organ && (
                    <span>{event.organ}</span>
                  )}

                  {event.score !== null && (
                    <span>{event.score}/100</span>
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