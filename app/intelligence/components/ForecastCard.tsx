type ForecastCardProps = {
  forecast: unknown;
};

type ForecastItem = {
  id?: string | number;
  title?: string;
  organ?: string;
  system?: string;
  category?: string;
  timeframe?: string;
  horizon?: string;
  scenario?: string;
  risk?: string;
  riskLevel?: string;
  probability?: string;
  confidence?: string;
  direction?: string;
  projectedChange?: string;
  insight?: string;
  summary?: string;
  description?: string;
  recommendation?: string;
  action?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function normalizeForecastItems(forecast: unknown): ForecastItem[] {
  if (Array.isArray(forecast)) {
    return forecast.filter(isRecord).map((item, index) => ({
      id: getText(item.id) || index,
      title: getText(item.title),
      organ: getText(item.organ),
      system: getText(item.system),
      category: getText(item.category),
      timeframe: getText(item.timeframe),
      horizon: getText(item.horizon),
      scenario: getText(item.scenario),
      risk: getText(item.risk),
      riskLevel: getText(item.riskLevel),
      probability: getText(item.probability),
      confidence: getText(item.confidence),
      direction: getText(item.direction),
      projectedChange: getText(item.projectedChange),
      insight: getText(item.insight),
      summary: getText(item.summary),
      description: getText(item.description),
      recommendation: getText(item.recommendation),
      action: getText(item.action),
    }));
  }

  if (!isRecord(forecast)) return [];

  const possibleItems =
    forecast.items ||
    forecast.forecasts ||
    forecast.predictions ||
    forecast.projections ||
    forecast.riskForecasts ||
    forecast.healthForecasts ||
    forecast.forecastItems ||
    forecast.nextSteps;

  if (!Array.isArray(possibleItems)) return [];

  return possibleItems.filter(isRecord).map((item, index) => ({
    id: getText(item.id) || index,
    title: getText(item.title),
    organ: getText(item.organ),
    system: getText(item.system),
    category: getText(item.category),
    timeframe: getText(item.timeframe),
    horizon: getText(item.horizon),
    scenario: getText(item.scenario),
    risk: getText(item.risk),
    riskLevel: getText(item.riskLevel),
    probability: getText(item.probability),
    confidence: getText(item.confidence),
    direction: getText(item.direction),
    projectedChange: getText(item.projectedChange),
    insight: getText(item.insight),
    summary: getText(item.summary),
    description: getText(item.description),
    recommendation: getText(item.recommendation),
    action: getText(item.action),
  }));
}

function getForecastSummary(forecast: unknown): string {
  if (typeof forecast === "string") return forecast;

  if (!isRecord(forecast)) return "";

  return (
    getText(forecast.summary) ||
    getText(forecast.overview) ||
    getText(forecast.narrative) ||
    getText(forecast.description)
  );
}

function getForecastHorizon(forecast: unknown): string {
  if (!isRecord(forecast)) return "";

  return (
    getText(forecast.horizon) ||
    getText(forecast.timeframe) ||
    getText(forecast.forecastWindow) ||
    getText(forecast.period)
  );
}

function getForecastConfidence(forecast: unknown): string {
  if (!isRecord(forecast)) return "";

  return (
    getText(forecast.confidence) ||
    getText(forecast.confidenceLevel) ||
    getText(forecast.signalStrength) ||
    getText(forecast.reliability)
  );
}

export default function ForecastCard({ forecast }: ForecastCardProps) {
  const forecastItems = normalizeForecastItems(forecast);
  const summary = getForecastSummary(forecast);
  const horizon = getForecastHorizon(forecast);
  const confidence = getForecastConfidence(forecast);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Predictive Intelligence
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Forecast
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            A forward-looking view of possible health direction based on current
            markers, detected risks, and available longitudinal signals.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {horizon && (
            <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
              Horizon: {horizon}
            </span>
          )}

          {confidence && (
            <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
              Confidence: {confidence}
            </span>
          )}
        </div>
      </div>

      {summary && (
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm leading-6 text-slate-700">{summary}</p>
        </div>
      )}

      {forecastItems.length > 0 ? (
        <div className="grid gap-4">
          {forecastItems.map((item, index) => {
            const title =
              item.title ||
              item.scenario ||
              item.organ ||
              item.system ||
              `Forecast Signal ${index + 1}`;

            const riskLevel = item.riskLevel || item.risk;
            const timeframe = item.timeframe || item.horizon;
            const explanation =
              item.insight || item.summary || item.description;

            const contextParts = [
              item.organ,
              item.system,
              item.category,
            ].filter(
              (value): value is string =>
                typeof value === "string" && value.trim().length > 0
            );

            const suggestedFocus = item.recommendation || item.action;

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

                    {contextParts.length > 0 && (
                      <p className="mt-1 text-sm text-slate-500">
                        {contextParts.join(" â€¢ ")}
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
                  {timeframe && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Timeframe: {timeframe}
                    </span>
                  )}

                  {item.probability && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Probability: {item.probability}
                    </span>
                  )}

                  {item.confidence && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Confidence: {item.confidence}
                    </span>
                  )}

                  {item.direction && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Direction: {item.direction}
                    </span>
                  )}

                  {item.projectedChange && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      Projected Change: {item.projectedChange}
                    </span>
                  )}
                </div>

                {explanation && (
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {explanation}
                  </p>
                )}

                {suggestedFocus && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Suggested Focus
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {suggestedFocus}
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
            Forecast intelligence will appear here after OrganHeal generates a
            forward-looking health projection from available data.
          </p>
        </div>
      )}
    </section>
  );
}

