type CrossSourceCardProps = {
  crossSource: unknown;
};

type CrossSourceItem = {
  id?: string | number;
  title?: string;
  pattern?: string;
  connection?: string;
  source?: string;
  primarySource?: string;
  secondarySource?: string;
  sources?: string[];
  finding?: string;
  insight?: string;
  summary?: string;
  interpretation?: string;
  risk?: string;
  confidence?: string;
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

function getTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => getText(item))
    .filter((item) => item.trim().length > 0);
}

function normalizeCrossSourceItems(crossSource: unknown): CrossSourceItem[] {
  if (Array.isArray(crossSource)) {
    return crossSource.filter(isRecord).map((item, index) => ({
      id: getText(item.id) || index,
      title: getText(item.title),
      pattern: getText(item.pattern),
      connection: getText(item.connection),
      source: getText(item.source),
      primarySource: getText(item.primarySource),
      secondarySource: getText(item.secondarySource),
      sources: getTextList(item.sources),
      finding: getText(item.finding),
      insight: getText(item.insight),
      summary: getText(item.summary),
      interpretation: getText(item.interpretation),
      risk: getText(item.risk),
      confidence: getText(item.confidence),
      recommendation: getText(item.recommendation),
    }));
  }

  if (!isRecord(crossSource)) return [];

  const possibleItems =
    crossSource.items ||
    crossSource.findings ||
    crossSource.connections ||
    crossSource.patterns ||
    crossSource.insights ||
    crossSource.crossSource ||
    crossSource.crossSourceInsights ||
    crossSource.crossSourceFindings;

  if (!Array.isArray(possibleItems)) return [];

  return possibleItems.filter(isRecord).map((item, index) => ({
    id: getText(item.id) || index,
    title: getText(item.title),
    pattern: getText(item.pattern),
    connection: getText(item.connection),
    source: getText(item.source),
    primarySource: getText(item.primarySource),
    secondarySource: getText(item.secondarySource),
    sources: getTextList(item.sources),
    finding: getText(item.finding),
    insight: getText(item.insight),
    summary: getText(item.summary),
    interpretation: getText(item.interpretation),
    risk: getText(item.risk),
    confidence: getText(item.confidence),
    recommendation: getText(item.recommendation),
  }));
}

function getCrossSourceSummary(crossSource: unknown): string {
  if (typeof crossSource === "string") return crossSource;

  if (!isRecord(crossSource)) return "";

  return (
    getText(crossSource.summary) ||
    getText(crossSource.overview) ||
    getText(crossSource.narrative) ||
    getText(crossSource.description)
  );
}

function getCrossSourceConfidence(crossSource: unknown): string {
  if (!isRecord(crossSource)) return "";

  return (
    getText(crossSource.confidence) ||
    getText(crossSource.confidenceLevel) ||
    getText(crossSource.reliability) ||
    getText(crossSource.signalStrength)
  );
}

export default function CrossSourceCard({ crossSource }: CrossSourceCardProps) {
  const crossSourceItems = normalizeCrossSourceItems(crossSource);
  const summary = getCrossSourceSummary(crossSource);
  const confidence = getCrossSourceConfidence(crossSource);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Multi-Source Intelligence
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Cross Source Intelligence
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Connects signals across reports, laboratory markers, radiology
            findings, clinical patterns, and health history.
          </p>
        </div>

        {confidence && (
          <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
            Confidence: {confidence}
          </span>
        )}
      </div>

      {summary && (
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm leading-6 text-slate-700">{summary}</p>
        </div>
      )}

      {crossSourceItems.length > 0 ? (
        <div className="grid gap-4">
          {crossSourceItems.map((item, index) => {
            const title =
              item.title ||
              item.pattern ||
              item.connection ||
              item.finding ||
              `Cross Source Signal ${index + 1}`;

            const explanation =
              item.insight || item.interpretation || item.summary;

            const sources =
              item.sources && item.sources.length > 0
                ? item.sources
                : [item.primarySource, item.secondarySource, item.source].filter(
                    Boolean
                  );

            return (
              <div
                key={item.id ?? index}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {title}
                    </h3>

                    {sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {sources.map((source, sourceIndex) => (
                          <span
                            key={`${source}-${sourceIndex}`}
                            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                          >
                            {source}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {item.risk && (
                    <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Risk: {item.risk}
                    </span>
                  )}
                </div>

                {explanation && (
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {explanation}
                  </p>
                )}

                {item.confidence && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Confidence: {item.confidence}
                    </span>
                  </div>
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
            Cross source intelligence will appear here after OrganHeal connects
            signals across available health data sources.
          </p>
        </div>
      )}
    </section>
  );
}