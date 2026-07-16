import type {
  ReactNode,
} from "react";

type DashboardSectionProps = {
  className?: string;

  eyebrow?: string;
  title?: string;
  description?: string;

  headerAction?: ReactNode;
  children: ReactNode;
};

export default function DashboardSection({
  className = "",
  eyebrow,
  title,
  description,
  headerAction,
  children,
}: DashboardSectionProps) {
  const hasHeader =
    Boolean(
      eyebrow ||
      title ||
      description ||
      headerAction
    );

  return (
    <section
      className={[
        "dashboardSection",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {hasHeader && (
        <div className="dashboardSectionHeader">
          <div>
            {eyebrow && (
              <span className="dashboardSectionEyebrow">
                {eyebrow}
              </span>
            )}

            {title && (
              <h2 className="dashboardSectionTitle">
                {title}
              </h2>
            )}

            {description && (
              <p className="dashboardSectionDescription">
                {description}
              </p>
            )}
          </div>

          {headerAction && (
            <div className="dashboardSectionAction">
              {headerAction}
            </div>
          )}
        </div>
      )}

      <div className="dashboardSectionContent">
        {children}
      </div>
    </section>
  );
}