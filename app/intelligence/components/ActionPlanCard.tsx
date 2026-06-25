type ActionPlanCardProps = {
  actionPlan: {
    thisWeek: string[];
    thisMonth: string[];
    next90Days: string[];
  };
};

export default function ActionPlanCard({ actionPlan }: ActionPlanCardProps) {
  return (
    <div className="resultBox">
      <p className="sectionLabel">Personal Action Plan</p>

      <h3>This Week</h3>
      <ul>
        {actionPlan.thisWeek.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>

      <h3>This Month</h3>
      <ul>
        {actionPlan.thisMonth.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>

      <h3>Next 90 Days</h3>
      <ul>
        {actionPlan.next90Days.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}