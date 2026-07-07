import Link from "next/link";

type DashboardOverviewCard = {
  label: string;
  value: string;
  detail: string;
  href: string;
};

type DashboardOverviewGridProps = {
  cards: DashboardOverviewCard[];
};

export default function DashboardOverviewGrid({
  cards,
}: DashboardOverviewGridProps) {
  return (
    <section className="dashboardCommandGrid">
      {cards.map((card) => (
        <Link href={card.href} key={card.label} className="dashboardCommandCard">
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <p>{card.detail}</p>
        </Link>
      ))}
    </section>
  );
}