type HistoryPriorityCardProps = {
  priorityAssessment: {
    module: string;
    score: number;
  } | null;

  bestAssessment: {
    module: string;
    score: number;
  } | null;

  isArabic: boolean;
};

export default function HistoryPriorityCard({
  priorityAssessment,
  bestAssessment,
  isArabic,
}: HistoryPriorityCardProps) {
  const text = (
    en: string,
    ar: string
  ) => (isArabic ? ar : en);

  return (
    <article className="ohCard">
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">
            {text(
              "Priority & Best Records",
              "الأولوية وأفضل النتائج"
            )}
          </p>

          <h2 className="ohCardTitle">
            {text(
              "Current health highlights",
              "أبرز النتائج الصحية"
            )}
          </h2>
        </div>
      </div>

      <div className="ohStack">
        <div className="ohMetricCard">
          <span className="ohMetricLabel">
            {text(
              "Priority Assessment",
              "التقييم ذو الأولوية"
            )}
          </span>

          <span className="ohMetricValue">
            {priorityAssessment
              ? `${priorityAssessment.module} (${priorityAssessment.score}/100)`
              : text(
                  "Not available",
                  "غير متوفر"
                )}
          </span>
        </div>

        <div className="ohMetricCard">
          <span className="ohMetricLabel">
            {text(
              "Best Assessment",
              "أفضل تقييم"
            )}
          </span>

          <span className="ohMetricValue">
            {bestAssessment
              ? `${bestAssessment.module} (${bestAssessment.score}/100)`
              : text(
                  "Not available",
                  "غير متوفر"
                )}
          </span>
        </div>
      </div>
    </article>
  );
}