type Opportunity = {
  organ: string;
  title: string;
  currentScore: number;
  potentialScore: number;
  potentialGain: number;
  priority: string;
  action: string;
};

type TopOpportunitiesCardProps = {
  strongestOrgan: string | null;
  riskPattern: string;
  potentialGain: number;
  opportunities: Opportunity[];
};

export default function TopOpportunitiesCard({
  strongestOrgan,
  riskPattern,
  potentialGain,
  opportunities,
}: TopOpportunitiesCardProps) {
  return (
    <div className="resultBox">
      <p className="sectionLabel">🏆 HEALTH INTELLIGENCE SNAPSHOT</p>
      <h2>Top Opportunities</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginTop: "18px",
        }}
      >
        <div>
          <strong>Strongest Area</strong>
          <p>{strongestOrgan || "N/A"}</p>
        </div>

        <div>
          <strong>Risk Pattern</strong>
          <p>{riskPattern}</p>
        </div>

        <div>
          <strong>Potential Gain</strong>
          <p>+{potentialGain}</p>
        </div>
      </div>

      {opportunities.length === 0 ? (
        <p style={{ marginTop: "18px" }}>
          Complete more assessments to generate opportunities.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "14px",
            marginTop: "18px",
          }}
        >
          {opportunities.map((item) => (
            <div
              key={item.organ}
              style={{
                padding: "16px",
                borderRadius: "16px",
                background: "rgba(15,23,42,0.75)",
                border: "1px solid rgba(34,211,238,0.18)",
                textAlign: "left",
              }}
            >
              <h3>{item.title}</h3>

              <p>
                Current: {item.currentScore}/100 → Potential:{" "}
                {item.potentialScore}/100
              </p>

              <p>
                Potential Gain: <strong>+{item.potentialGain}</strong>
              </p>

              <p>
                Priority: <strong>{item.priority}</strong>
              </p>

              <p>{item.action}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}