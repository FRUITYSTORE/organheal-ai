type ExecutiveSummaryCardProps = {
  summary: {
    currentScore: number;
    trend: string;
    forecastScore: number;
    confidenceLevel: string;
    confidenceScore: number;
    prioritySystem: string;
    nextBestAction: string;
  };
};

function getScoreTone(score: number) {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";

  return "risk";
}

function getHealthState(score: number) {
  if (score >= 80) {
    return {
      label: "Strong overall position",
      description:
        "Your current health signals appear generally strong. Continue monitoring the priority highlighted in this analysis.",
    };
  }

  if (score >= 60) {
    return {
      label: "Stable with areas to improve",
      description:
        "Your overall picture appears reasonably stable, with specific signals that deserve focused follow-up.",
    };
  }

  return {
    label: "Needs focused attention",
    description:
      "This analysis identified health signals that should be reviewed carefully and followed with the recommended next step.",
  };
}

export default function ExecutiveSummaryCard({
  summary,
}: ExecutiveSummaryCardProps) {
  const scoreTone = getScoreTone(summary.currentScore);
  const forecastTone = getScoreTone(summary.forecastScore);
  const confidenceTone = getScoreTone(summary.confidenceScore);
  const healthState = getHealthState(summary.currentScore);

  return (
    <section
      className="ohCard"
      aria-labelledby="current-health-summary-title"
      style={{
        overflow: "hidden",
        padding: 0,
      }}
    >
      <div
        style={{
          padding: "28px",
          background:
            "linear-gradient(135deg, rgba(10, 77, 104, 0.08), rgba(36, 160, 148, 0.04))",
          borderBottom: "1px solid rgba(15, 78, 95, 0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 520px" }}>
            <p className="ohMetricLabel">Personal health intelligence</p>

            <h2
              id="current-health-summary-title"
              className="ohCardTitle"
              style={{
                marginTop: "8px",
                marginBottom: "12px",
                fontSize: "clamp(1.55rem, 3vw, 2.2rem)",
              }}
            >
              Your Health Today
            </h2>

            <strong
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "1.08rem",
                lineHeight: 1.5,
              }}
            >
              {healthState.label}
            </strong>

            <p
              style={{
                maxWidth: "760px",
                margin: 0,
                lineHeight: 1.75,
                color: "var(--oh-text-muted, #52656d)",
              }}
            >
              {healthState.description}
            </p>
          </div>

          <div
            style={{
              minWidth: "132px",
              padding: "18px 20px",
              borderRadius: "18px",
              background: "rgba(255, 255, 255, 0.86)",
              border: "1px solid rgba(15, 78, 95, 0.12)",
              textAlign: "center",
            }}
          >
            <span
              className="ohMetricLabel"
              style={{ display: "block", marginBottom: "6px" }}
            >
              Current score
            </span>

            <span
              className={`ohStatusBadge ${scoreTone}`}
              style={{
                display: "inline-flex",
                justifyContent: "center",
                minWidth: "82px",
                fontSize: "1rem",
              }}
            >
              {summary.currentScore}/100
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: "28px" }}>
        <div
          className="ohMetricGrid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          <article className="ohMetricCard">
            <span className="ohMetricLabel">Highest priority</span>

            <strong
              style={{
                display: "block",
                marginTop: "10px",
                lineHeight: 1.5,
              }}
            >
              {summary.prioritySystem}
            </strong>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">Health trend</span>

            <strong
              style={{
                display: "block",
                marginTop: "10px",
                lineHeight: 1.5,
              }}
            >
              {summary.trend}
            </strong>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">90-day outlook</span>

            <span
              className={`ohStatusBadge ${forecastTone}`}
              style={{
                display: "inline-flex",
                marginTop: "10px",
              }}
            >
              {summary.forecastScore}/100
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">Analysis confidence</span>

            <span
              className={`ohStatusBadge ${confidenceTone}`}
              style={{
                display: "inline-flex",
                marginTop: "10px",
              }}
            >
              {summary.confidenceLevel}
            </span>

            <span
              className="ohMetricHint"
              style={{ display: "block", marginTop: "8px" }}
            >
              {summary.confidenceScore}/100 confidence
            </span>
          </article>
        </div>

        <div className="ohDivider" />

        <div
          className="ohTrustNotice"
          style={{
            alignItems: "flex-start",
            padding: "20px",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: "1.25rem" }}>
            🎯
          </span>

          <div>
            <strong>What should you do next?</strong>

            <p
              style={{
                margin: "7px 0 0",
                lineHeight: 1.7,
              }}
            >
              {summary.nextBestAction}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
