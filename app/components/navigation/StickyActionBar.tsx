import Link from "next/link";

type StickyAction = {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
};

type StickyActionBarProps = {
  actions: StickyAction[];
};

export default function StickyActionBar({
  actions,
}: StickyActionBarProps) {
  if (actions.length === 0) return null;

  return (
    <div
      style={{
        position: "sticky",
        bottom: 16,
        zIndex: 40,
        marginTop: 32,
      }}
    >
      <div
        className="ohCard"
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
          backdropFilter: "blur(12px)",
        }}
      >
        {actions.map((action) => (
          <Link
            key={action.href + action.label}
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
    </div>
  );
}