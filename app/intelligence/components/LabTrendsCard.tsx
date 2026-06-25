type LabTrendsCardProps = {
  labTrends: unknown;
};

type LabTrendItem = {
  id?: string | number;
  marker?: string;
  markerName?: string;
  name?: string;
  category?: string;
  organ?: string;
  unit?: string;
  currentValue?: string;
  previousValue?: string;
  baselineValue?: string;
  change?: string;
  trend?: string;
  direction?: string;
  status?: string;
  interpretation?: string;
  summary?: string;
  recommendation?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function normalizeLabTrendItems(labTrends: unknown): LabTrendItem[] {
  if (Array.isArray(labTrends)) {
    return labTrends.filter(isRecord).map((item, index) => ({
      id: getText(item.id) || index,
      marker: getText(item.marker),
      markerName: getText(item.markerName),
      name: getText(item.name),
      category: getText(item.category),
      organ: getText(item.organ),
      unit: getText(item.unit),
      currentValue: getText(item.currentValue),
      previousValue: getText(item.previousValue),
      baselineValue: getText(item.baselineValue),
      change: getText(item.change),
      trend: getText(item.trend),
      direction: getText(item.direction),
      status: getText(item.status),
      interpretation: getText(item.interpretation),
      summary: getText(item.summary),
      recommendation: getText(item.recommendation),
    }));
  }

  if (!isRecord(labTrends)) return [];

  const possibleItems =
    labTrends.items ||
    labTrends.trends ||
    labTrends.labTrends ||
    labTrends.markers ||
    labTrends.markerTrends ||
    labTrends.historicalTrends ||
    labTrends.results;

  if (!Array.isArray(possibleItems)) return [];

  return possibleItems.filter(isRecord).map((item, index) => ({
    id: getText(item.id) || index,
    marker: getText(item.marker),
    markerName: getText(item.markerName),
    name: getText(item.name),
    category: getText(item.category),
    organ: getText(item.organ),
    unit: getText(item.unit),
    currentValue: getText(item.currentValue),
    previousValue: getText(item.previousValue),
    baselineValue: getText(item.baselineValue),
    change: getText(item.change),
    trend: getText(item.trend),
    direction: getText(item.direction),
    status: getText(item.status),
    interpretation: getText(item.interpretation),
    summary: getText(item.summary),
    recommendation: getText(item.recommendation),
  }));
}

function getLabTrendsSummary(labTrends: unknown): string {
  if (typeof labTrends === "string") return labTrends;

  if (!isRecord(labTrends)) return "";

  return (
    getText(labTrends.summary) ||
    getText(labTrends.overview) ||
    getText(labTrends.narrative) ||
    getText(labTrends.description)
  );
}

function getHistoricalDepth(labTrends: unknown): string {
  if (!isRecord(labTrends)) return "";

  return (
    getText(labTrends.historicalDepth) ||
    getText(labTrends.dataDepth) ||
    getText(labTrends.historyAvailable) ||
    getText(labTrends.timeRange)
  );
}

function formatValue(value: string, unit?: string): string {
  if (!value) return "";
  if (!unit) return value;
  return `${value} ${unit}`;
}

export default function LabTrendsCard({ labTrends }: LabTrendsCardProps) {
  const trendItems = normalizeLabTrendItems(labTrends);
  const summary = getLabTrendsSummary(labTrends);
  const historicalDepth = getHistoricalDepth(labTrends);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Historical Intelligence
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Historical Lab Trends
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            A historical view of laboratory marker movement based on saved
            marker history, not only the current uploaded report.
          </p>
        </div>

        {historicalDepth && (
          <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
            History: {historicalDepth}
          </span>
        )}
      </div>

      {summary && (
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm leading-6 text-slate-700">{summary}</p>
        </div>
      )}

      {trendItems.length > 0 ? (
        <div className="grid gap-4">
          {trendItems.map((item, index) => {
            const markerName =
              item.markerName ||
              item.marker ||
              item.name ||
              `Lab Marker ${index + 1}`;

            const movement = item.trend || item.direction || item.change;
            const explanation = item.interpretation || item.summary;

            return (
              <div
                key={item.id ?? index}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {markerName}
                    </h3>

                    {(item.category || item.organ) && (
                      <p className="mt-1 text-sm text-slate-500">
                        {item.category || item.organ}
                      </p>
                    )}
                  </div>

                  {item.status && (
                    <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Status: {item.status}
                    </span>
                  )}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {item.baselineValue && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Baseline
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {formatValue(item.baselineValue, item.unit)}
                      </p>
                    </div>
                  )}

                  {item.previousValue && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Previous
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {formatValue(item.previousValue, item.unit)}
                      </p>
                    </div>
                  )}

                  {item.currentValue && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Current
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {formatValue(item.currentValue, item.unit)}
                      </p>
                    </div>
                  )}
                </div>

                {movement && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Trend: {movement}
                    </span>
                  </div>
                )}

                {explanation && (
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {explanation}
                  </p>
                )}

                {item.recommendation && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Suggested Focus
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {item.recommendation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <p className="text-sm text-slate-600">
            Historical lab trends will appear here once saved marker history is
            available for comparison.
          </p>
        </div>
      )}
    </section>
  );
}