type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export default function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
}: SectionHeaderProps) {
  return (
    <div
      className="sectionHeader"
      style={{
        textAlign: align,
      }}
    >
      {eyebrow && (
        <p
          style={{
            color: "#0891b2",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            marginBottom: 8,
          }}
        >
          {eyebrow}
        </p>
      )}

      <h2>{title}</h2>

      {description && (
        <p
          style={{
            color: "#475569",
            lineHeight: 1.7,
            marginTop: 10,
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}