import PageActions, { PageAction } from "./PageActions";
import type { ReactNode } from "react";
import PageBackLink from "./PageBackLink";
import Breadcrumbs from "./Breadcrumbs";
import PageHeroMetrics from "./PageHeroMetrics";
import StickyActionBar from "./StickyActionBar";

export type BreadcrumbItem = {
  href?: string;
  label: string;
};

export type HeroMetric = {
  label: string;
  value: string;
  description?: string;
};

type PageLayoutProps = {
  backHref: string;
  backLabel: string;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: PageAction[];
  breadcrumbs?: BreadcrumbItem[];
heroMetrics?: HeroMetric[];
stickyActions?: PageAction[];
  children: ReactNode;
};

export default function PageLayout({
  backHref,
  backLabel,
  eyebrow,
  title,
  description,
  actions = [],
  breadcrumbs = [],
  heroMetrics = [],
  stickyActions = [],
  children,
}: PageLayoutProps) {
  return (
    <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
      <PageBackLink href={backHref} label={backLabel} />
   {breadcrumbs && breadcrumbs.length > 0 && (
  <Breadcrumbs items={breadcrumbs} />
)}
      <section className="ohHero">
        {eyebrow ? <p className="ohEyebrow">{eyebrow}</p> : null}

        <h1 className="ohTitle">{title}</h1>

        {description ? <p className="ohLead">{description}</p> : null}

       <PageActions actions={actions} />
       {heroMetrics && heroMetrics.length > 0 && (
  <PageHeroMetrics metrics={heroMetrics} />
)}
      </section>
<StickyActionBar actions={stickyActions ?? []} />
      {children}
    </div>
  );
}