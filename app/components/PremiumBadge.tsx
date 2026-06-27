type PremiumBadgeProps = {
  label?: string;
};

export default function PremiumBadge({
  label = "OrganHeal Plus",
}: PremiumBadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        width: "fit-content",
        padding: "5px 10px",
        borderRadius: "999px",
        background: "rgba(34,211,238,0.12)",
        border: "1px solid rgba(34,211,238,0.28)",
        color: "#67e8f9",
        fontSize: "0.78rem",
        fontWeight: 700,
        letterSpacing: "0.02em",
      }}
    >
      ⭐ {label}
    </span>
  );
}