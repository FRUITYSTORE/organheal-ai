import { HealthEvidenceData } from "@/lib/health-intelligence/engines/health-evidence.engine";

type HealthEvidenceCardProps = {
  evidence: HealthEvidenceData;
  confidence: number;
  isArabic?: boolean;
};

function getArabicSourceLabel(source: string) {
  switch (source) {
    case "assessment":
      return "التقييم";
    case "checkin":
      return "Check-In";
    case "report":
      return "التقرير";
    case "analysis":
      return "التحليل";
    case "history":
      return "السجل الصحي";
    case "finding":
      return "المؤشر السريري";
    case "trend":
      return "الاتجاه";
    case "pattern":
      return "النمط";
    case "timeline":
      return "الخط الزمني";
    default:
      return source;
  }
}

export default function HealthEvidenceCard({
  evidence,
  confidence,
  isArabic = false,
}: HealthEvidenceCardProps) {
  return (
    <section className="healthEvidenceCard">
      <div className="healthEvidenceHeader">
        <div>
          <span className="healthEvidenceKicker">
            {isArabic ? "شفافية الذكاء الصحي" : "Intelligence Transparency"}
          </span>

          <h2>
            {isArabic
              ? "لماذا توصل OrganHeal إلى هذه النتيجة؟"
              : evidence.headline}
          </h2>

          <p>
            {isArabic
              ? `تم دعم الاستنتاج الحالي بواسطة ${evidence.evidenceCount} دليل من ${evidence.sourceCount} مصادر صحية.`
              : evidence.explanation}
          </p>
        </div>

        <div className="healthEvidenceConfidence">
          <span>{isArabic ? "الثقة" : "Confidence"}</span>
          <strong>{confidence}%</strong>
        </div>
      </div>

      <div className="healthEvidenceMetrics">
        <article>
          <span>{isArabic ? "الأدلة" : "Evidence items"}</span>
          <strong>{evidence.evidenceCount}</strong>
        </article>

        <article>
          <span>{isArabic ? "مصادر البيانات" : "Data sources"}</span>
          <strong>{evidence.sourceCount}</strong>
        </article>

        <article>
          <span>{isArabic ? "النقاط المراجعة" : "Data points reviewed"}</span>
          <strong>{evidence.dataPointsReviewed}</strong>
        </article>
      </div>

      {evidence.primaryEvidence.length > 0 && (
        <div className="healthEvidenceList">
          <div className="healthEvidenceListHeader">
            <strong>
              {isArabic ? "أهم الأدلة" : "Primary evidence"}
            </strong>
          </div>

          {evidence.primaryEvidence.slice(0, 4).map((item) => (
            <article key={item.id} className="healthEvidenceItem">
              <div>
                <span className="healthEvidenceSource">
                  {isArabic
                    ? getArabicSourceLabel(item.source)
                    : item.source}
                </span>

                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>

              {item.value !== null && (
                <span className="healthEvidenceValue">
                  {String(item.value)}
                </span>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}