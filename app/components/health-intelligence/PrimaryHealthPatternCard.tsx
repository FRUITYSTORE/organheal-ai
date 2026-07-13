import { HealthPattern } from "@/lib/health-intelligence/engines/health-pattern.engine";

type PrimaryHealthPatternCardProps = {
  pattern: HealthPattern | null;
  isArabic?: boolean;
};

function getPriorityLabel(
  priority: HealthPattern["priority"],
  isArabic: boolean
) {
  switch (priority) {
    case "critical":
      return isArabic ? "حرج" : "Critical";
    case "high":
      return isArabic ? "أولوية عالية" : "High priority";
    case "moderate":
      return isArabic ? "متابعة مطلوبة" : "Needs follow-up";
    default:
      return isArabic ? "معلومة" : "Informational";
  }
}

export default function PrimaryHealthPatternCard({
  pattern,
  isArabic = false,
}: PrimaryHealthPatternCardProps) {
  if (!pattern) {
    return (
      <section className="primaryPatternCard empty">
        <span className="primaryPatternKicker">
          {isArabic ? "النمط الصحي الأهم" : "Primary Health Pattern"}
        </span>

        <h2>
          {isArabic
            ? "نحتاج بيانات أكثر لاكتشاف نمط صحي موثوق"
            : "More data is needed to identify a reliable health pattern"}
        </h2>

        <p>
          {isArabic
            ? "أكمل تقييمًا آخر أو Check-In أو ارفع تقريرًا طبيًا لتقوية التحليل."
            : "Complete another assessment, Check-In, or upload a medical report to strengthen the analysis."}
        </p>
      </section>
    );
  }

  return (
    <section className={`primaryPatternCard ${pattern.priority}`}>
      <div className="primaryPatternHeader">
        <div>
          <span className="primaryPatternKicker">
            {isArabic ? "النمط الصحي الأهم" : "Primary Health Pattern"}
          </span>

          <h2>{pattern.title}</h2>
        </div>

        <span className="primaryPatternBadge">
          {getPriorityLabel(pattern.priority, isArabic)}
        </span>
      </div>

      <p className="primaryPatternDescription">
        {pattern.description}
      </p>

      <div className="primaryPatternMeta">
        <span>
          {isArabic ? "الثقة" : "Confidence"}: {pattern.confidence}%
        </span>

        {pattern.organ && (
          <span>
            {isArabic ? "المنطقة" : "Area"}: {pattern.organ}
          </span>
        )}
      </div>

      <div className="primaryPatternAction">
        <strong>
          {isArabic ? "الخطوة المقترحة" : "Recommended action"}
        </strong>

        <p>{pattern.recommendedAction}</p>
      </div>
    </section>
  );
}