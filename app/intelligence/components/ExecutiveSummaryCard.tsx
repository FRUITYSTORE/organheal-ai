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
  if (score >= 75) return "good";
  if (score >= 50) return "moderate";
  return "risk";
}

export default function ExecutiveSummaryCard({
  summary,
}: ExecutiveSummaryCardProps) {
  const scoreTone = getScoreTone(summary.currentScore);
  const forecastTone = getScoreTone(summary.forecastScore);
  const confidenceTone = getScoreTone(summary.confidenceScore);

  return (
    <section className="ohCard">
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">Executive Health Intelligence Summary</p>

          <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
            Current health intelligence score
          </h2>
        </div>

        <span className={`ohStatusBadge ${scoreTone}`}>
          {summary.currentScore}/100
        </span>
      </div>

      <div className="ohMetricGrid">
        <article className="ohMetricCard">
          <span className="ohMetricLabel">Current Score</span>
          <span className="ohMetricValue">{summary.currentScore}</span>
          <span className="ohMetricHint">Out of 100</span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">Health Trend</span>
          <span className="ohMetricHint">{summary.trend}</span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">90-Day Forecast</span>
          <span className={`ohStatusBadge ${forecastTone}`}>
            {summary.forecastScore}/100
          </span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">Confidence</span>
          <span className={`ohStatusBadge ${confidenceTone}`}>
            {summary.confidenceLevel}
          </span>
          <span className="ohMetricHint">
            {summary.confidenceScore}/100 confidence score
          </span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">Priority System</span>
          <span className="ohMetricHint">{summary.prioritySystem}</span>
        </article>
      </div>

      <div className="ohDivider" />

      <div className="ohTrustNotice">
        <span aria-hidden="true">🎯</span>
        <div>
          <strong>Best Next Action</strong>
          <br />
          {summary.nextBestAction}
        </div>
      </div>
    </section>
  );
}
