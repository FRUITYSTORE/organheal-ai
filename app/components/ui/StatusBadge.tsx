type StatusBadgeTone = "good" | "moderate" | "risk" | "neutral";

type StatusBadgeProps = {
  tone?: StatusBadgeTone | string;
  children: React.ReactNode;
};

export default function StatusBadge({
  tone = "neutral",
  children,
}: StatusBadgeProps) {
  return <span className={`ohStatusBadge ${tone}`}>{children}</span>;
}