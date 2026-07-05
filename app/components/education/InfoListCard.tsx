type InfoListCardProps = {
  label: string;
  title: string;
  items: string[];
};

export default function InfoListCard({
  label,
  title,
  items,
}: InfoListCardProps) {
  return (
    <article className="ohCard">
      <p className="ohMetricLabel">{label}</p>
      <h2 className="ohCardTitle">{title}</h2>

      <div className="ohStack" style={{ marginTop: "16px" }}>
        {items.map((item) => (
          <p className="ohCardText" key={item}>
            • {item}
          </p>
        ))}
      </div>
    </article>
  );
}