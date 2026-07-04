type LearningProgressProps = {
  label: string;
  title: string;
  description: string;
  progressLabel: string;
  progressValue: number;
};

export default function LearningProgress({
  label,
  title,
  description,
  progressLabel,
  progressValue,
}: LearningProgressProps) {
  const safeProgress = Math.max(0, Math.min(100, progressValue));

  return (
    <section className="ohCard">
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">{label}</p>
          <h2 className="ohCardTitle">{title}</h2>
          <p className="ohCardText">{description}</p>
        </div>

        <span className="ohStatusBadge good">{progressLabel}</span>
      </div>

      <div
        style={{
          height: "12px",
          borderRadius: "999px",
          background: "rgba(15, 118, 110, 0.12)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${safeProgress}%`,
            height: "100%",
            background: "#0f766e",
            borderRadius: "999px",
          }}
        />
      </div>
    </section>
  );
}