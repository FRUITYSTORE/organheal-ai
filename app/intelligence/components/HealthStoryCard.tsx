type HealthStoryCardProps = {
  story: string;
};

export default function HealthStoryCard({ story }: HealthStoryCardProps) {
  return (
    <section className="ohCard">
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">Personal Health Narrative</p>

          <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
            Your Health Story
          </h2>
        </div>

        <span className="ohStatusBadge neutral">Summary</span>
      </div>

      <div className="ohTrustNotice">
        <span aria-hidden="true">📖</span>
        <div>
          <strong>OrganHeal interpretation</strong>
          <br />
          This story organizes your available health signals into a clearer educational narrative.
        </div>
      </div>

      <div className="ohDivider" />

      <p
        className="ohCardText"
        style={{
          whiteSpace: "pre-line",
          lineHeight: 1.85,
          margin: 0,
        }}
      >
        {story}
      </p>
    </section>
  );
}


