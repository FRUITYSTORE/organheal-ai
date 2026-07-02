import Link from "next/link";

const organs = [
  {
    name: "Heart",
    text: "Learn about cholesterol, blood pressure, circulation, and heart risk.",
    href: "/library/organs/heart",
  },
  {
    name: "Kidney",
    text: "Understand creatinine, eGFR, urine markers, hydration, and kidney signals.",
    href: "/kidney",
  },
  {
    name: "Liver",
    text: "Learn about ALT, AST, bilirubin, liver function, and follow-up questions.",
    href: "/liver",
  },
  {
    name: "Lung",
    text: "Understand breathing, oxygen, symptoms, and respiratory health basics.",
    href: "/lung",
  },
  {
    name: "Brain",
    text: "Learn about sleep, mood, focus, headaches, and nervous system health.",
    href: "/brain",
  },
  {
    name: "Metabolic",
    text: "Understand glucose, HbA1c, weight, energy, and metabolic health patterns.",
    href: "/metabolic",
  },
];

export default function OrganLearningPage() {
  return (
    <main className="ohPageShell">
      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <div className="ohButtonRow">
          <Link href="/library" className="secondaryBtn">
            ← Back to Learning
          </Link>
        </div>

        <section className="ohHero">
          <p className="ohEyebrow">Learn by organ</p>
          <h1 className="ohTitle">Choose the body system you want to understand.</h1>
          <p className="ohLead">
            Start with one area. OrganHeal will later connect each organ to short modules, lab markers, reports, and doctor questions.
          </p>
        </section>

        <section className="ohGrid cols3">
          {organs.map((organ) => (
            <article className="ohCard" key={organ.name}>
              <p className="ohMetricLabel">Organ learning</p>
              <h2 className="ohCardTitle">{organ.name}</h2>
              <p className="ohCardText">{organ.text}</p>

              <Link
                href={organ.href}
                className="secondaryBtn"
                style={{ marginTop: "18px", justifyContent: "center" }}
              >
                Open {organ.name}
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}