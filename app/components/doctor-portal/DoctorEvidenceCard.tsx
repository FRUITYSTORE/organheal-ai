import type {
  HealthEvidenceData,
} from "@/lib/health-intelligence/engines/health-evidence.engine";

type Props = {
  evidence: HealthEvidenceData;
  confidence: number;
  isArabic?: boolean;
};

export default function DoctorEvidenceCard({
  evidence,
  confidence,
  isArabic = false,
}: Props) {
  return (
    <section className="ohCard">
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">
            {isArabic
              ? "الأدلة السريرية"
              : "Clinical Evidence"}
          </p>

          <h2 className="ohCardTitle">
            {isArabic
              ? "ملخص قوة الأدلة"
              : "Evidence Strength Summary"}
          </h2>
        </div>

        <span className="ohStatusBadge neutral">
          {confidence}%
        </span>
      </div>

      <p className="ohCardText">
        {evidence.explanation}
      </p>

      <div
        className="ohMetricGrid"
        style={{
          marginTop: "18px",
        }}
      >
        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {isArabic
              ? "عناصر الأدلة"
              : "Evidence Items"}
          </span>

          <span className="ohMetricValue">
            {evidence.evidenceCount}
          </span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {isArabic
              ? "المصادر المترابطة"
              : "Connected Sources"}
          </span>

          <span className="ohMetricValue">
            {evidence.sourceCount}
          </span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {isArabic
              ? "نقاط البيانات"
              : "Data Points"}
          </span>

          <span className="ohMetricValue">
            {evidence.dataPointsReviewed}
          </span>
        </article>
      </div>
    </section>
  );
}