import Link from "next/link";
import PriorityCard from "./PriorityCard";

type HealthPlanHeroProps = {
  eyebrow: string;
  title: string;
  lead: string;
  primaryHref: string;
  primaryLabel: string;
  analysisHref: string;
  analysisLabel: string;
  reportsLabel: string;
  priority: {
    label: string;
    organ: string;
    riskLabel: string;
    riskLevel: string;
    scoreLabel: string;
    scoreText: string;
    progressPercent: number;
  };
};

export default function HealthPlanHero({
  eyebrow,
  title,
  lead,
  primaryHref,
  primaryLabel,
  analysisHref,
  analysisLabel,
  reportsLabel,
  priority,
}: HealthPlanHeroProps) {
  return (
    <section className="hpHero">
      <div>
        <span className="hpEyebrow">{eyebrow}</span>

        <h1 className="hpTitle">{title}</h1>

        <p className="hpLead">{lead}</p>

        <div className="hpActions">
          <Link href={primaryHref} className="hpPrimary">
            {primaryLabel}
          </Link>

          <Link href={analysisHref} className="hpSecondary">
            {analysisLabel}
          </Link>

          <Link href="/reports" className="hpSecondary">
            {reportsLabel}
          </Link>
        </div>
      </div>

      <PriorityCard
        label={priority.label}
        organ={priority.organ}
        riskLabel={priority.riskLabel}
        riskLevel={priority.riskLevel}
        scoreLabel={priority.scoreLabel}
        scoreText={priority.scoreText}
        progressPercent={priority.progressPercent}
      />
    </section>
  );
}