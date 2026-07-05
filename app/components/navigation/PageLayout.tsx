import PageActions, { PageAction } from "./PageActions";
import type { ReactNode } from "react";
import PageBackLink from "./PageBackLink";

type PageLayoutProps = {
  backHref: string;
  backLabel: string;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: PageAction[];
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

       <PageActions actions={actions} />
      </section>

      {children}
    </div>
  );
}