type PersonalHealthStrategy = {
  healthRisks: string;
  actionPlan90Days: string;
  nutritionStrategy: string;
  followUpPlan: string;
};

type PersonalHealthStrategyCardProps = {
  strategy: PersonalHealthStrategy;
};

export default function PersonalHealthStrategyCard({
  strategy,
}: PersonalHealthStrategyCardProps) {
  return (
    <div className="resultBox">
      <p className="sectionLabel">Personal Health Strategy</p>

      <h3>Health Risks</h3>
      <p style={{ whiteSpace: "pre-line" }}>
        {strategy.healthRisks}
      </p>

      <h3>90-Day Action Plan</h3>
      <p style={{ whiteSpace: "pre-line" }}>
        {strategy.actionPlan90Days}
      </p>

      <h3>Nutrition Strategy</h3>
      <p style={{ whiteSpace: "pre-line" }}>
        {strategy.nutritionStrategy}
      </p>

      <h3>Follow-Up Plan</h3>
      <p style={{ whiteSpace: "pre-line" }}>
        {strategy.followUpPlan}
      </p>
    </div>
  );
}