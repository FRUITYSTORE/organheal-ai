import type { ReactNode } from "react";

type PageSectionProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
};

export default function PageSection({
  eyebrow,
  title,
  description,
  children,
}: PageSectionProps) {
  return (
    <section className="ohCard">
      <div className="ohCardHeader">
        <div>
          {eyebrow ? (
            <p className="ohMetricLabel">{eyebrow}</p>
          ) : null}

          <h2 className="ohCardTitle">{title}</h2>

          {description ? (
            <p className="ohCardText">{description}</p>
          ) : null}
        </div>
      </div>

      {children}
    </section>
  );
}