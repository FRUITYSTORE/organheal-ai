import type { ReactNode } from "react";
import PageBackLink from "./PageBackLink";

type PageLayoutAction = {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
};

type PageLayoutProps = {
  backHref: string;
  backLabel: string;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: PageLayoutAction[];
  children: ReactNode;
};

export default function PageLayout({
  backHref,
  backLabel,
  eyebrow,
  title,
  description,
  actions = [],
  children,
}: PageLayoutProps) {
  return (
    <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
      <PageBackLink href={backHref} label={backLabel} />

      <section className="ohHero">
        {eyebrow ? <p className="ohEyebrow">{eyebrow}</p> : null}

        <h1 className="ohTitle">{title}</h1>

        {description ? <p className="ohLead">{description}</p> : null}

        {actions.length > 0 ? (
          <div className="ohButtonRow" style={{ marginTop: "24px" }}>
            {actions.map((action) => (
              <a
                key={`${action.href}-${action.label}`}
                href={action.href}
                className={action.variant === "secondary" ? "secondaryBtn" : "primaryBtn"}
              >
                {action.label}
              </a>
            ))}
          </div>
        ) : null}
      </section>

      {children}
    </div>
  );
}