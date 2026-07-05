import Link from "next/link";
import PageLayout from "@/app/components/navigation/PageLayout";

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
      <PageLayout
        backHref="/library"
        backLabel="← Back to Learning"
        eyebrow="Prepare for your doctor"
        title="Go to your visit with clearer questions."
        description="OrganHeal helps you organize what to ask, what to bring, and what to confirm before leaving the clinic."
      >
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
      </PageLayout>
    </main>
  );
}