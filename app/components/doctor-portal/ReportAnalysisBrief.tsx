type ReportAnalysisBriefProps = {
  eyebrow: string;
  title: string;
  count: number;
  countTone: string;
  generatedLabel: string;
  processedLabel: string;
  pendingLabel: string;
  generatedCount: number;
  processedCount: number;
  pendingCount: number;
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
  count,
  countTone,
  generatedLabel,
  processedLabel,
  pendingLabel,
  generatedCount,
  processedCount,
  pendingCount,
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
          <p className="ohMetricLabel">{eyebrow}</p>
          <h2 className="ohCardTitle">{title}</h2>
        </div>

        <span className={`ohStatusBadge ${countTone}`}>{count}</span>
      </div>

      <div className="ohGrid cols3">
        <article className="ohMetricCard">
          <span className="ohMetricLabel">{generatedLabel}</span>
          <span className="ohMetricValue">{generatedCount}</span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">{processedLabel}</span>
          <span className="ohMetricValue">{processedCount}</span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">{pendingLabel}</span>
          <span className="ohMetricValue">{pendingCount}</span>
        </article>
      </div>

      <div className="ohDivider" />

      <div className="ohGrid cols2">
        <article className="ohActionPanel">
          <p className="ohMetricLabel">{summaryLabel}</p>
          <p className="ohCardText">{summary}</p>
        </article>

        <article className="ohActionPanel">
          <p className="ohMetricLabel">{recommendationsLabel}</p>
          <p className="ohCardText">{recommendations}</p>
        </article>
      </div>

      <article className="ohTrustNotice" style={{ marginTop: "16px" }}>
        <span aria-hidden="true">🩺</span>
        <div>
          <strong>{doctorBriefLabel}</strong>
          <br />
          {doctorBrief}
        </div>
      </article>
    </section>
  );
}