type HealthPassportCardProps = {
  healthProfile: string;
  overallScore: number;
  healthAgeStatus: string;
  priorityOrgan: string | null;
  potentialScore: number;
};

export default function HealthPassportCard({
  healthProfile,
  overallScore,
  healthAgeStatus,
  priorityOrgan,
  potentialScore,
}: HealthPassportCardProps) {
  return (
    <div className="resultBox">
      <p className="sectionLabel">🪪 HEALTH PASSPORT</p>
      <h2>{healthProfile}</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginTop: "18px",
        }}
      >
        <div>
          <strong>Overall Score</strong>
          <p>{overallScore}/100</p>
        </div>

        <div>
          <strong>Health Age</strong>
          <p>{healthAgeStatus}</p>
        </div>

        <div>
          <strong>Priority Area</strong>
          <p>{priorityOrgan || "N/A"}</p>
        </div>

        <div>
          <strong>Potential Score</strong>
          <p>{potentialScore}/100</p>
        </div>
      </div>
    </div>
  );
}