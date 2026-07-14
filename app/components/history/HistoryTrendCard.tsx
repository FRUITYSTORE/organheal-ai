type TrendSignal = {
  label: string;
  description: string;
  tone: string;
};

type HistoryTrendCardProps = {
  assessmentTrend: TrendSignal;
  wellnessTrend: TrendSignal;
  isArabic: boolean;
};

export default function HistoryTrendCard({
  assessmentTrend,
  wellnessTrend,
  isArabic,
}: HistoryTrendCardProps) {
  const text = (
    english: string,
    arabic: string
  ) => (isArabic ? arabic : english);

  return (
    <article className="ohCard">
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">
            {text(
              "Progress Trends",
              "اتجاهات التقدم"
            )}
          </p>

          <h2 className="ohCardTitle">
            {text(
              "What changed recently?",
              "ما الذي تغيّر مؤخرًا؟"
            )}
          </h2>
        </div>
      </div>

      <div className="ohStack">
        <div>
          <span
            className={`ohStatusBadge ${assessmentTrend.tone}`}
          >
            {assessmentTrend.label}
          </span>

          <p className="ohCardText">
            {assessmentTrend.description}
          </p>
        </div>

        <div>
          <span
            className={`ohStatusBadge ${wellnessTrend.tone}`}
          >
            {wellnessTrend.label}
          </span>

          <p className="ohCardText">
            {wellnessTrend.description}
          </p>
        </div>
      </div>
    </article>
  );
}