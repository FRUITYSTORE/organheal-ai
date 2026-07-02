import Link from "next/link";

const prepSteps = [
  {
    title: "Know your main concern",
    text: "Write the one health question you most want answered.",
  },
  {
    title: "Bring your recent reports",
    text: "Keep lab results, imaging reports, medications, and discharge summaries ready.",
  },
  {
    title: "Ask clear questions",
    text: "Focus on what changed, what it means, and what you should do next.",
  },
  {
    title: "Confirm the follow-up plan",
    text: "Ask when to repeat tests, when to seek urgent help, and what signs to monitor.",
  },
];

export default function DoctorPrepLearningPage() {
  return (
    <main className="ohPageShell">
      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <div className="ohButtonRow">
          <Link href="/library" className="secondaryBtn">
            ← Back to Learning
          </Link>
        </div>

        <section className="ohHero">
          <p className="ohEyebrow">Prepare for your doctor</p>
          <h1 className="ohTitle">Go to your visit with clearer questions.</h1>
          <p className="ohLead">
            OrganHeal helps you organize what to ask, what to bring, and what to confirm before leaving the clinic.
          </p>
        </section>

        <section className="ohGrid cols2">
          {prepSteps.map((step, index) => (
            <article className="ohCard" key={step.title}>
              <p className="ohMetricLabel">Step {index + 1}</p>
              <h2 className="ohCardTitle">{step.title}</h2>
              <p className="ohCardText">{step.text}</p>
            </article>
          ))}
        </section>

        <section className="ohActionPanel">
          <div>
            <p className="ohMetricLabel">Next</p>
            <h2 className="ohCardTitle">Use your reports to prepare better questions.</h2>
            <p className="ohCardText">
              Later, OrganHeal will generate doctor questions from your uploaded reports and health plan.
            </p>
          </div>

          <Link href="/reports" className="primaryBtn">
            Open Reports
          </Link>
        </section>
      </div>
    </main>
  );
}