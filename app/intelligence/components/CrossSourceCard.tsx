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
  if (typeof value === "string") return value.trim();

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function getTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => getText(item))
    .filter((item) => item.length > 0);
}

function normalizeCrossSourceItems(
  crossSource: unknown
): CrossSourceItem[] {
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
  if (typeof crossSource === "string") {
    return crossSource.trim();
  }

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

function getConfidenceTone(value: string) {
  const normalized = value.toLowerCase();

  if (
    normalized.includes("high") ||
    normalized.includes("strong")
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
    normalized.includes("weak")
  ) {
    return "risk";
  }

  return "neutral";
}

export default function CrossSourceCard({
  crossSource,
}: CrossSourceCardProps) {
  const crossSourceItems =
    normalizeCrossSourceItems(crossSource);

  const summary =
    getCrossSourceSummary(crossSource);

  const confidence =
    getCrossSourceConfidence(crossSource);

  const hasCrossSourceIntelligence =
    Boolean(summary) ||
    Boolean(confidence) ||
    crossSourceItems.length > 0;

  return (
    <section className="crossSourceResult">
      <style>{`
        .crossSourceResult,
        .crossSourceResult * {
          box-sizing: border-box;
        }

        .crossSourceResult {
          padding: 20px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 18px;
          background: #ffffff;
        }

        .crossSourceHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.07);
        }

        .crossSourceEyebrow {
          margin: 0;
          color: #0f766e;
          font-size: 0.68rem;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .crossSourceTitle {
          margin: 6px 0 0;
          color: #0f172a;
          font-size: 1.18rem;
          font-weight: 950;
          line-height: 1.3;
        }

        .crossSourceDescription {
          max-width: 720px;
          margin: 7px 0 0;
          color: #64748b;
          font-size: 0.82rem;
          line-height: 1.6;
        }

        .crossSourceConfidence {
          flex: 0 0 auto;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 900;
          white-space: nowrap;
        }

        .crossSourceConfidence.good {
          background: #ecfdf5;
          color: #047857;
        }

        .crossSourceConfidence.moderate {
          background: #fffbeb;
          color: #b45309;
        }

        .crossSourceConfidence.risk {
          background: #fef2f2;
          color: #b91c1c;
        }

        .crossSourceConfidence.neutral {
          background: #f1f5f9;
          color: #475569;
        }

        .crossSourceSignal {
          margin-top: 16px;
          padding: 15px 16px;
          border: 1px solid rgba(15, 118, 110, 0.15);
          border-left: 4px solid #0f766e;
          border-radius: 14px;
          background: #f0fdfa;
        }

        .crossSourceSignalLabel {
          margin: 0;
          color: #0f766e;
          font-size: 0.66rem;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .crossSourceSignalText {
          margin: 7px 0 0;
          color: #334155;
          font-size: 0.88rem;
          line-height: 1.65;
        }

        .crossSourceGrid {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }

        .crossSourceItem {
          padding: 14px 15px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 14px;
          background: #f8fafc;
        }

        .crossSourceItemHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .crossSourceItemTitle {
          margin: 0;
          color: #0f172a;
          font-size: 0.9rem;
          font-weight: 900;
          line-height: 1.4;
        }

        .crossSourceRisk {
          flex: 0 0 auto;
          padding: 5px 8px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #475569;
          font-size: 0.67rem;
          font-weight: 850;
        }

        .crossSourceSources {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 10px;
        }

        .crossSourceSources span {
          padding: 5px 8px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #64748b;
          font-size: 0.67rem;
          font-weight: 750;
        }

        .crossSourceExplanation {
          margin: 10px 0 0;
          color: #475569;
          font-size: 0.8rem;
          line-height: 1.6;
        }

        .crossSourceItemConfidence {
          display: inline-flex;
          margin-top: 10px;
          padding: 5px 8px;
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 0.67rem;
          font-weight: 800;
        }

        .crossSourceRecommendation {
          margin-top: 10px;
          padding: 11px 12px;
          border: 1px solid rgba(37, 99, 235, 0.12);
          border-radius: 12px;
          background: #f8fbff;
        }

        .crossSourceRecommendation strong {
          display: block;
          color: #1d4ed8;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .crossSourceRecommendation p {
          margin: 5px 0 0;
          color: #475569;
          font-size: 0.78rem;
          line-height: 1.6;
        }

        .crossSourceEmpty {
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
          .crossSourceResult {
            padding: 16px;
          }

          .crossSourceHeader,
          .crossSourceItemHeader {
            flex-direction: column;
          }
        }
      `}</style>

      <header className="crossSourceHeader">
        <div>
          <p className="crossSourceEyebrow">
            Connected intelligence
          </p>

          <h3 className="crossSourceTitle">
            Cross-source health connections
          </h3>

          <p className="crossSourceDescription">
            OrganHeal connects signals only when meaningful relationships can
            be identified across the available reports, laboratory data, and
            health history.
          </p>
        </div>

        {confidence && (
          <span
            className={`crossSourceConfidence ${getConfidenceTone(
              confidence
            )}`}
          >
            Confidence: {confidence}
          </span>
        )}
      </header>

      {summary && (
        <div className="crossSourceSignal">
          <p className="crossSourceSignalLabel">
            Current connected signal
          </p>

          <p className="crossSourceSignalText">
            {summary}
          </p>
        </div>
      )}

      {crossSourceItems.length > 0 && (
        <div className="crossSourceGrid">
          {crossSourceItems.map((item, index) => {
            const title =
              item.title ||
              item.pattern ||
              item.connection ||
              item.finding ||
              `Connected signal ${index + 1}`;

            const explanation =
              item.insight ||
              item.interpretation ||
              item.summary;

            const sources =
              item.sources && item.sources.length > 0
                ? item.sources
                : [
                    item.primarySource,
                    item.secondarySource,
                    item.source,
                  ].filter(
                    (value): value is string =>
                      Boolean(value)
                  );

            return (
              <article
                className="crossSourceItem"
                key={item.id ?? `${title}-${index}`}
              >
                <div className="crossSourceItemHeader">
                  <h4 className="crossSourceItemTitle">
                    {title}
                  </h4>

                  {item.risk && (
                    <span className="crossSourceRisk">
                      Risk: {item.risk}
                    </span>
                  )}
                </div>

                {sources.length > 0 && (
                  <div className="crossSourceSources">
                    {sources.map((source, sourceIndex) => (
                      <span key={`${source}-${sourceIndex}`}>
                        {source}
                      </span>
                    ))}
                  </div>
                )}

                {explanation && (
                  <p className="crossSourceExplanation">
                    {explanation}
                  </p>
                )}

                {item.confidence && (
                  <span className="crossSourceItemConfidence">
                    Confidence: {item.confidence}
                  </span>
                )}

                {item.recommendation && (
                  <div className="crossSourceRecommendation">
                    <strong>Suggested focus</strong>
                    <p>{item.recommendation}</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!hasCrossSourceIntelligence && (
        <div className="crossSourceEmpty">
          More connected health data is needed before OrganHeal can identify
          a reliable cross-source relationship.
        </div>
      )}
    </section>
  );
}