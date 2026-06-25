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

export default function ExecutiveSummaryCard({
  summary,
}: ExecutiveSummaryCardProps) {
  return (
    <div className="resultBox">
      <p className="sectionLabel">Executive Health Intelligence Summary</p>

      <h2>{summary.currentScore}/100</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginTop: "18px",
          textAlign: "left",
        }}
      >
        <div>
          <strong>Health Trend</strong>
          <p>{summary.trend}</p>
        </div>

        <div>
          <strong>90-Day Forecast</strong>
          <p>{summary.forecastScore}/100</p>
        </div>

        <div>
          <strong>Confidence</strong>
          <p>
            {summary.confidenceLevel} ({summary.confidenceScore}/100)
          </p>
        </div>

        <div>
          <strong>Priority System</strong>
          <p>{summary.prioritySystem}</p>
        </div>
      </div>

      <h3>Best Next Action</h3>
      <p>{summary.nextBestAction}</p>
    </div>
  );
}