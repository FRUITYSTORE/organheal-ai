import Link from "next/link";

export type LearningPathItem = {
  step: string;
  status: string;
  title: string;
  description: string;
  href: string;
  buttonLabel: string;
};

type LearningPathProps = {
  label: string;
  title: string;
  description: string;
  items: LearningPathItem[];
};

export default function LearningPath({
  label,
  title,
  description,
  items,
}: LearningPathProps) {
  return (
    <section className="ohCard">
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">{label}</p>

          <h2 className="ohCardTitle">{title}</h2>

          <p className="ohCardText">{description}</p>
        </div>
      </div>

      <div className="ohStack">
        {items.map((item) => (
          <article
            key={item.step}
            className="ohCard learningPathItem"
          >
            <span className="stepMark">
              {item.step}
            </span>

            <div>
              <p className="ohMetricLabel">
                {item.status}
              </p>

              <h3 className="ohCardTitle">
                {item.title}
              </h3>

              <p className="ohCardText">
                {item.description}
              </p>
            </div>

            <Link
              href={item.href}
              className="secondaryBtn"
            >
              {item.buttonLabel}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}