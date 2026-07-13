import { HealthEvidenceData } from "@/lib/health-intelligence/engines/health-evidence.engine";

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
              ? "أدلة الذكاء الصحي"
              : "Clinical Evidence"}
          </p>

          <h2 className="ohCardTitle">
            {isArabic
              ? "لماذا توصل النظام لهذا الاستنتاج؟"
              : "Why did OrganHeal reach this conclusion?"}
          </h2>
        </div>

        <div className="ohMetricValue">
          {confidence}%
        </div>
      </div>

      <p className="ohCardText">
        {evidence.explanation}
      </p>

      <div className="ohGrid cols3" style={{ marginTop: 20 }}>
        <article className="ohMetricCard">
          <span>{isArabic ? "الأدلة" : "Evidence"}</span>
          <strong>{evidence.evidenceCount}</strong>
        </article>

        <article className="ohMetricCard">
          <span>{isArabic ? "المصادر" : "Sources"}</span>
          <strong>{evidence.sourceCount}</strong>
        </article>

        <article className="ohMetricCard">
          <span>{isArabic ? "النقاط" : "Data Points"}</span>
          <strong>{evidence.dataPointsReviewed}</strong>
        </article>
      </div>

      <div
        style={{
          marginTop: 24,
          display: "grid",
          gap: 12,
        }}
      >
        {evidence.primaryEvidence.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="ohTimelineItem"
          >
            <span className="ohTimelineDot" />

            <div>
              <p className="ohTimelineTitle">
                {item.title}
              </p>

              <p className="ohTimelineMeta">
                {item.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}