type TimelineCardProps = {
  timeline: unknown;
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
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
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
  if (typeof timeline === "string") return timeline;

  if (!isRecord(timeline)) return "";

  return (
    getText(timeline.summary) ||
    getText(timeline.narrative) ||
    getText(timeline.overview) ||
    getText(timeline.description)
  );
}

export default function TimelineCard({ timeline }: TimelineCardProps) {
  const timelineItems = normalizeTimelineItems(timeline);
  const timelineSummary = getTimelineSummary(timeline);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Health Timeline
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Timeline
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          A chronological view of the patient&apos;s detected health events,
          patterns, and report-based intelligence signals.
        </p>
      </div>

      {timelineSummary && (
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm leading-6 text-slate-700">
            {timelineSummary}
          </p>
        </div>
      )}

      {timelineItems.length > 0 ? (
        <div className="space-y-4">
          {timelineItems.map((item, index) => {
            const title =
              item.title ||
              item.label ||
              item.category ||
              item.period ||
              `Timeline Event ${index + 1}`;

            const description =
              item.description || item.summary || item.insight;

            return (
              <div
                key={item.id ?? index}
                className="relative rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {title}
                    </h3>

                    {description && (
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {description}
                      </p>
                    )}
                  </div>

                  {(item.date || item.period) && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      {item.date || item.period}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {item.status && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Status: {item.status}
                    </span>
                  )}

                  {item.severity && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Severity: {item.severity}
                    </span>
                  )}

                  {item.source && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Source: {item.source}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <p className="text-sm text-slate-600">
            Timeline intelligence will appear here after the report is analyzed.
          </p>
        </div>
      )}
    </section>
  );
}