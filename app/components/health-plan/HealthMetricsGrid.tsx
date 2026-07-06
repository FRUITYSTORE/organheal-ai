type HealthMetricItem = {
  tone: "blue" | "teal" | "green" | "amber";
  label: string;
  value: string | number;
  hint: string;
};

type HealthMetricsGridProps = {
  items: HealthMetricItem[];
};

export default function HealthMetricsGrid({ items }: HealthMetricsGridProps) {
  return (
    <section className="hpToolGrid">
      {items.map((item) => (
        <article className={`hpToolCard ${item.tone}`} key={item.label}>
          <div className="hpToolLabel">{item.label}</div>
          <div className="hpToolValue">{item.value}</div>
          <div className="hpToolHint">{item.hint}</div>
        </article>
      ))}
    </section>
  );
}