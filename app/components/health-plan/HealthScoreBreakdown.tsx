type HealthScoreContributor = {
  id:
    | "assessment"
    | "checkin"
    | "reports"
    | "analysis"
    | "history"
    | "findings";
  label: string;
  score: number;
  weight: number;
  weightedScore: number;
  available: boolean;
  explanation: string;
};

type HealthScoreBreakdownProps = {
  isArabic: boolean;
  score: number;
  confidence: number;
  dataCompleteness: number;
  summary: string;
  contributors: HealthScoreContributor[];
};

const arabicLabels: Record<HealthScoreContributor["id"], string> = {
  assessment: "التقييم الصحي",
  checkin: "آخر Check-In",
  reports: "التقارير الطبية",
  analysis: "تحليل التقارير",
  history: "التاريخ الصحي",
  findings: "المؤشرات السريرية",
};

export default function HealthScoreBreakdown({
  isArabic,
  score,
  confidence,
  dataCompleteness,
  summary,
  contributors,
}: HealthScoreBreakdownProps) {
  return (
    <section className="hpPanel">
      <div className="hpPanelHeader">
        <div className="hpPanelKicker">
          {isArabic ? "تفسير النتيجة" : "Score transparency"}
        </div>

        <h2 className="hpPanelTitle">
          {isArabic
            ? "كيف تم حساب نتيجة الذكاء الصحي؟"
            : "How was your Health Intelligence Score calculated?"}
        </h2>

        <p className="hpPanelText">{summary}</p>
      </div>

      <div className="hpScoreSummaryGrid">
        <div className="hpScoreSummaryItem">
          <span>{isArabic ? "النتيجة" : "Health score"}</span>
          <strong>{score}/100</strong>
        </div>

        <div className="hpScoreSummaryItem">
          <span>{isArabic ? "مستوى الثقة" : "Confidence"}</span>
          <strong>{confidence}%</strong>
        </div>

        <div className="hpScoreSummaryItem">
          <span>{isArabic ? "اكتمال البيانات" : "Data completeness"}</span>
          <strong>{dataCompleteness}%</strong>
        </div>
      </div>

      <div className="hpContributorGrid">
        {contributors.map((contributor) => (
          <article
            className={`hpContributorCard ${
              contributor.available ? "available" : "missing"
            }`}
            key={contributor.id}
          >
            <div className="hpContributorTop">
              <div>
                <span className="hpContributorLabel">
                  {isArabic
                    ? arabicLabels[contributor.id]
                    : contributor.label}
                </span>

                <strong className="hpContributorScore">
                  {contributor.available
                    ? `${contributor.score}/100`
                    : isArabic
                      ? "غير متاح"
                      : "Not available"}
                </strong>
              </div>

              <span
                className={`hpBadge ${
                  contributor.available ? "good" : "warn"
                }`}
              >
                {contributor.weight}% {isArabic ? "وزن" : "weight"}
              </span>
            </div>

            <div className="hpContributorProgress">
              <span
                style={{
                  width: contributor.available
                    ? `${Math.min(Math.max(contributor.score, 0), 100)}%`
                    : "0%",
                }}
              />
            </div>

            <p className="hpContributorText">
              {contributor.explanation}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}