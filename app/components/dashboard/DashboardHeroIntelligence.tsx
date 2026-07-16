import Link from "next/link";

import type {
  DashboardIntelligenceViewModel,
} from "@/lib/application/dashboard/dashboard-intelligence.view-model";

type DashboardHeroIntelligenceProps = {
  intelligence:
    DashboardIntelligenceViewModel;

  isArabic: boolean;
};

export default function DashboardHeroIntelligence({
  intelligence,
  isArabic,
}: DashboardHeroIntelligenceProps) {
  const {
    hero,
    evidence,
    decision,
    impact,
  } = intelligence;

  return (
    <section
      className={`dashboardIntelligenceHero tone-${hero.tone}`}
    >
      <div className="dashboardIntelligenceHeroContent">
        <span className="dashboardIntelligenceHeroKicker">
          {isArabic
            ? "ملخص الذكاء الصحي"
            : "Health Intelligence Summary"}
        </span>

        <h2>{hero.headline}</h2>

        <p className="dashboardIntelligenceHeroNarrative">
          {hero.narrative}
        </p>

        <div className="dashboardIntelligenceHeroSignals">
          <article>
            <span>
              {isArabic
                ? "قوة الأدلة"
                : "Evidence strength"}
            </span>

            <strong>
              {evidence.score}/100
            </strong>

            <small>
              {evidence.strength}
            </small>
          </article>

          <article>
            <span>
              {isArabic
                ? "حالة الأدلة"
                : "Evidence state"}
            </span>

            <strong>
              {evidence.overallState}
            </strong>
          </article>

          <article>
            <span>
              {isArabic
                ? "الأثر المتوقع"
                : "Expected impact"}
            </span>

            <strong>
              {impact.primaryImpact ??
                (isArabic
                  ? "قيد التحديد"
                  : "Not determined")}
            </strong>

            <small>
              {isArabic
                ? `${impact.highImpactCount} آثار عالية`
                : `${impact.highImpactCount} high-impact outcomes`}
            </small>
          </article>
        </div>
      </div>

      <aside className="dashboardIntelligenceDecision">
        <span className="dashboardIntelligenceDecisionUrgency">
          {decision.urgencyLabel}
        </span>

        <p className="dashboardIntelligenceDecisionLabel">
          {isArabic
            ? "أفضل خطوة تالية"
            : "Best next decision"}
        </p>

        <h3>{decision.title}</h3>

        <p>
          {decision.description}
        </p>

        <Link
          href={decision.href}
          className="dashboardIntelligenceDecisionAction"
        >
          {decision.actionLabel}
        </Link>
      </aside>
    </section>
  );
}