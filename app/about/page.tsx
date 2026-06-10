import Link from "next/link";

export default function AboutPage() {
  const modules = [
    "Heart Intelligence",
    "Lung Intelligence",
    "Kidney Intelligence",
    "Liver Intelligence",
    "Brain Intelligence",
    "Metabolic Intelligence",
    "Lab Intelligence",
    "Health Forecast Engine",
  ];

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <section className="assistantHeader">
          <p className="assistantBadge">ABOUT ORGANHEAL AI</p>

          <h1>AI-Powered Health Intelligence</h1>

          <p>
            OrganHeal AI is designed to help users understand organ health,
            interpret wellness signals, track health trends, and receive
            structured health education through intelligent digital tools.
          </p>

          <div className="buttons">
            <Link href="/dashboard">
              <button className="primaryBtn">Open Dashboard</button>
            </Link>

            <Link href="/assessment">
              <button className="secondaryBtn">Start Assessment</button>
            </Link>
          </div>
        </section>

        <section className="chatWindow">
          <div className="resultBox">
            <p className="sectionLabel">OUR MISSION</p>
            <h2>Making health data easier to understand</h2>

            <p>
              OrganHeal AI transforms personal health inputs into clear,
              organized, and educational insights. The platform focuses on organ
              health, daily wellness, lab interpretation, health planning, and
              long-term tracking.
            </p>
          </div>

          <div className="resultBox">
            <p className="sectionLabel">WHY ORGANHEAL</p>
            <h2>Built for practical health intelligence</h2>

            <div className="aboutGrid">
              <div className="aboutCard">
                <h3>Personalized Insights</h3>
                <p>
                  Health scores and recommendations are generated from user
                  inputs across assessments, check-ins, labs, and health goals.
                </p>
              </div>

              <div className="aboutCard">
                <h3>Organ Monitoring</h3>
                <p>
                  The platform tracks major organ systems including heart, lung,
                  kidney, liver, brain, and metabolic health.
                </p>
              </div>

              <div className="aboutCard">
                <h3>Health Education</h3>
                <p>
                  OrganHeal presents information in a simple way to help users
                  understand their health patterns and possible risk areas.
                </p>
              </div>

              <div className="aboutCard">
                <h3>Lab Interpretation</h3>
                <p>
                  Lab values and uploaded reports can support a broader health
                  intelligence profile.
                </p>
              </div>
            </div>
          </div>

          <div className="resultBox">
            <p className="sectionLabel">OUR VISION</p>
            <h2>From health assessment to health intelligence</h2>

            <p>
              OrganHeal AI is being developed as a full health intelligence
              platform, not only an assessment tool. The goal is to combine
              organ assessments, daily check-ins, lab analysis, health goals,
              personalized plans, and professional reports into one connected
              experience.
            </p>
          </div>

          <div className="resultBox">
            <p className="sectionLabel">CORE MODULES</p>
            <h2>What OrganHeal AI includes</h2>

            <div className="aboutModuleGrid">
              {modules.map((module) => (
                <div key={module} className="aboutModuleCard">
                  {module}
                </div>
              ))}
            </div>
          </div>

          <div className="resultBox">
            <p className="sectionLabel">TRUST & PRIVACY</p>
            <h2>Designed with user protection in mind</h2>

            <div className="aboutGrid">
              <div className="aboutCard">
                <h3>Secure Authentication</h3>
                <p>
                  User access is protected through authentication before private
                  dashboard data is displayed.
                </p>
              </div>

              <div className="aboutCard">
                <h3>User Data Ownership</h3>
                <p>
                  The platform is structured around the user's own health
                  profile, assessments, goals, and reports.
                </p>
              </div>

              <div className="aboutCard">
                <h3>Organized Health Records</h3>
                <p>
                  Assessments, daily check-ins, lab insights, and reports are
                  connected into a cleaner digital health timeline.
                </p>
              </div>

              <div className="aboutCard">
                <h3>Educational Purpose</h3>
                <p>
                  OrganHeal AI supports health awareness and education. It does
                  not replace medical diagnosis or professional care.
                </p>
              </div>
            </div>
          </div>

          <div className="resultBox">
            <p className="sectionLabel">GET STARTED</p>
            <h2>Start building your health intelligence profile</h2>

            <p>
              Begin with an organ assessment, complete a daily check-in, or open
              your dashboard to review your latest health insights.
            </p>

            <div className="buttons">
              <Link href="/assessment">
                <button className="primaryBtn">Start Assessment</button>
              </Link>

              <Link href="/dashboard">
                <button className="secondaryBtn">Open Dashboard</button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}