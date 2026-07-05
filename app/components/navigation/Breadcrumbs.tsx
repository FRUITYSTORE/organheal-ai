import Link from "next/link";

type BreadcrumbItem = {
  href?: string;
  label: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav className="ohCard" aria-label="Breadcrumb" style={{ padding: "14px 18px" }}>
      <div className="ohButtonRow" style={{ gap: "8px", margin: 0 }}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <span key={`${item.label}-${index}`} className="ohCardText" style={{ margin: 0 }}>
              {item.href && !isLast ? (
                <Link href={item.href} className="articleReadMore">
                  {item.label}
                </Link>
              ) : (
                <strong>{item.label}</strong>
              )}

              {!isLast ? <span style={{ marginInline: "8px" }}>›</span> : null}
            </span>
          );
        })}
      </div>
    </nav>
  );
}