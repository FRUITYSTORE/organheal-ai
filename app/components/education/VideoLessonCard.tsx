import Link from "next/link";

type VideoLessonCardProps = {
  label: string;
  title: string;
  description: string;
  badge: string;
  actionHref: string;
  actionLabel: string;
  noteLabel: string;
  noteTitle: string;
  noteText: string;
};

export default function VideoLessonCard({
  label,
  title,
  description,
  badge,
  actionHref,
  actionLabel,
  noteLabel,
  noteTitle,
  noteText,
}: VideoLessonCardProps) {
  return (
    <section className="ohCard">
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">{label}</p>
          <h2 className="ohCardTitle">{title}</h2>
          <p className="ohCardText">{description}</p>
        </div>

        <span className="ohStatusBadge neutral">{badge}</span>
      </div>

      <div className="ohActionPanel" style={{ marginTop: "18px" }}>
        <div>
          <p className="ohMetricLabel">{noteLabel}</p>
          <h3 className="ohCardTitle">{noteTitle}</h3>
          <p className="ohCardText">{noteText}</p>
        </div>

        <Link href={actionHref} className="primaryBtn">
          {actionLabel}
        </Link>
      </div>
    </section>
  );
}