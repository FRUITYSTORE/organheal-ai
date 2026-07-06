type DoctorBriefCardProps = {
  eyebrow: string;
  title: string;
  readiness: string;
  readinessTone: string;
  brief: string;
};

export default function DoctorBriefCard({
  eyebrow,
  title,
  readiness,
  readinessTone,
  brief,
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
    </article>
  );
}