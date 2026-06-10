import Link from "next/link";

type DashboardEmptyStateProps = {
  title: string;
  description: string;
  buttonText: string;
  href: string;
};

export default function DashboardEmptyState({
  title,
  description,
  buttonText,
  href,
}: DashboardEmptyStateProps) {
  return (
    <div className="emptyStateCard">
      <div className="emptyStateIcon">＋</div>

      <h3>{title}</h3>

      <p>{description}</p>

      <Link href={href} className="emptyStateButton">
        {buttonText}
      </Link>
    </div>
  );
}