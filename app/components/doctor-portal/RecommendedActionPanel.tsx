import Link from "next/link";

type RecommendedActionPanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  buttonText: string;
};

export default function RecommendedActionPanel({
  eyebrow,
  title,
  description,
  href,
  buttonText,
}: RecommendedActionPanelProps) {
  return (
    <section className="ohActionPanel">
      <div className="ohCardHeader" style={{ marginBottom: 0 }}>
        <div>
          <p className="ohMetricLabel">{eyebrow}</p>

          <h2 className="ohCardTitle" style={{ fontSize: "1.55rem" }}>
            {title}
          </h2>

          <p className="ohCardText">{description}</p>
        </div>

        <Link href={href} className="primaryBtn">
          {buttonText}
        </Link>
      </div>
    </section>
  );
}