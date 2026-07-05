type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
};

export default function StatCard({
  label,
  value,
  hint,
}: StatCardProps) {
  return (
    <article className="ohMetricCard">
      <span className="ohMetricLabel">{label}</span>
      <span className="ohMetricValue">{value}</span>
      {hint ? <span className="ohMetricHint">{hint}</span> : null}
    </article>
  );
}