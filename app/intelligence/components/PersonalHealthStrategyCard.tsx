type PersonalHealthStrategy = {
  healthRisks: string;
  actionPlan90Days: string;
  nutritionStrategy: string;
  followUpPlan: string;
};

type PersonalHealthStrategyCardProps = {
  strategy: PersonalHealthStrategy;
};

function StrategySection({
  title,
  badge,
  icon,
  body,
}: {
  title: string;
  badge: string;
  icon: string;
  body: string;
}) {
  return (
    <article className="ohMetricCard">
      <div className="ohCardHeader" style={{ marginBottom: "12px" }}>
        <div>
          <span className="ohMetricLabel">{badge}</span>
          <h3 className="ohCardTitle" style={{ fontSize: "1.12rem", marginTop: "6px" }}>
            {icon} {title}
          </h3>
        </div>
      </div>

      <p
        className="ohMetricHint"
        style={{
          whiteSpace: "pre-line",
          lineHeight: 1.75,
          margin: 0,
        }}
      >
        {body}
      </p>
    </article>
  );
}

export default function PersonalHealthStrategyCard({
  strategy,
}: PersonalHealthStrategyCardProps) {
  return (
    <section className="ohCard">
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">Personal Health Strategy</p>

          <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
            A structured strategy for your next phase
          </h2>
        </div>

        <span className="ohStatusBadge good">Strategy</span>
      </div>

      <p className="ohCardText">
        This section organizes the main health risks, the 90-day direction,
        nutrition focus, and follow-up needs into one practical strategy.
      </p>

      <div className="ohMetricGrid" style={{ marginTop: "18px" }}>
        <StrategySection
          title="Health Risks"
          badge="Risk focus"
          icon="⚠️"
          body={strategy.healthRisks}
        />

        <StrategySection
          title="90-Day Action Plan"
          badge="Action direction"
          icon="📆"
          body={strategy.actionPlan90Days}
        />

        <StrategySection
          title="Nutrition Strategy"
          badge="Lifestyle support"
          icon="🥗"
          body={strategy.nutritionStrategy}
        />

        <StrategySection
          title="Follow-Up Plan"
          badge="Monitoring"
          icon="🩺"
          body={strategy.followUpPlan}
        />
      </div>
    </section>
  );
}


