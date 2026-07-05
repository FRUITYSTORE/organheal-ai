import Link from "next/link";
import PageLayout from "@/app/components/navigation/PageLayout";

const reportLearningSteps = [
  {
    title: "Find the key result",
    text: "Start with the marker or finding that looks most important or abnormal.",
  },
  {
    title: "Understand what it means",
    text: "Learn what the result may suggest and why one number is not enough alone.",
  },
  {
    title: "Connect it to your body",
    text: "Relate the result to organs, symptoms, lifestyle, and follow-up needs.",
  },
  {
    title: "Prepare your next question",
    text: "Turn the report into clear questions for your doctor or next visit.",
  },
];

export default function ReportLearningPage() {
  return (
    <main className="ohPageShell">
      <PageLayout
        backHref="/library"
        backLabel="← Back to Learning"
        eyebrow="Understand my report"
        title="Turn your report into clear learning steps."
        description="OrganHeal will help you move from uploaded reports to simple explanations, related topics, and better doctor questions."
        actions={[
          { href: "/reports", label: "Open My Reports" },
          { href: "/lab-upload", label: "Upload Report", variant: "secondary" },
        ]}
      >
        <section className="ohGrid cols2">
          {reportLearningSteps.map((step, index) => (
            <article className="ohCard" key={step.title}>
              <p className="ohMetricLabel">Step {index + 1}</p>
              <h2 className="ohCardTitle">{step.title}</h2>
              <p className="ohCardText">{step.text}</p>
            </article>
          ))}
        </section>

        <section className="ohActionPanel">
          <div>
            <p className="ohMetricLabel">Next phase</p>
            <h2 className="ohCardTitle">Report-based learning will become personalized.</h2>
            <p className="ohCardText">
              Later, this page will recommend learning modules based on the markers found in your uploaded reports.
            </p>
          </div>
        </section>
      </PageLayout>
    </main>
  );
}