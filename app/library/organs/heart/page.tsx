import Link from "next/link";

const modules = [
  {
    title: "Cholesterol basics",
    text: "Understand LDL, HDL, triglycerides, and why one number is not enough.",
    status: "Start here",
  },
  {
    title: "Blood pressure and heart risk",
    text: "Learn how pressure, vessels, lifestyle, and follow-up connect.",
    status: "Next",
  },
  {
    title: "Food and daily habits",
    text: "Small actions that support heart health without overwhelming the user.",
    status: "Practical",
  },
];

const doctorQuestions = [
  "Which result matters most in my case?",
  "Do I need lifestyle changes, medicine, or repeat testing?",
  "When should I repeat my cholesterol or blood pressure checks?",
];

const dailyActions = [
  "Review one heart marker.",
  "Write one question for your doctor.",
  "Choose one small habit to improve this week.",
];

export default function HeartLearningWorkspacePage() {
  return (
    <main className="ohPageShell heartLearningPage">
      <style>{`
        .heartLearningPage .ohHero {
          background: linear-gradient(135deg, #062f2f, #0f766e) !important;
          color: #ffffff !important;
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 28px 70px rgba(15, 118, 110, 0.24);
        }

        .heartLearningPage .ohHero .ohEyebrow,
        .heartLearningPage .ohHero .ohTitle,
        .heartLearningPage .ohHero .ohLead {
          color: #ffffff !important;
        }

        .heartLearningPage .ohCard {
          border: 1px solid rgba(15, 23, 42, 0.16);
          box-shadow: 0 20px 48px rgba(15, 23, 42, 0.12);
        }

        .heartLearningPage .ohMetricLabel {
          color: #0f766e !important;
          font-weight: 950;
        }

        .heartLearningPage .secondaryBtn {
          border-color: rgba(15, 118, 110, 0.45) !important;
          color: #0f766e !important;
          font-weight: 950;
        }
      `}</style>
      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <div className="ohButtonRow">
          <Link href="/library/organs" className="secondaryBtn">
            ← Back to Organs
          </Link>
        </div>

        <section className="ohHero">
          <p className="ohEyebrow">Heart learning workspace</p>
          <h1 className="ohTitle">Understand your heart health step by step.</h1>
          <p className="ohLead">
            Start with cholesterol, blood pressure, daily habits, and doctor questions. Keep it simple and focus on one topic at a time.
          </p>

          <div className="ohButtonRow" style={{ marginTop: "24px" }}>
            <Link href="/blog?marker=LDL" className="primaryBtn">
              Start with LDL
            </Link>

            <Link href="/heart" className="secondaryBtn">
              Open Heart Page
            </Link>
          </div>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">Learning progress</p>
              <h2 className="ohCardTitle">Heart learning path</h2>
              <p className="ohCardText">
                This is the first version of a guided learning path. Later, OrganHeal will personalize this based on your reports.
              </p>
            </div>

            <span className="ohStatusBadge good">25%</span>
          </div>

          <div style={{ height: "12px", borderRadius: "999px", background: "rgba(15, 118, 110, 0.12)", overflow: "hidden" }}>
            <div style={{ width: "25%", height: "100%", background: "#0f766e", borderRadius: "999px" }} />
          </div>
        </section>

        <section className="ohGrid cols3">
          {modules.map((module) => (
            <article className="ohCard" key={module.title}>
              <p className="ohMetricLabel">{module.status}</p>
              <h2 className="ohCardTitle">{module.title}</h2>
              <p className="ohCardText">{module.text}</p>

              <Link href="/blog" className="secondaryBtn" style={{ marginTop: "18px", justifyContent: "center" }}>
                Open Module
              </Link>
            </article>
          ))}
        </section>

        <section className="ohGrid cols2">
          <article className="ohCard">
            <p className="ohMetricLabel">Doctor questions</p>
            <h2 className="ohCardTitle">Ask better questions</h2>

            <div className="ohStack" style={{ marginTop: "16px" }}>
              {doctorQuestions.map((question) => (
                <p className="ohCardText" key={question}>• {question}</p>
              ))}
            </div>
          </article>

          <article className="ohCard">
            <p className="ohMetricLabel">Daily actions</p>
            <h2 className="ohCardTitle">Keep it simple</h2>

            <div className="ohStack" style={{ marginTop: "16px" }}>
              {dailyActions.map((action) => (
                <p className="ohCardText" key={action}>• {action}</p>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}