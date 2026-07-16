type ReportAnalysisBriefProps = {
  eyebrow: string;
  title: string;

  summaryLabel: string;
  summary: string;

  recommendationsLabel: string;
  recommendations: string;

  doctorBriefLabel: string;
  doctorBrief: string;
};

export default function ReportAnalysisBrief({
  eyebrow,
  title,
  summaryLabel,
  summary,
  recommendationsLabel,
  recommendations,
  doctorBriefLabel,
  doctorBrief,
}: ReportAnalysisBriefProps) {
  return (
    <section className="ohCard">
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">
            {eyebrow}
          </p>

          <h2 className="ohCardTitle">
            {title}
          </h2>
        </div>
      </div>

      <div className="ohGrid cols2">
        <article className="ohActionPanel">
          <p className="ohMetricLabel">
            {summaryLabel}
          </p>

          <p className="ohCardText">
            {summary}
          </p>
        </article>

        <article className="ohActionPanel">
          <p className="ohMetricLabel">
            {recommendationsLabel}
          </p>

          <p className="ohCardText">
            {recommendations}
          </p>
        </article>
      </div>

      <article
        className="ohTrustNotice"
        style={{
          marginTop: "16px",
        }}
      >
        <span aria-hidden="true">
          🩺
        </span>

        <div>
          <strong>
            {doctorBriefLabel}
          </strong>

          <br />

          {doctorBrief}
        </div>
      </article>
    </section>
  );
}