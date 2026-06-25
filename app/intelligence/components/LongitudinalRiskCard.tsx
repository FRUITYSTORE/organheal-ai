type LongitudinalRiskCardProps = {
  longitudinalRisk: unknown;
};

type RiskItem = {
  id?: string | number;
  title?: string;
  marker?: string;
  organ?: string;
  organSystem?: string;
  risk?: string;
  riskLevel?: string;
  level?: string;
  trend?: string;
  direction?: string;
  timeframe?: string;
  currentValue?: string;
  previousValue?: string;
  explanation?: string;
  reason?: string;
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

function normalizeRiskItems(longitudinalRisk: unknown): RiskItem[] {
  if (Array.isArray(longitudinalRisk)) {
    return longitudinalRisk.filter(isRecord).map((item, index) => ({
      id: getText(item.id) || index,
      title: getText(item.title),
      marker: getText(item.marker),
      organ: getText(item.organ),
      organSystem: getText(item.organSystem),
      risk: getText(item.risk),
      riskLevel: getText(item.riskLevel),
      level: getText(item.level),
      trend: getText(item.trend),
      direction: getText(item.direction),
      timeframe: getText(item.timeframe),
      currentValue: getText(item.currentValue),
      previousValue: getText(item.previousValue),
      explanation: getText(item.explanation),
      reason: getText(item.reason),
      recommendation: getText(item.recommendation),
    }));
  }

  if (!isRecord(longitudinalRisk)) return [];

  const possibleItems =
    longitudinalRisk.items ||
    longitudinalRisk.risks ||
    longitudinalRisk.riskItems ||
    longitudinalRisk.riskSignals ||
    longitudinalRisk.longitudinalRisks ||
    longitudinalRisk.patterns ||
    longitudinalRisk.trends;

  if (!Array.isArray(possibleItems)) return [];

  return possibleItems.filter(isRecord).map((item, index) => ({
    id: getText(item.id) || index,
    title: getText(item.title),
    marker: getText(item.marker),
    organ: getText(item.organ),
    organSystem: getText(item.organSystem),
    risk: getText(item.risk),
    riskLevel: getText(item.riskLevel),
    level: getText(item.level),
    trend: getText(item.trend),
    direction: getText(item.direction),
    timeframe: getText(item.timeframe),
    currentValue: getText(item.currentValue),
    previousValue: getText(item.previousValue),
    explanation: getText(item.explanation),
    reason: getText(item.reason),
    recommendation: getText(item.recommendation),
  }));
}

function getRiskSummary(longitudinalRisk: unknown): string {
  if (typeof longitudinalRisk === "string") return longitudinalRisk;

  if (!isRecord(longitudinalRisk)) return "";

  return (
    getText(longitudinalRisk.summary) ||
    getText(longitudinalRisk.overview) ||
    getText(longitudinalRisk.narrative) ||
    getText(longitudinalRisk.description)
  );
}

function getOverallRiskLevel(longitudinalRisk: unknown): string {
  if (!isRecord(longitudinalRisk)) return "";

  return (
    getText(longitudinalRisk.overallRiskLevel) ||
    getText(longitudinalRisk.overallRisk) ||
    getText(longitudinalRisk.riskLevel) ||
    getText(longitudinalRisk.level)
  );
}

export default function LongitudinalRiskCard({
  longitudinalRisk,
}: LongitudinalRiskCardProps) {
  const riskItems = normalizeRiskItems(longitudinalRisk);
  const riskSummary = getRiskSummary(longitudinalRisk);
  const overallRiskLevel = getOverallRiskLevel(longitudinalRisk);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Longitudinal Intelligence
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Longitudinal Risk
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            A longitudinal view of risk signals based on available historical
            patterns, marker movement, and detected clinical direction.
          </p>
        </div>

        {overallRiskLevel && (
          <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
            Overall: {overallRiskLevel}
          </span>
        )}
      </div>

      {riskSummary && (
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm leading-6 text-slate-700">{riskSummary}</p>
        </div>
      )}

      {riskItems.length > 0 ? (
        <div className="grid gap-4">
          {riskItems.map((item, index) => {
            const title =
              item.title ||
              item.marker ||
              item.organSystem ||
              item.organ ||
              `Risk Signal ${index + 1}`;

            const riskLevel = item.riskLevel || item.level || item.risk;
            const trend = item.trend || item.direction;
            const explanation = item.explanation || item.reason;

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

                    {(item.organSystem || item.organ) && (
                      <p className="mt-1 text-sm text-slate-500">
                        {item.organSystem || item.organ}
                      </p>
                    )}
                  </div>

                  {riskLevel && (
                    <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Risk: {riskLevel}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {trend && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Trend: {trend}
                    </span>
                  )}

                  {item.timeframe && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Timeframe: {item.timeframe}
                    </span>
                  )}

                  {item.previousValue && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Previous: {item.previousValue}
                    </span>
                  )}

                  {item.currentValue && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Current: {item.currentValue}
                    </span>
                  )}
                </div>

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
            Longitudinal risk intelligence will appear here after enough
            historical marker data is available.
          </p>
        </div>
      )}
    </section>
  );
}