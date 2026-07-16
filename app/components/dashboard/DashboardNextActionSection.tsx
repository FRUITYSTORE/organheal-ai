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
};

export default function DashboardNextActionSection({
  isArabic,
  nextStep,
  progressPercent,
  completedSteps,
  currentPriority,
}: DashboardNextActionSectionProps) {
  return (
    <section
      className="dashboardNextActionPanel healthCommandCenterNextAction"
      style={{
        width: "100%",
        maxWidth: "100%",
      }}
    >
      <span>{nextStep.tag}</span>

      <h2>{nextStep.label}</h2>

      <p
        style={{
          marginTop: "14px",
          fontWeight: 700,
          color: "#0f766e",
        }}
      >
        {isArabic
          ? "هذه هي أهم خطوة يمكنك القيام بها الآن."
          : "This is the highest-impact action you can take right now."}
      </p>

      <p>{nextStep.description}</p>

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginTop: "18px",
        }}
      >
        <div className="dashboardBadgeRow">
          <span className="dashboardMiniBadge">
            {isArabic
              ? `اكتمال الرحلة ${progressPercent}%`
              : `Journey Ready ${progressPercent}%`}
          </span>

          <span className="dashboardMiniBadge">
            {isArabic
              ? "آخر تحليل: اليوم"
              : "Last Intelligence: Today"}
          </span>

          <span className="dashboardMiniBadge">
            {isArabic
              ? "المراجعة القادمة: 7 أيام"
              : "Next Review: 7 Days"}
          </span>
        </div>
      </div>

      <div className="dashboardPlanProgress">
        <div
          className="dashboardPlanProgressBar"
          style={{
            width:
              `${progressPercent}%`,
          }}
        />
      </div>

      <p className="dashboardPlanProgressText">
        {isArabic
          ? "جميع البيانات الصحية الأساسية أصبحت متصلة."
          : "All core health information has been connected."}
      </p>

      <div
        className="dashboardSignalGrid"
        style={{
          marginTop: "22px",
        }}
      >
        <article>
          <span>
            {isArabic
              ? "جاهزية الرحلة"
              : "Journey readiness"}
          </span>

          <strong>
            {progressPercent}%
          </strong>

          <p>
            {isArabic
              ? `${completedSteps} من 4 عناصر أساسية مكتملة.`
              : `${completedSteps} of 4 core elements completed.`}
          </p>
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

          <p>
            {isArabic
              ? "مرتبطة بالذكاء الصحي الحالي."
              : "Linked to the current health intelligence."}
          </p>
        </article>

        <article>
          <span>
            {isArabic
              ? "الهدف التالي"
              : "Next milestone"}
          </span>

          <strong>
            {nextStep.tag}
          </strong>

          <p>
            {nextStep.label}
          </p>
        </article>
      </div>

      <div
        className="dashboardActionRow"
        style={{
          marginTop: "22px",
        }}
      >
        <Link
          href={nextStep.href}
          className="dashboardPrimaryAction"
        >
          {nextStep.buttonText}
        </Link>

        <Link
          href="/reports"
          className="dashboardSecondaryAction"
        >
          {isArabic
            ? "مراجعة التقارير"
            : "Review Reports"}
        </Link>
      </div>
    </section>
  );
}