type DoctorReadySummaryCardProps = {
  overallScore: number;
  priorityOrgan: string | null;
  riskPattern: string;
  opportunityTitle: string;
  bestNextAction: string;
};

export default function DoctorReadySummaryCard({
  overallScore,
  priorityOrgan,
  riskPattern,
  opportunityTitle,
  bestNextAction,
}: DoctorReadySummaryCardProps) {
  return (
    <div className="resultBox">
      <p className="sectionLabel">🩺 DOCTOR READY SUMMARY</p>
      <h2>Doctor Brief</h2>

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
          <strong>Overall Score</strong>
          <p>{overallScore}/100</p>
        </div>

        <div>
          <strong>Priority Area</strong>
          <p>{priorityOrgan || "N/A"}</p>
        </div>

        <div>
          <strong>Risk Pattern</strong>
          <p>{riskPattern}</p>
        </div>

        <div>
          <strong>Main Opportunity</strong>
          <p>{opportunityTitle}</p>
        </div>
      </div>

      <p style={{ marginTop: "18px", textAlign: "left" }}>
        {bestNextAction}
      </p>
    </div>
  );
}