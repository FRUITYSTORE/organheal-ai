import Link from "next/link";
import DashboardSection from "./DashboardSection";

type DashboardJourneyNextStep = {
  label: string;
  href: string;
};

type DashboardJourneySectionProps = {
  isArabic: boolean;

  nextStep:
    DashboardJourneyNextStep;

  hasAssessments: boolean;
  hasReports: boolean;
  hasSavedIntelligence: boolean;
  hasCheckIn: boolean;
};

export default function DashboardJourneySection({
  isArabic,
  nextStep,
  hasAssessments,
  hasReports,
  hasSavedIntelligence,
  hasCheckIn,
}: DashboardJourneySectionProps) {
  const journeyItems = [
    {
      step: "01",

      label:
        isArabic
          ? "التقييم الصحي"
          : "Health Assessment",

      description:
        isArabic
          ? "يبني أول صورة عن صحة الأعضاء."
          : "Builds the first picture of organ health.",

      ready:
        hasAssessments,

      href:
        "/assessment",
    },
    {
      step: "02",

      label:
        isArabic
          ? "التقارير الطبية"
          : "Medical Reports",

      description:
        isArabic
          ? "يربط التقييم ببيانات صحية فعلية."
          : "Connects assessments with real health data.",

      ready:
        hasReports,

      href:
        "/reports",
    },
    {
      step: "03",

      label:
        isArabic
          ? "تحليل التقرير"
          : "Report Analysis",

      description:
        isArabic
          ? "يحوّل التقارير إلى ملخصات قابلة للفهم والمتابعة."
          : "Turns reports into patient and doctor-ready summaries.",

      ready:
        hasSavedIntelligence,

      href:
        "/reports",
    },
    {
      step: "04",

      label:
        isArabic
          ? "التحديث الصحي"
          : "Daily Check-In",

      description:
        isArabic
          ? "يجعل الخطة مرتبطة بالحالة اليومية."
          : "Keeps the plan connected to daily status.",

      ready:
        hasCheckIn,

      href:
        "/checkin",
    },
    {
      step: "05",

      label:
        isArabic
          ? "خطة المتابعة"
          : "Health Plan",

      description:
        isArabic
          ? "يجمع كل شيء في خطة عملية قابلة للتنفيذ."
          : "Connects everything into an actionable follow-up plan.",

      ready:
        hasAssessments ||
        hasReports ||
        hasSavedIntelligence ||
        hasCheckIn,

      href:
        "/health-plan",
    },
  ];

    return (
    <DashboardSection
      className="dashboardJourneyPanel"
      eyebrow={
        isArabic
          ? "رحلة OrganHeal"
          : "OrganHeal Journey"
      }
      title={
        isArabic
          ? "أين أنت الآن في رحلتك الصحية؟"
          : "Where are you in your health journey?"
      }
      description={
        isArabic
          ? "كل خطوة تضيف طبقة جديدة من الفهم: التقييم، التقارير، الذكاء، التحديث الصحي، ثم خطة المتابعة."
          : "Each step adds a new layer of understanding: assessment, reports, intelligence, check-in, then the follow-up plan."
      }
      headerAction={
        <Link
          href={nextStep.href}
          className="dashboardJourneyNext"
        >
          {isArabic
            ? "الخطوة التالية"
            : "Next step"}
          : {nextStep.label}
        </Link>
      }
    >
      <div className="dashboardJourneyTimeline">
        {journeyItems.map((item) => (
          <Link
            href={item.href}
            key={item.step}
            className={`dashboardJourneyStep ${
              item.ready
                ? "ready"
                : "pending"
            }`}
          >
            <div className="dashboardJourneyNumber">
              {item.ready
                ? "✓"
                : item.step}
            </div>

            <strong>
              {item.label}
            </strong>

            <p>
              {item.description}
            </p>

            <span className="dashboardJourneyStatus">
              {item.ready
                ? isArabic
                  ? "مكتمل"
                  : "Complete"
                : isArabic
                  ? "بانتظار"
                  : "Pending"}
            </span>
          </Link>
        ))}
      </div>
    </DashboardSection>
  );
  }