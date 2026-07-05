type HeroSummaryCardProps = {
  label: string;
  value: string | number;
  description: string;
};

export default function HeroSummaryCard({
  label,
  value,
  description,
}: HeroSummaryCardProps) {
  return (
    <aside className="articleHeroSummary">
      <p className="articleHeroSummaryLabel">
        {label}
      </p>

      <span className="articleHeroSummaryValue">
        {value}
      </span>

      <p className="articleHeroSummaryText">
        {description}
      </p>
    </aside>
  );
}