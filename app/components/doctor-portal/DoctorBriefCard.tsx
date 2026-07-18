type DoctorBriefCardProps = {
  eyebrow: string;
  title: string;
  readiness: string;
  readinessTone: string;
  brief: string;
  clinicalSummary?: string | null;
  evidenceSummary?: string | null;
  momentumSummary?: string | null;
  decisionSummary?: string | null;
};

export default function DoctorBriefCard({
  eyebrow,
  title,
  readiness,
  readinessTone,
  brief,
  clinicalSummary,
  evidenceSummary,
  momentumSummary,
  decisionSummary,
}: DoctorBriefCardProps) {
  return (
    <article className="ohCard">
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">{eyebrow}</p>

          <h2 className="ohCardTitle">{title}</h2>
        </div>

        <span className={`ohStatusBadge ${readinessTone}`}>
          {readiness}
        </span>
      </div>

      <p className="ohCardText">{brief}</p>

      {(clinicalSummary ||
        evidenceSummary ||
        momentumSummary ||
        decisionSummary) && (
        <>
          <div className="ohDivider" />

          <div className="ohStack">
            {clinicalSummary && (
              <section>
                <p className="ohMetricLabel">Clinical Summary</p>
                <p className="ohCardText">{clinicalSummary}</p>
              </section>
            )}

            {evidenceSummary && (
              <section>
                <p className="ohMetricLabel">Evidence Summary</p>
                <p className="ohCardText">{evidenceSummary}</p>
              </section>
            )}

            {momentumSummary && (
              <section>
                <p className="ohMetricLabel">Momentum Summary</p>
                <p className="ohCardText">{momentumSummary}</p>
              </section>
            )}

            {decisionSummary && (
              <section>
                <p className="ohMetricLabel">Decision Summary</p>
                <p className="ohCardText">{decisionSummary}</p>
              </section>
            )}
          </div>
        </>
      )}
    </article>
  );
}