import type { ReactNode } from "react";

import "./page-hero.css";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export default function PageHero({
  eyebrow,
  title,
  description,
  badge,
  actions,
  children,
  className = "",
}: PageHeroProps) {
  return (
    <header className={`ohPageHero ${className}`.trim()}>
      <div className="ohPageHeroContent">
        <div className="ohPageHeroCopy">
          {eyebrow && (
            <span className="ohPageHeroEyebrow">
              {eyebrow}
            </span>
          )}

          <h1 className="ohPageHeroTitle">
            {title}
          </h1>

          {description && (
            <p className="ohPageHeroDescription">
              {description}
            </p>
          )}

          {actions && (
            <div className="ohPageHeroActions">
              {actions}
            </div>
          )}
        </div>

        {badge && (
          <div className="ohPageHeroBadge">
            {badge}
          </div>
        )}
      </div>

      {children && (
        <div className="ohPageHeroExtra">
          {children}
        </div>
      )}
    </header>
  );
}