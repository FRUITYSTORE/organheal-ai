import Link from "next/link";

const learningPath = [
  {
    step: "01",
    title: "LDL Cholesterol",
    text: "Understand what LDL means and why it matters for heart risk.",
    href: "/blog?marker=LDL",
    status: "Start here",
  },
  {
    step: "02",
    title: "HDL and Triglycerides",
    text: "Learn how cholesterol numbers work together, not alone.",
    href: "/blog",
    status: "Next",
  },
  {
    step: "03",
    title: "Blood Pressure",
    text: "Understand how pressure affects the heart and blood vessels.",
    href: "/blog",
    status: "Next",
  },
  {
    step: "04",
    title: "Daily Habits",
    text: "Focus on small habits that support heart health.",
    href: "/blog",
    status: "Practical",
  },
];

const doctorQuestions = [
  "Which result matters most in my case?",
  "Do I need lifestyle changes, medication, or repeat testing?",
  "When should I repeat my cholesterol or blood pressure checks?",
];

const dailyMissions = [
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
        .heartLearningPage .ohHero .ohLead,
        .heartLearningPage .ohHero .ohMetricLabel,
        .heartLearningPage .ohHero .ohCardTitle,
        .heartLearningPage .ohHero .ohCardText {
          color: #ffffff !important;
        }

        .heartLearningPage .ohHero .ohCard {
          background: rgba(255,255,255,0.10) !important;
          border: 1px solid rgba(255,255,255,0.18) !important;
          box-shadow: none !important;
        }

        .heartLearningPage .ohHero .primaryBtn {
          background: #22d3ee !important;
          color: #062f2f !important;
          border: 0 !important;
          font-weight: 950 !important;
          box-shadow: 0 16px 34px rgba(34, 211, 238, 0.28) !important;
        }

        .heartLearningPage .ohHero .secondaryBtn {
          background: rgba(255, 255, 255, 0.12) !important;
          color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.30) !important;
          font-weight: 950 !important;
          box-shadow: none !important;
        }

        .heartLearningPage .ohCard {
          border: 1px solid rgba(15, 23, 42, 0.16);
          box-shadow: 0 20px 48px rgba(15, 23, 42, 0.12);
        }

        .heartLearningPage .learningPathItem {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 16px;
          align-items: center;
        }

        .heartLearningPage .learningPathItem .secondaryBtn {
          background: linear-gradient(135deg, #0f766e, #0891b2) !important;
          color: #ffffff !important;
          border: 0 !important;
          font-weight: 950 !important;
          box-shadow: 0 14px 28px rgba(15, 118, 110, 0.22) !important;
        }

        .heartLearningPage .stepMark {
          display: inline-flex;
          width: 46px;
          height: 46px;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: #0f766e;
          color: #ffffff;
          font-weight: 950;
        }

        @media (max-width: 760px) {
          .heartLearningPage .learningPathItem {
            grid-template-columns: 1fr;
          }
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
          <h1 className="ohTitle">Start with one heart lesson today.</h1>
          <p className="ohLead">
            Focus on LDL first. It is the best starting point for understanding cholesterol and heart risk.
          </p>

          <div className="ohGrid cols3" style={{ marginTop: "24px" }}>
            <article className="ohCard">
              <p className="ohMetricLabel">Today&apos;s lesson</p>
              <h2 className="ohCardTitle">LDL Cholesterol</h2>
              <p className="ohCardText">Understand what LDL means and why it matters.</p>
            </article>

            <article className="ohCard">
              <p className="ohMetricLabel">Estimated time</p>
              <h2 className="ohCardTitle">4 minutes</h2>
              <p className="ohCardText">Short, focused, and easy to complete.</p>
            </article>

            <article className="ohCard">
              <p className="ohMetricLabel">Difficulty</p>
              <h2 className="ohCardTitle">Easy</h2>
              <p className="ohCardText">Made for patients and families.</p>
            </article>
          </div>

          <div className="ohButtonRow" style={{ marginTop: "24px" }}>
            <Link href="/blog?marker=LDL" className="primaryBtn">
              Start Lesson
            </Link>

            <Link href="/heart" className="secondaryBtn">
              Open Heart Page
            </Link>
          </div>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">Knowledge progress</p>
              <h2 className="ohCardTitle">Heart learning progress</h2>
              <p className="ohCardText">Your guided heart learning path starts here.</p>
            </div>

            <span className="ohStatusBadge good">25%</span>
          </div>

          <div style={{ height: "12px", borderRadius: "999px", background: "rgba(15, 118, 110, 0.12)", overflow: "hidden" }}>
            <div style={{ width: "25%", height: "100%", background: "#0f766e", borderRadius: "999px" }} />
          </div>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">Learning path</p>
              <h2 className="ohCardTitle">Follow the heart path step by step</h2>
              <p className="ohCardText">Start with LDL, then continue to pressure and daily habits.</p>
            </div>
          </div>

          <div className="ohStack">
            {learningPath.map((item) => (
              <article className="ohCard learningPathItem" key={item.title}>
                <span className="stepMark">{item.step}</span>

                <div>
                  <p className="ohMetricLabel">{item.status}</p>
                  <h3 className="ohCardTitle">{item.title}</h3>
                  <p className="ohCardText">{item.text}</p>
                </div>

                <Link href={item.href} className="secondaryBtn">
                  Open
                </Link>
              </article>
            ))}
          </div>
        </section>


        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">Short lesson video</p>
              <h2 className="ohCardTitle">Understanding LDL</h2>
              <p className="ohCardText">
                A short lesson space for a future AI video that explains LDL in simple language.
              </p>
            </div>

            <span className="ohStatusBadge neutral">4 min</span>
          </div>

          <div className="ohActionPanel" style={{ marginTop: "18px" }}>
            <div>
              <p className="ohMetricLabel">Coming next</p>
              <h3 className="ohCardTitle">Video lesson placeholder</h3>
              <p className="ohCardText">
                This area will later hold a short video, audio explanation, or animated lesson.
              </p>
            </div>

            <Link href="/blog?marker=LDL" className="primaryBtn">
              Read LDL Lesson
            </Link>
          </div>
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
            <p className="ohMetricLabel">Today&apos;s mission</p>
            <h2 className="ohCardTitle">Keep it simple</h2>

            <div className="ohStack" style={{ marginTop: "16px" }}>
              {dailyMissions.map((action) => (
                <p className="ohCardText" key={action}>• {action}</p>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}