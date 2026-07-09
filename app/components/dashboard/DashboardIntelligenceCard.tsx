import { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";

type DashboardIntelligenceCardProps = {
  intelligence: HealthIntelligenceResult;
  isArabic: boolean;
};

function riskLabel(risk: string, isArabic: boolean) {
  if (risk === "high") return isArabic ? "مرتفع" : "High";
  if (risk === "moderate") return isArabic ? "متوسط" : "Moderate";
  if (risk === "low") return isArabic ? "منخفض" : "Low";
  return isArabic ? "غير معروف" : "Unknown";
}

export default function DashboardIntelligenceCard({
  intelligence,
  isArabic,
}: DashboardIntelligenceCardProps) {
  const topFindings = intelligence.findings.slice(0, 3);

  return (
    <section className="dashboardCommandPanel">
      <span>{isArabic ? "الذكاء الصحي" : "Health Intelligence"}</span>

      <h2>
        {isArabic
          ? "ما الذي يحتاج انتباهك الآن؟"
          : "What needs your attention now?"}
      </h2>

      <p>
        {isArabic
          ? "ملخص ذكي مبني على التقييمات، Check-In، التقارير، والتحليل المحفوظ."
          : "A smart summary based on assessments, Check-In, reports, and saved analysis."}
      </p>

      <div className="dashboardSignalGrid" style={{ marginTop: "18px" }}>
        <div>
          <span>{isArabic ? "مستوى الخطورة" : "Current Risk"}</span>
          <strong>
            {riskLabel(intelligence.risk.data.overallRisk, isArabic)}
          </strong>
          <p>
            {isArabic
              ? `الثقة: ${intelligence.risk.confidence}%`
              : `Confidence: ${intelligence.risk.confidence}%`}
          </p>
        </div>

        <div>
          <span>{isArabic ? "الأولوية" : "Priority"}</span>
          <strong>
            {intelligence.priority.data.priorityOrgan || "—"}
          </strong>
          <p>
            {intelligence.priority.data.priorityScore === null
              ? isArabic
                ? "بانتظار التقييم"
                : "Assessment pending"
              : `${intelligence.priority.data.priorityScore}/100`}
          </p>
        </div>

        <div>
          <span>{isArabic ? "النتائج" : "Findings"}</span>
          <strong>{topFindings.length}</strong>
          <p>
            {isArabic
              ? "أهم المؤشرات الحالية"
              : "Top current signals"}
          </p>
        </div>
      </div>

      <div className="ohTimeline" style={{ marginTop: "18px" }}>
        {topFindings.map((finding) => (
          <div className="ohTimelineItem" key={finding.id}>
            <span className="ohTimelineDot" />
            <div>
              <p className="ohTimelineTitle">{finding.title}</p>
              <p className="ohTimelineMeta">{finding.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboardActionRow" style={{ marginTop: "18px" }}>
        <p style={{ margin: 0 }}>
          <strong>
            {isArabic ? "الخطوة المقترحة: " : "Recommended next step: "}
          </strong>
          {intelligence.risk.data.recommendation}
        </p>
      </div>
    </section>
  );
}