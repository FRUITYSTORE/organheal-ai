type DigitalTwinCardProps = {
  digitalTwin: unknown;
};

type DigitalTwinSignal = {
  id?: string | number;
  title?: string;
  organ?: string;
  system?: string;
  category?: string;
  status?: string;
  riskLevel?: string;
  confidence?: string;
  signal?: string;
  insight?: string;
  summary?: string;
  description?: string;
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

function normalizeDigitalTwinSignals(
  digitalTwin: unknown
): DigitalTwinSignal[] {
  if (Array.isArray(digitalTwin)) {
    return digitalTwin.filter(isRecord).map((item, index) => ({
      id: getText(item.id) || index,
      title: getText(item.title),
      organ: getText(item.organ),
      system: getText(item.system),
      category: getText(item.category),
      status: getText(item.status),
      riskLevel: getText(item.riskLevel),
      confidence: getText(item.confidence),
      signal: getText(item.signal),
      insight: getText(item.insight),
      summary: getText(item.summary),
      description: getText(item.description),
      recommendation: getText(item.recommendation),
    }));
  }

  if (!isRecord(digitalTwin)) return [];

  const possibleItems =
    digitalTwin.items ||
    digitalTwin.signals ||
    digitalTwin.systems ||
    digitalTwin.organs ||
    digitalTwin.organSignals ||
    digitalTwin.digitalTwin ||
    digitalTwin.twinSignals ||
    digitalTwin.healthModel;

  if (!Array.isArray(possibleItems)) return [];

  return possibleItems.filter(isRecord).map((item, index) => ({
    id: getText(item.id) || index,
    title: getText(item.title),
    organ: getText(item.organ),
    system: getText(item.system),
    category: getText(item.category),
    status: getText(item.status),
    riskLevel: getText(item.riskLevel),
    confidence: getText(item.confidence),
    signal: getText(item.signal),
    insight: getText(item.insight),
    summary: getText(item.summary),
    description: getText(item.description),
    recommendation: getText(item.recommendation),
  }));
}

function getDigitalTwinSummary(digitalTwin: unknown): string {
  if (typeof digitalTwin === "string") {
    return digitalTwin.trim();
  }

  if (!isRecord(digitalTwin)) return "";

  return (
    getText(digitalTwin.summary) ||
    getText(digitalTwin.overview) ||
    getText(digitalTwin.narrative) ||
    getText(digitalTwin.description)
  );
}

function getDigitalTwinStatus(digitalTwin: unknown): string {
  if (!isRecord(digitalTwin)) return "";

  return (
    getText(digitalTwin.status) ||
    getText(digitalTwin.overallStatus) ||
    getText(digitalTwin.healthState) ||
    getText(digitalTwin.modelStatus)
  );
}

function getDigitalTwinConfidence(digitalTwin: unknown): string {
  if (!isRecord(digitalTwin)) return "";

  return (
    getText(digitalTwin.confidence) ||
    getText(digitalTwin.confidenceLevel) ||
    getText(digitalTwin.modelConfidence) ||
    getText(digitalTwin.signalStrength)
  );
}

function getTone(value: string) {
  const normalized = value.toLowerCase();

  if (
    normalized.includes("high") ||
    normalized.includes("strong") ||
    normalized.includes("stable")
  ) {
    return "good";
  }

  if (
    normalized.includes("moderate") ||
    normalized.includes("medium")
  ) {
    return "moderate";
  }

  if (
    normalized.includes("low") ||
    normalized.includes("weak") ||
    normalized.includes("risk")
  ) {
    return "risk";
  }

  return "neutral";
}

export default function DigitalTwinCard({
  digitalTwin,
}: DigitalTwinCardProps) {
  const signals = normalizeDigitalTwinSignals(digitalTwin);
  const summary = getDigitalTwinSummary(digitalTwin);
  const status = getDigitalTwinStatus(digitalTwin);
  const confidence = getDigitalTwinConfidence(digitalTwin);

  const hasModelData =
    Boolean(summary) ||
    Boolean(status) ||
    Boolean(confidence) ||
    signals.length > 0;

  return (
    <section className="digitalHealthModelResult">
      <style>{`
        .digitalHealthModelResult,
        .digitalHealthModelResult * {
          box-sizing: border-box;
        }

        .digitalHealthModelResult {
          padding: 20px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 18px;
          background: #ffffff;
        }

        .digitalHealthModelHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.07);
        }

        .digitalHealthModelEyebrow {
          margin: 0;
          color: #0f766e;
          font-size: 0.68rem;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .digitalHealthModelTitle {
          margin: 6px 0 0;
          color: #0f172a;
          font-size: 1.18rem;
          font-weight: 950;
          line-height: 1.3;
        }

        .digitalHealthModelDescription {
          max-width: 720px;
          margin: 7px 0 0;
          color: #64748b;
          font-size: 0.82rem;
          line-height: 1.6;
        }

        .digitalHealthModelBadges {
          display: flex;
          flex: 0 0 auto;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 7px;
        }

        .digitalHealthModelBadge {
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 900;
          white-space: nowrap;
        }

        .digitalHealthModelBadge.good {
          background: #ecfdf5;
          color: #047857;
        }

        .digitalHealthModelBadge.moderate {
          background: #fffbeb;
          color: #b45309;
        }

        .digitalHealthModelBadge.risk {
          background: #fef2f2;
          color: #b91c1c;
        }

        .digitalHealthModelBadge.neutral {
          background: #f1f5f9;
          color: #475569;
        }

        .digitalHealthModelSignal {
          margin-top: 16px;
          padding: 15px 16px;
          border: 1px solid rgba(15, 118, 110, 0.15);
          border-left: 4px solid #0f766e;
          border-radius: 14px;
          background: #f0fdfa;
        }

        .digitalHealthModelSignalLabel {
          margin: 0;
          color: #0f766e;
          font-size: 0.66rem;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .digitalHealthModelSignalText {
          margin: 7px 0 0;
          color: #334155;
          font-size: 0.88rem;
          line-height: 1.65;
        }

        .digitalHealthModelGrid {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }

        .digitalHealthModelItem {
          padding: 14px 15px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 14px;
          background: #f8fafc;
        }

        .digitalHealthModelItemHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .digitalHealthModelItemTitle {
          margin: 0;
          color: #0f172a;
          font-size: 0.9rem;
          font-weight: 900;
          line-height: 1.4;
        }

        .digitalHealthModelItemContext {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 0.72rem;
          line-height: 1.45;
        }

        .digitalHealthModelRisk {
          flex: 0 0 auto;
          padding: 5px 8px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #475569;
          font-size: 0.67rem;
          font-weight: 850;
        }

        .digitalHealthModelMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 10px;
        }

        .digitalHealthModelMeta span {
          padding: 5px 8px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #64748b;
          font-size: 0.67rem;
          font-weight: 750;
        }

        .digitalHealthModelExplanation {
          margin: 10px 0 0;
          color: #475569;
          font-size: 0.8rem;
          line-height: 1.6;
        }

        .digitalHealthModelRecommendation {
          margin-top: 10px;
          padding: 11px 12px;
          border: 1px solid rgba(37, 99, 235, 0.12);
          border-radius: 12px;
          background: #f8fbff;
        }

        .digitalHealthModelRecommendation strong {
          display: block;
          color: #1d4ed8;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .digitalHealthModelRecommendation p {
          margin: 5px 0 0;
          color: #475569;
          font-size: 0.78rem;
          line-height: 1.6;
        }

        .digitalHealthModelEmpty {
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
          .digitalHealthModelResult {
            padding: 16px;
          }

          .digitalHealthModelHeader,
          .digitalHealthModelItemHeader {
            flex-direction: column;
          }

          .digitalHealthModelBadges {
            justify-content: flex-start;
          }
        }
      `}</style>

      <header className="digitalHealthModelHeader">
        <div>
          <p className="digitalHealthModelEyebrow">
            Personal health model
          </p>

          <h3 className="digitalHealthModelTitle">
            Current modeled health state
          </h3>

          <p className="digitalHealthModelDescription">
            OrganHeal builds a structured health model from the signals that
            are currently available. The model becomes more complete as more
            reliable health data is added over time.
          </p>
        </div>

        {(status || confidence) && (
          <div className="digitalHealthModelBadges">
            {status && (
              <span
                className={`digitalHealthModelBadge ${getTone(
                  status
                )}`}
              >
                Status: {status}
              </span>
            )}

            {confidence && (
              <span
                className={`digitalHealthModelBadge ${getTone(
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
        <div className="digitalHealthModelSignal">
          <p className="digitalHealthModelSignalLabel">
            Current model summary
          </p>

          <p className="digitalHealthModelSignalText">
            {summary}
          </p>
        </div>
      )}

      {signals.length > 0 && (
        <div className="digitalHealthModelGrid">
          {signals.map((item, index) => {
            const title =
              item.title ||
              item.organ ||
              item.system ||
              item.category ||
              `Health model signal ${index + 1}`;

            const explanation =
              item.insight ||
              item.summary ||
              item.description ||
              item.signal;

            const context = [
              item.organ,
              item.system,
              item.category,
            ]
              .filter(Boolean)
              .join(" • ");

            return (
              <article
                className="digitalHealthModelItem"
                key={item.id ?? `${title}-${index}`}
              >
                <div className="digitalHealthModelItemHeader">
                  <div>
                    <h4 className="digitalHealthModelItemTitle">
                      {title}
                    </h4>

                    {context && (
                      <p className="digitalHealthModelItemContext">
                        {context}
                      </p>
                    )}
                  </div>

                  {item.riskLevel && (
                    <span className="digitalHealthModelRisk">
                      Risk: {item.riskLevel}
                    </span>
                  )}
                </div>

                {(item.status || item.confidence) && (
                  <div className="digitalHealthModelMeta">
                    {item.status && (
                      <span>Status: {item.status}</span>
                    )}

                    {item.confidence && (
                      <span>
                        Confidence: {item.confidence}
                      </span>
                    )}
                  </div>
                )}

                {explanation && (
                  <p className="digitalHealthModelExplanation">
                    {explanation}
                  </p>
                )}

                {item.recommendation && (
                  <div className="digitalHealthModelRecommendation">
                    <strong>Suggested focus</strong>
                    <p>{item.recommendation}</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!hasModelData && (
        <div className="digitalHealthModelEmpty">
          A fuller personal health model requires more connected and
          longitudinal data. OrganHeal will strengthen this model as your
          health history grows.
        </div>
      )}
    </section>
  );
}