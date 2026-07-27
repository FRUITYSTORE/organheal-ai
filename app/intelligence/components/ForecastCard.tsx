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
  if (typeof value === "string") return value.trim();

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

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
  if (typeof forecast === "string") {
    return forecast.trim();
  }

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

function getTone(value: string) {
  const normalized = value.toLowerCase();

  if (
    normalized.includes("high") ||
    normalized.includes("strong") ||
    normalized.includes("stable") ||
    normalized.includes("improv")
  ) {
    return "good";
  }

  if (
    normalized.includes("moderate") ||
    normalized.includes("medium") ||
    normalized.includes("mixed")
  ) {
    return "moderate";
  }

  if (
    normalized.includes("low") ||
    normalized.includes("weak") ||
    normalized.includes("declin") ||
    normalized.includes("wors")
  ) {
    return "risk";
  }

  return "neutral";
}

export default function ForecastCard({
  forecast,
}: ForecastCardProps) {
  const forecastItems = normalizeForecastItems(forecast);
  const summary = getForecastSummary(forecast);
  const horizon = getForecastHorizon(forecast);
  const confidence = getForecastConfidence(forecast);

  const hasForecastData =
    Boolean(summary) ||
    Boolean(horizon) ||
    Boolean(confidence) ||
    forecastItems.length > 0;

  return (
    <section className="healthForecastResult">
      <style>{`
        .healthForecastResult,
        .healthForecastResult * {
          box-sizing: border-box;
        }

        .healthForecastResult {
          padding: 20px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 18px;
          background: #ffffff;
        }

        .healthForecastHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.07);
        }

        .healthForecastEyebrow {
          margin: 0;
          color: #0f766e;
          font-size: 0.68rem;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .healthForecastTitle {
          margin: 6px 0 0;
          color: #0f172a;
          font-size: 1.18rem;
          font-weight: 950;
          line-height: 1.3;
        }

        .healthForecastDescription {
          max-width: 720px;
          margin: 7px 0 0;
          color: #64748b;
          font-size: 0.82rem;
          line-height: 1.6;
        }

        .healthForecastBadges {
          display: flex;
          flex: 0 0 auto;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 7px;
        }

        .healthForecastBadge {
          padding: 7px 10px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          font-size: 0.68rem;
          font-weight: 900;
          white-space: nowrap;
        }

        .healthForecastBadge.good {
          background: #ecfdf5;
          color: #047857;
        }

        .healthForecastBadge.moderate {
          background: #fffbeb;
          color: #b45309;
        }

        .healthForecastBadge.risk {
          background: #fef2f2;
          color: #b91c1c;
        }

        .healthForecastBadge.neutral {
          background: #f1f5f9;
          color: #475569;
        }

        .healthForecastSignal {
          margin-top: 16px;
          padding: 15px 16px;
          border: 1px solid rgba(15, 118, 110, 0.15);
          border-left: 4px solid #0f766e;
          border-radius: 14px;
          background: #f0fdfa;
        }

        .healthForecastSignalLabel {
          margin: 0;
          color: #0f766e;
          font-size: 0.66rem;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .healthForecastSignalText {
          margin: 7px 0 0;
          color: #334155;
          font-size: 0.88rem;
          line-height: 1.65;
        }

        .healthForecastGrid {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }

        .healthForecastItem {
          padding: 14px 15px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 14px;
          background: #f8fafc;
        }

        .healthForecastItemHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .healthForecastItemTitle {
          margin: 0;
          color: #0f172a;
          font-size: 0.9rem;
          font-weight: 900;
          line-height: 1.4;
        }

        .healthForecastContext {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 0.72rem;
          line-height: 1.45;
        }

        .healthForecastRisk {
          flex: 0 0 auto;
          padding: 5px 8px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #475569;
          font-size: 0.67rem;
          font-weight: 850;
        }

        .healthForecastMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 10px;
        }

        .healthForecastMeta span {
          padding: 5px 8px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #64748b;
          font-size: 0.67rem;
          font-weight: 750;
        }

        .healthForecastExplanation {
          margin: 10px 0 0;
          color: #475569;
          font-size: 0.8rem;
          line-height: 1.6;
        }

        .healthForecastRecommendation {
          margin-top: 10px;
          padding: 11px 12px;
          border: 1px solid rgba(37, 99, 235, 0.12);
          border-radius: 12px;
          background: #f8fbff;
        }

        .healthForecastRecommendation strong {
          display: block;
          color: #1d4ed8;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .healthForecastRecommendation p {
          margin: 5px 0 0;
          color: #475569;
          font-size: 0.78rem;
          line-height: 1.6;
        }

        .healthForecastEmpty {
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
          .healthForecastResult {
            padding: 16px;
          }

          .healthForecastHeader,
          .healthForecastItemHeader {
            flex-direction: column;
          }

          .healthForecastBadges {
            justify-content: flex-start;
          }
        }
      `}</style>

      <header className="healthForecastHeader">
        <div>
          <p className="healthForecastEyebrow">
            Forward-looking intelligence
          </p>

          <h3 className="healthForecastTitle">
            Possible future health direction
          </h3>

          <p className="healthForecastDescription">
            Forecast signals describe possible future direction from the
            available health history. They are projections, not diagnoses or
            guarantees of future outcomes.
          </p>
        </div>

        {(horizon || confidence) && (
          <div className="healthForecastBadges">
            {horizon && (
              <span className="healthForecastBadge neutral">
                Horizon: {horizon}
              </span>
            )}

            {confidence && (
              <span
                className={`healthForecastBadge ${getTone(
                  confidence
                )}`}
              >
                Confidence: {confidence}
              </span>
            )}
          </div>
        )}
      </header>

      {summary && (
        <div className="healthForecastSignal">
          <p className="healthForecastSignalLabel">
            Current forecast signal
          </p>

          <p className="healthForecastSignalText">
            {summary}
          </p>
        </div>
      )}

      {forecastItems.length > 0 && (
        <div className="healthForecastGrid">
          {forecastItems.map((item, index) => {
            const title =
              item.title ||
              item.scenario ||
              item.organ ||
              item.system ||
              `Forecast signal ${index + 1}`;

            const riskLevel =
              item.riskLevel ||
              item.risk;

            const timeframe =
              item.timeframe ||
              item.horizon;

            const explanation =
              item.insight ||
              item.summary ||
              item.description;

            const context = [
              item.organ,
              item.system,
              item.category,
            ]
              .filter(Boolean)
              .join(" • ");

            const suggestedFocus =
              item.recommendation ||
              item.action;

            return (
              <article
                className="healthForecastItem"
                key={item.id ?? `${title}-${index}`}
              >
                <div className="healthForecastItemHeader">
                  <div>
                    <h4 className="healthForecastItemTitle">
                      {title}
                    </h4>

                    {context && (
                      <p className="healthForecastContext">
                        {context}
                      </p>
                    )}
                  </div>

                  {riskLevel && (
                    <span className="healthForecastRisk">
                      Risk: {riskLevel}
                    </span>
                  )}
                </div>

                {(timeframe ||
                  item.probability ||
                  item.confidence ||
                  item.direction ||
                  item.projectedChange) && (
                  <div className="healthForecastMeta">
                    {timeframe && (
                      <span>
                        Timeframe: {timeframe}
                      </span>
                    )}

                    {item.probability && (
                      <span>
                        Probability: {item.probability}
                      </span>
                    )}

                    {item.confidence && (
                      <span>
                        Confidence: {item.confidence}
                      </span>
                    )}

                    {item.direction && (
                      <span>
                        Direction: {item.direction}
                      </span>
                    )}

                    {item.projectedChange && (
                      <span>
                        Projected change: {item.projectedChange}
                      </span>
                    )}
                  </div>
                )}

                {explanation && (
                  <p className="healthForecastExplanation">
                    {explanation}
                  </p>
                )}

                {suggestedFocus && (
                  <div className="healthForecastRecommendation">
                    <strong>Suggested focus</strong>
                    <p>{suggestedFocus}</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!hasForecastData && (
        <div className="healthForecastEmpty">
          More longitudinal health history is needed before OrganHeal can
          produce a meaningful forward-looking projection.
        </div>
      )}
    </section>
  );
}