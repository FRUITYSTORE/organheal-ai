import Link from "next/link";

export type PageAction = {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
};

type PageActionsProps = {
  actions: PageAction[];
};

export default function PageActions({
  actions,
}: PageActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div
      className="ohButtonRow"
      style={{ marginTop: "24px" }}
    >
      {actions.map((action) => (
        <Link
          key={`${action.href}-${action.label}`}
          href={action.href}
          className={
            action.variant === "secondary"
              ? "secondaryBtn"
              : "primaryBtn"
          }
        >
          {action.label}
        </Link>
      ))}
    </div>
  );
}