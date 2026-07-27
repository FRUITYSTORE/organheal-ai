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
  if (typeof value === "string") return value.trim();

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

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
  if (typeof longitudinalRisk === "string") {
    return longitudinalRisk.trim();
  }

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

function getRiskTone(value: string) {
  const normalized = value.toLowerCase();

  if (
    normalized.includes("high") ||
    normalized.includes("severe")
  ) {
    return "risk";
  }

  if (
    normalized.includes("moderate") ||
    normalized.includes("medium")
  ) {
    return "moderate";
  }

  if (
    normalized.includes("low") ||
    normalized.includes("stable")
  ) {
    return "good";
  }

  return "neutral";
}

export default function LongitudinalRiskCard({
  longitudinalRisk,
}: LongitudinalRiskCardProps) {
  const riskItems = normalizeRiskItems(longitudinalRisk);
  const riskSummary = getRiskSummary(longitudinalRisk);
  const overallRiskLevel = getOverallRiskLevel(longitudinalRisk);

  const hasLongitudinalRisk =
    Boolean(riskSummary) ||
    Boolean(overallRiskLevel) ||
    riskItems.length > 0;

  return (
    <section className="longitudinalRiskResult">
      <style>{`
        .longitudinalRiskResult,
        .longitudinalRiskResult * {
          box-sizing: border-box;
        }

        .longitudinalRiskResult {
          padding: 20px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 18px;
          background: #ffffff;
        }

        .longitudinalRiskHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.07);
        }

        .longitudinalRiskEyebrow {
          margin: 0;
          color: #0f766e;
          font-size: 0.68rem;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .longitudinalRiskTitle {
          margin: 6px 0 0;
          color: #0f172a;
          font-size: 1.18rem;
          font-weight: 950;
          line-height: 1.3;
        }

        .longitudinalRiskDescription {
          max-width: 720px;
          margin: 7px 0 0;
          color: #64748b;
          font-size: 0.82rem;
          line-height: 1.6;
        }

        .longitudinalRiskOverall {
          flex: 0 0 auto;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 900;
          white-space: nowrap;
        }

        .longitudinalRiskOverall.risk {
          background: #fef2f2;
          color: #b91c1c;
        }

        .longitudinalRiskOverall.moderate {
          background: #fffbeb;
          color: #b45309;
        }

        .longitudinalRiskOverall.good {
          background: #ecfdf5;
          color: #047857;
        }

        .longitudinalRiskOverall.neutral {
          background: #f1f5f9;
          color: #475569;
        }

        .longitudinalRiskSignal {
          margin-top: 16px;
          padding: 15px 16px;
          border: 1px solid rgba(15, 118, 110, 0.15);
          border-left: 4px solid #0f766e;
          border-radius: 14px;
          background: #f0fdfa;
        }

        .longitudinalRiskSignalLabel {
          margin: 0;
          color: #0f766e;
          font-size: 0.66rem;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .longitudinalRiskSignalText {
          margin: 7px 0 0;
          color: #334155;
          font-size: 0.88rem;
          line-height: 1.65;
        }

        .longitudinalRiskGrid {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }

        .longitudinalRiskItem {
          padding: 14px 15px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 14px;
          background: #f8fafc;
        }

        .longitudinalRiskItemHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .longitudinalRiskItemTitle {
          margin: 0;
          color: #0f172a;
          font-size: 0.9rem;
          font-weight: 900;
          line-height: 1.4;
        }

        .longitudinalRiskItemSystem {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 0.72rem;
          font-weight: 750;
        }

        .longitudinalRiskLevel {
          flex: 0 0 auto;
          padding: 5px 8px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #475569;
          font-size: 0.67rem;
          font-weight: 850;
        }

        .longitudinalRiskMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 10px;
        }

        .longitudinalRiskMeta span {
          padding: 5px 8px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #64748b;
          font-size: 0.67rem;
          font-weight: 750;
        }

        .longitudinalRiskExplanation {
          margin: 10px 0 0;
          color: #475569;
          font-size: 0.8rem;
          line-height: 1.6;
        }

        .longitudinalRiskRecommendation {
          margin-top: 10px;
          padding: 11px 12px;
          border: 1px solid rgba(37, 99, 235, 0.12);
          border-radius: 12px;
          background: #f8fbff;
        }

        .longitudinalRiskRecommendation strong {
          display: block;
          color: #1d4ed8;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .longitudinalRiskRecommendation p {
          margin: 5px 0 0;
          color: #475569;
          font-size: 0.78rem;
          line-height: 1.6;
        }

        .longitudinalRiskEmpty {
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
          .longitudinalRiskResult {
            padding: 16px;
          }

          .longitudinalRiskHeader,
          .longitudinalRiskItemHeader {
            flex-direction: column;
          }
        }
      `}</style>

      <header className="longitudinalRiskHeader">
        <div>
          <p className="longitudinalRiskEyebrow">
            Longitudinal risk
          </p>

          <h3 className="longitudinalRiskTitle">
            Risk direction over time
          </h3>

          <p className="longitudinalRiskDescription">
            Risk patterns are shown only when OrganHeal has enough historical
            evidence to identify meaningful movement across time.
          </p>
        </div>

        {overallRiskLevel && (
          <span
            className={`longitudinalRiskOverall ${getRiskTone(
              overallRiskLevel
            )}`}
          >
            Overall: {overallRiskLevel}
          </span>
        )}
      </header>

      {riskSummary && (
        <div className="longitudinalRiskSignal">
          <p className="longitudinalRiskSignalLabel">
            Current longitudinal signal
          </p>

          <p className="longitudinalRiskSignalText">
            {riskSummary}
          </p>
        </div>
      )}

      {riskItems.length > 0 && (
        <div className="longitudinalRiskGrid">
          {riskItems.map((item, index) => {
            const title =
              item.title ||
              item.marker ||
              item.organSystem ||
              item.organ ||
              `Risk signal ${index + 1}`;

            const riskLevel =
              item.riskLevel ||
              item.level ||
              item.risk;

            const trend =
              item.trend ||
              item.direction;

            const explanation =
              item.explanation ||
              item.reason;

            return (
              <article
                className="longitudinalRiskItem"
                key={item.id ?? `${title}-${index}`}
              >
                <div className="longitudinalRiskItemHeader">
                  <div>
                    <h4 className="longitudinalRiskItemTitle">
                      {title}
                    </h4>

                    {(item.organSystem || item.organ) && (
                      <p className="longitudinalRiskItemSystem">
                        {item.organSystem || item.organ}
                      </p>
                    )}
                  </div>

                  {riskLevel && (
                    <span className="longitudinalRiskLevel">
                      Risk: {riskLevel}
                    </span>
                  )}
                </div>

                {(trend ||
                  item.timeframe ||
                  item.previousValue ||
                  item.currentValue) && (
                  <div className="longitudinalRiskMeta">
                    {trend && (
                      <span>Trend: {trend}</span>
                    )}

                    {item.timeframe && (
                      <span>
                        Timeframe: {item.timeframe}
                      </span>
                    )}

                    {item.previousValue && (
                      <span>
                        Previous: {item.previousValue}
                      </span>
                    )}

                    {item.currentValue && (
                      <span>
                        Current: {item.currentValue}
                      </span>
                    )}
                  </div>
                )}

                {explanation && (
                  <p className="longitudinalRiskExplanation">
                    {explanation}
                  </p>
                )}

                {item.recommendation && (
                  <div className="longitudinalRiskRecommendation">
                    <strong>Suggested focus</strong>
                    <p>{item.recommendation}</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!hasLongitudinalRisk && (
        <div className="longitudinalRiskEmpty">
          More historical health data is needed before OrganHeal can identify
          a reliable longitudinal risk pattern.
        </div>
      )}
    </section>
  );
}