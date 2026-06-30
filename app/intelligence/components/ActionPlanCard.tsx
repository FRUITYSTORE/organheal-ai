type ActionPlanCardProps = {
  actionPlan: {
    thisWeek: string[];
    thisMonth: string[];
    next90Days: string[];
  };
};

function PlanSection({
  title,
  badge,
  items,
}: {
  title: string;
  badge: string;
  items: string[];
}) {
  return (
    <article className="ohMetricCard">
      <div className="ohCardHeader" style={{ marginBottom: "14px" }}>
        <div>
          <span className="ohMetricLabel">{badge}</span>
          <h3 className="ohCardTitle" style={{ fontSize: "1.12rem", marginTop: "6px" }}>
            {title}
          </h3>
        </div>
      </div>

      <div className="ohTimeline">
        {items.map((item, index) => (
          <div className="ohTimelineItem" key={`${title}-${index}`}>
            <span className="ohTimelineDot" />
            <p className="ohTimelineMeta">{item}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function ActionPlanCard({ actionPlan }: ActionPlanCardProps) {
  return (
    <section className="ohCard">
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">Personal Action Plan</p>

          <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
            Your next practical health steps
          </h2>
        </div>

        <span className="ohStatusBadge good">Actionable</span>
      </div>

      <p className="ohCardText">
        This plan organizes your next steps into short-term, monthly, and 90-day
        actions based on the available health intelligence.
      </p>

      <div className="ohMetricGrid" style={{ marginTop: "18px" }}>
        <PlanSection
          title="This Week"
          badge="Immediate focus"
          items={actionPlan.thisWeek}
        />

        <PlanSection
          title="This Month"
          badge="Build consistency"
          items={actionPlan.thisMonth}
        />

        <PlanSection
          title="Next 90 Days"
          badge="Longer direction"
          items={actionPlan.next90Days}
        />
      </div>
    </section>
  );
}
