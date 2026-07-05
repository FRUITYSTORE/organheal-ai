type PageHeroMetric = {
  label: string;
  value: string;
  description?: string;
};

type PageHeroMetricsProps = {
  metrics: PageHeroMetric[];
};

export default function PageHeroMetrics({ metrics }: PageHeroMetricsProps) {
  if (metrics.length === 0) return null;

  return (
    <div className="ohGrid cols3" style={{ marginTop: "24px" }}>
      {metrics.map((metric) => (
        <article className="ohCard" key={`${metric.label}-${metric.value}`}>
          <p className="ohMetricLabel">{metric.label}</p>
          <h2 className="ohCardTitle">{metric.value}</h2>
          {metric.description ? (
            <p className="ohCardText">{metric.description}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}