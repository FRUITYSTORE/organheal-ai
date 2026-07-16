import DashboardSection from "./DashboardSection";
import DashboardOverviewGrid from "./DashboardOverviewGrid";

type DashboardOverviewSectionProps = {
  isArabic: boolean;
  cards: React.ComponentProps<
    typeof DashboardOverviewGrid
  >["cards"];
};

export default function DashboardOverviewSection({
  isArabic,
  cards,
}: DashboardOverviewSectionProps) {
  return (
    <DashboardSection
      className="dashboardOverviewPanel"
      eyebrow={
        isArabic
          ? "نظرة عامة"
          : "Overview"
      }
      title={
        isArabic
          ? "ملخص حالتك الحالية"
          : "Current Health Snapshot"
      }
      description={
        isArabic
          ? "أهم المؤشرات الصحية في مكان واحد."
          : "Your most important health indicators in one place."
      }
    >
      <DashboardOverviewGrid
        cards={cards}
      />
    </DashboardSection>
  );
}