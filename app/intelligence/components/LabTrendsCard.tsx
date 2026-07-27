type LabTrendsCardProps = {
  labTrends: unknown;
};

type LabTrendItem = {
  marker?: string;
  name?: string;
  title?: string;
  earliestValue?: string | number;
  latestValue?: string | number;
  changeAmount?: string | number;
  trendDirection?: string;
  trendSummary?: string;
  summary?: string;
  status?: string;
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

function normalizeLabTrendItems(labTrends: unknown): LabTrendItem[] {
  const source = Array.isArray(labTrends)
    ? labTrends
    : isRecord(labTrends)
      ? labTrends.trends ||
        labTrends.items ||
        labTrends.markers ||
        labTrends.labTrends ||
        labTrends.results ||
        []
      : [];

  if (!Array.isArray(source)) {
    return [];
  }

  return source.filter(isRecord).map((item) => ({
    marker:
      getText(item.marker) ||
      getText(item.markerName),
    name: getText(item.name),
    title: getText(item.title),
    earliestValue: getText(item.earliestValue),
    latestValue: getText(item.latestValue),
    changeAmount: getText(item.changeAmount),
    trendDirection:
      getText(item.trendDirection) ||
      getText(item.direction),
    trendSummary:
      getText(item.trendSummary) ||
      getText(item.summary),
    summary: getText(item.summary),
    status: getText(item.status),
  }));
}

function getHistoricalDepth(labTrends: unknown): string {
  if (!isRecord(labTrends)) return "";

  return (
    getText(labTrends.dataDepth) ||
    getText(labTrends.historyAvailable) ||
    getText(labTrends.timeRange)
  );
}

function getTrendTone(direction: string) {
  const normalized = direction.toLowerCase();

  if (
    normalized.includes("improv") ||
    normalized.includes("better")
  ) {
    return "good";
  }

  if (
    normalized.includes("wors") ||
    normalized.includes("declin")
  ) {
    return "risk";
  }

  return "neutral";
}

export default function LabTrendsCard({
  labTrends,
}: LabTrendsCardProps) {
  const trendItems = normalizeLabTrendItems(labTrends);
  const historicalDepth = getHistoricalDepth(labTrends);

  const realTrends = trendItems.filter((item) => {
    const hasValues =
      Boolean(getText(item.earliestValue)) &&
      Boolean(getText(item.latestValue));

    const hasTrend =
      Boolean(item.trendDirection) ||
      Boolean(item.trendSummary);

    return hasValues || hasTrend;
  });

  const trackedMarkers = trendItems
    .map(
      (item) =>
        item.marker ||
        item.name ||
        item.title
    )
    .filter(Boolean);

  return (
    <section className="labHistoryResult">
      <style>{`
        .labHistoryResult,
        .labHistoryResult * {
          box-sizing: border-box;
        }

        .labHistoryResult {
          padding: 20px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 18px;
          background: #ffffff;
        }

        .labHistoryHeader {
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.07);
        }

        .labHistoryEyebrow {
          margin: 0;
          color: #0f766e;
          font-size: 0.68rem;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .labHistoryTitle {
          margin: 6px 0 0;
          color: #0f172a;
          font-size: 1.18rem;
          font-weight: 950;
          line-height: 1.3;
        }

        .labHistoryDescription {
          max-width: 720px;
          margin: 7px 0 0;
          color: #64748b;
          font-size: 0.82rem;
          line-height: 1.6;
        }

        .labHistoryDepth {
          display: inline-flex;
          width: fit-content;
          margin-top: 12px;
          padding: 6px 9px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          font-size: 0.68rem;
          font-weight: 850;
        }

        .labTrendGrid {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }

        .labTrendCard {
          padding: 14px 15px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 14px;
          background: #f8fafc;
        }

        .labTrendCardHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .labTrendName {
          margin: 0;
          color: #0f172a;
          font-size: 0.9rem;
          font-weight: 900;
        }

        .labTrendDirection {
          flex: 0 0 auto;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 0.67rem;
          font-weight: 900;
        }

        .labTrendDirection.good {
          background: #ecfdf5;
          color: #047857;
        }

        .labTrendDirection.risk {
          background: #fef2f2;
          color: #b91c1c;
        }

        .labTrendDirection.neutral {
          background: #f1f5f9;
          color: #475569;
        }

        .labTrendValues {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 14px;
          margin-top: 10px;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 750;
        }

        .labTrendSummary {
          margin: 9px 0 0;
          color: #64748b;
          font-size: 0.8rem;
          line-height: 1.6;
        }

        .labHistoryTracked {
          margin-top: 16px;
          padding: 14px 15px;
          border: 1px solid rgba(37, 99, 235, 0.12);
          border-radius: 14px;
          background: #f8fbff;
        }

        .labHistoryTrackedLabel {
          margin: 0;
          color: #1d4ed8;
          font-size: 0.66rem;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .labHistoryTrackedText {
          margin: 7px 0 0;
          color: #475569;
          font-size: 0.8rem;
          line-height: 1.6;
        }

        .labHistoryEmpty {
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
          .labHistoryResult {
            padding: 16px;
          }

          .labTrendCardHeader {
            flex-direction: column;
          }
        }
      `}</style>

      <header className="labHistoryHeader">
        <p className="labHistoryEyebrow">
          Laboratory history
        </p>

        <h3 className="labHistoryTitle">
          Historical marker movement
        </h3>

        <p className="labHistoryDescription">
          Trends are shown only when OrganHeal has enough saved values to
          compare the same laboratory marker over time.
        </p>

        {historicalDepth && (
          <span className="labHistoryDepth">
            History: {historicalDepth}
          </span>
        )}
      </header>

      {realTrends.length > 0 && (
        <div className="labTrendGrid">
          {realTrends.map((item, index) => {
            const name =
              item.marker ||
              item.name ||
              item.title ||
              `Laboratory marker ${index + 1}`;

            const direction =
              item.trendDirection || "Stable";

            return (
              <article
                className="labTrendCard"
                key={`${name}-${index}`}
              >
                <div className="labTrendCardHeader">
                  <h4 className="labTrendName">
                    {name}
                  </h4>

                  <span
                    className={`labTrendDirection ${getTrendTone(
                      direction
                    )}`}
                  >
                    {direction}
                  </span>
                </div>

                {(item.earliestValue ||
                  item.latestValue ||
                  item.changeAmount) && (
                  <div className="labTrendValues">
                    {item.earliestValue && (
                      <span>
                        Earlier: {item.earliestValue}
                      </span>
                    )}

                    {item.latestValue && (
                      <span>
                        Latest: {item.latestValue}
                      </span>
                    )}

                    {item.changeAmount && (
                      <span>
                        Change: {item.changeAmount}
                      </span>
                    )}
                  </div>
                )}

                {(item.trendSummary ||
                  item.summary) && (
                  <p className="labTrendSummary">
                    {item.trendSummary ||
                      item.summary}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {realTrends.length === 0 &&
        trackedMarkers.length > 0 && (
          <div className="labHistoryTracked">
            <p className="labHistoryTrackedLabel">
              Markers currently tracked
            </p>

            <p className="labHistoryTrackedText">
              {trackedMarkers.length} laboratory marker
              {trackedMarkers.length === 1 ? "" : "s"} are available, but
              repeated historical values are still needed before a reliable
              trend can be calculated.
            </p>
          </div>
        )}

      {realTrends.length === 0 &&
        trackedMarkers.length === 0 && (
          <div className="labHistoryEmpty">
            No comparable laboratory history is available yet. Add future
            reports with repeated markers to build meaningful trends over
            time.
          </div>
        )}
    </section>
  );
}