type TimelineCardProps = {
  timeline: unknown;
  isArabic: boolean;
};

type TimelineItem = {
  id?: string | number;
  date?: string;
  title?: string;
  label?: string;
  period?: string;
  category?: string;
  source?: string;
  description?: string;
  summary?: string;
  insight?: string;
  status?: string;
  severity?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getText(value: unknown): string {
  if (typeof value === "string") return value.trim();

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function normalizeTimelineItems(timeline: unknown): TimelineItem[] {
  if (Array.isArray(timeline)) {
    return timeline.filter(isRecord).map((item, index) => ({
      id: getText(item.id) || index,
      date: getText(item.date),
      title: getText(item.title),
      label: getText(item.label),
      period: getText(item.period),
      category: getText(item.category),
      source: getText(item.source),
      description: getText(item.description),
      summary: getText(item.summary),
      insight: getText(item.insight),
      status: getText(item.status),
      severity: getText(item.severity),
    }));
  }

  if (!isRecord(timeline)) return [];

  const possibleItems =
    timeline.items ||
    timeline.events ||
    timeline.timeline ||
    timeline.keyEvents ||
    timeline.entries;

  if (!Array.isArray(possibleItems)) return [];

  return possibleItems.filter(isRecord).map((item, index) => ({
    id: getText(item.id) || index,
    date: getText(item.date),
    title: getText(item.title),
    label: getText(item.label),
    period: getText(item.period),
    category: getText(item.category),
    source: getText(item.source),
    description: getText(item.description),
    summary: getText(item.summary),
    insight: getText(item.insight),
    status: getText(item.status),
    severity: getText(item.severity),
  }));
}

function getTimelineSummary(timeline: unknown): string {
  if (typeof timeline === "string") {
    return timeline.trim();
  }

  if (!isRecord(timeline)) return "";

  return (
    getText(timeline.summary) ||
    getText(timeline.narrative) ||
    getText(timeline.overview) ||
    getText(timeline.description)
  );
}

export default function TimelineCard({
  timeline,
  isArabic,
}: TimelineCardProps) {
  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }
  const timelineItems = normalizeTimelineItems(timeline);
  const timelineSummary = getTimelineSummary(timeline);

  const hasTimelineIntelligence =
    Boolean(timelineSummary) || timelineItems.length > 0;

  return (
    <section
  className="healthTimelineResult"
  dir={isArabic ? "rtl" : "ltr"}
  lang={isArabic ? "ar" : "en"}
>
      <style>{`
        .healthTimelineResult,
        .healthTimelineResult * {
          box-sizing: border-box;
        }

        .healthTimelineResult {
          padding: 20px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 18px;
          background: #ffffff;
        }

        .healthTimelineHeader {
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.07);
        }

        .healthTimelineEyebrow {
          margin: 0;
          color: #0f766e;
          font-size: 0.68rem;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .healthTimelineTitle {
          margin: 6px 0 0;
          color: #0f172a;
          font-size: 1.18rem;
          font-weight: 950;
          line-height: 1.3;
        }

        .healthTimelineDescription {
          max-width: 720px;
          margin: 7px 0 0;
          color: #64748b;
          font-size: 0.82rem;
          line-height: 1.6;
        }

        .healthTimelineSignal {
          margin-top: 16px;
          padding: 15px 16px;
          border: 1px solid rgba(15, 118, 110, 0.15);
          border-left: 4px solid #0f766e;
          border-radius: 14px;
          background: #f0fdfa;
        }

        .healthTimelineSignalLabel {
          margin: 0;
          color: #0f766e;
          font-size: 0.66rem;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .healthTimelineSignalText {
          margin: 7px 0 0;
          color: #334155;
          font-size: 0.9rem;
          font-weight: 750;
          line-height: 1.65;
        }

        .healthTimelineEvents {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }

        .healthTimelineEvent {
          padding: 14px 15px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 14px;
          background: #f8fafc;
        }

        .healthTimelineEventHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .healthTimelineEventTitle {
          margin: 0;
          color: #0f172a;
          font-size: 0.9rem;
          font-weight: 900;
          line-height: 1.4;
        }

        .healthTimelineEventDate {
          flex: 0 0 auto;
          padding: 5px 8px;
          border-radius: 999px;
          background: #ffffff;
          color: #64748b;
          font-size: 0.68rem;
          font-weight: 800;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .healthTimelineEventDescription {
          margin: 8px 0 0;
          color: #475569;
          font-size: 0.8rem;
          line-height: 1.6;
        }

        .healthTimelineMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 10px;
        }

        .healthTimelineMeta span {
          padding: 5px 8px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #64748b;
          font-size: 0.67rem;
          font-weight: 750;
        }

        .healthTimelineEmpty {
          margin-top: 16px;
          padding: 14px 15px;
          border: 1px dashed rgba(148, 163, 184, 0.4);
          border-radius: 14px;
          background: #f8fafc;
          color: #64748b;
          font-size: 0.82rem;
          line-height: 1.6;
        }

        @media (max-width: 640px) {
          .healthTimelineResult {
            padding: 16px;
          }

          .healthTimelineEventHeader {
            flex-direction: column;
          }
        }
      `}</style>

      <header className="healthTimelineHeader">
       <p className="healthTimelineEyebrow">
  {text(
    "Health direction",
    "الاتجاه الصحي"
  )}
</p>

<h3 className="healthTimelineTitle">
  {text(
    "Recent health movement",
    "التغيرات الصحية الأخيرة"
  )}
</h3>

<p className="healthTimelineDescription">
  {text(
    "A longitudinal view of meaningful changes detected across the available health history.",
    "نظرة زمنية على التغيرات المهمة التي تم رصدها عبر التاريخ الصحي المتاح."
  )}
</p>
      </header>

      {timelineSummary && (
        <div className="healthTimelineSignal">
          <p className="healthTimelineSignalLabel">
            {text(
  "Current timeline signal",
  "إشارة الخط الزمني الحالية"
)}
          </p>

          <p className="healthTimelineSignalText">
            {timelineSummary}
          </p>
        </div>
      )}

      {timelineItems.length > 0 && (
        <div className="healthTimelineEvents">
          {timelineItems.map((item, index) => {
            const title =
              item.title ||
              item.label ||
              item.category ||
              item.period ||
              text(
  `Health event ${index + 1}`,
  `حدث صحي ${index + 1}`
)

            const description =
              item.description ||
              item.summary ||
              item.insight;

            return (
              <article
                className="healthTimelineEvent"
                key={item.id ?? `${title}-${index}`}
              >
                <div className="healthTimelineEventHeader">
                  <h4 className="healthTimelineEventTitle">
                    {title}
                  </h4>

                  {(item.date || item.period) && (
                    <span className="healthTimelineEventDate">
                      {item.date || item.period}
                    </span>
                  )}
                </div>

                {description && (
                  <p className="healthTimelineEventDescription">
                    {description}
                  </p>
                )}

                {(item.status ||
                  item.severity ||
                  item.source) && (
                  <div className="healthTimelineMeta">
                   {item.status && (
  <span>
    {text("Status", "الحالة")}: {item.status}
  </span>
)}

{item.severity && (
  <span>
    {text("Severity", "الشدة")}: {item.severity}
  </span>
)}

{item.source && (
  <span>
    {text("Source", "المصدر")}: {item.source}
  </span>
)}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!hasTimelineIntelligence && (
        <div className="healthTimelineEmpty">
          {text(
  "More longitudinal data is needed before OrganHeal can identify a meaningful health direction.",
  "يحتاج OrganHeal إلى المزيد من البيانات التاريخية قبل تحديد اتجاه صحي ذي معنى."
)}
        </div>
      )}
    </section>
  );
}