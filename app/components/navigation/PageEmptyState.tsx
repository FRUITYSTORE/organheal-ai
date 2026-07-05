import Link from "next/link";

type PageEmptyStateProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export default function PageEmptyState({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: PageEmptyStateProps) {
  return (
    <section className="ohCard" style={{ textAlign: "center" }}>
      {eyebrow ? <p className="ohMetricLabel">{eyebrow}</p> : null}

      <h2 className="ohCardTitle">{title}</h2>

      <p className="ohCardText" style={{ maxWidth: "680px", margin: "12px auto 0" }}>
        {description}
      </p>

      {actionHref && actionLabel ? (
        <div className="ohButtonRow" style={{ justifyContent: "center", marginTop: "22px" }}>
          <Link href={actionHref} className="primaryBtn">
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </section>
  );
}