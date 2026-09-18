import Link from "next/link";

type DashboardNextAction = {
  tag: string;
  label: string;
  description: string;
  href: string;
  buttonText: string;
};

type DashboardNextActionSectionProps = {
  isArabic: boolean;

  nextStep:
    DashboardNextAction;

  progressPercent: number;
  completedSteps: number;
  currentPriority: string;

  // The hero intelligence card already renders its own primary
  // "best next decision" CTA when it's shown, so this section's own
  // primary button is redundant in that case — pass false to hide it
  // and keep only the secondary "Review Reports" link plus the stats.
  showPrimaryAction?: boolean;
};

export default function DashboardNextActionSection({
  isArabic,
  nextStep,
  progressPercent,
  completedSteps,
  currentPriority,
  showPrimaryAction = true,
}: DashboardNextActionSectionProps) {
   return (
    <section className="dashboardNextActionCompact">
      <div className="dashboardNextActionCompactMain">
        <div>
          <span className="dashboardNextActionCompactEyebrow">
            {nextStep.tag}
          </span>

          <h2>
            {nextStep.label}
          </h2>

          <p>
            {nextStep.description}
          </p>
        </div>

        <div className="dashboardNextActionCompactButtons">
          {showPrimaryAction && (
            <Link
              href={nextStep.href}
              className="dashboardPrimaryAction"
            >
              {nextStep.buttonText}
            </Link>
          )}

          <Link
            href="/reports"
            className="dashboardSecondaryAction"
          >
            {isArabic
              ? "مراجعة التقارير"
              : "Review Reports"}
          </Link>
        </div>
      </div>

      <div className="dashboardNextActionCompactMeta">
        <article>
          <span>
            {isArabic
              ? "جاهزية الرحلة"
              : "Journey readiness"}
          </span>

          <strong>
            {progressPercent}%
          </strong>

          <small>
            {isArabic
              ? `${completedSteps} من 4 مكتملة`
              : `${completedSteps} of 4 complete`}
          </small>
        </article>

        <article>
          <span>
            {isArabic
              ? "الأولوية الحالية"
              : "Current priority"}
          </span>

          <strong>
            {currentPriority}
          </strong>

          <small>
            {isArabic
              ? "استنادًا إلى أحدث البيانات"
              : "Based on latest data"}
          </small>
        </article>

        <article>
          <span>
            {isArabic
              ? "المراجعة القادمة"
              : "Next review"}
          </span>

          <strong>
            {isArabic
              ? "خلال 7 أيام"
              : "In 7 days"}
          </strong>

          <small>
            {isArabic
              ? "متابعة اعتيادية"
              : "Routine follow-up"}
          </small>
        </article>
      </div>
    </section>
  );
}