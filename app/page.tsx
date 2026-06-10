export default function Home() {
  const schema = {
  "@context": "https://schema.org",
  "@type": "MedicalWebPage",
  name: "OrganHeal AI",
  description:
    "AI-powered health intelligence platform for organ health assessment, laboratory interpretation, and personalized health insights.",
  url: "https://organheal.com",
  publisher: {
    "@type": "Organization",
    name: "OrganHeal AI",
    url: "https://organheal.com",
  },
};
  return (
    <main className="homepage">
      <script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(schema),
  }}
/>
      <section className="hero">
        <div className="badge">AI-Powered Health Intelligence Platform</div>

        <h1 className="heroTitle">OrganHeal</h1>

        <p className="heroTagline">
          Turn health data into clear, actionable insight.
        </p>

        <p className="heroDescription">
          OrganHeal helps you track organ wellness, understand lab results,
          monitor daily health patterns, generate professional reports, and
          follow personalized improvement plans.
        </p>

        <div className="buttons">
          <a href="/assessment">
            <button className="primaryBtn">Start Free Assessment</button>
          </a>

          <a href="/dashboard">
            <button className="secondaryBtn">Open Dashboard</button>
          </a>

          <a href="/checkin">
            <button className="secondaryBtn">Daily Check-In</button>
          </a>
        </div>
      </section>

      <section className="features">
        <div className="sectionHeader">
          <p className="sectionLabel">Why OrganHeal</p>
          <h2>One platform for health awareness, trends, and action</h2>
        </div>

        <div className="featureGrid">
          <div className="featureCard">
            <div className="iconBox">📊</div>
            <h3>Health Intelligence Dashboard</h3>
            <p>
              See your overall health score, priority area, daily wellness,
              health mission, and personalized guidance in one focused view.
            </p>
          </div>

          <div className="featureCard">
            <div className="iconBox">🧪</div>
            <h3>Lab & Wellness Tracking</h3>
            <p>
              Track lab scores, daily check-ins, organ assessments, and health
              history over time.
            </p>
          </div>

          <div className="featureCard">
            <div className="iconBox">🎯</div>
            <h3>Personalized Health Plan</h3>
            <p>
              Follow a 4-week improvement plan based on your current priority
              area, health goals, and wellness patterns.
            </p>
          </div>
        </div>
      </section>

      <section className="reportGrid">
        <a href="/dashboard" style={{ textDecoration: "none" }}>
          <div className="reportCard clickableCard">
            <h3>📊 Dashboard</h3>
            <span>Live</span>
            <p>View your health score, mission, check-in, and AI guidance.</p>
          </div>
        </a>

        <a href="/health-plan" style={{ textDecoration: "none" }}>
          <div className="reportCard clickableCard">
            <h3>🎯 Health Plan</h3>
            <span>4 Weeks</span>
            <p>Follow a personalized improvement roadmap based on your results.</p>
          </div>
        </a>

        <a href="/history" style={{ textDecoration: "none" }}>
          <div className="reportCard clickableCard">
            <h3>📈 Health History</h3>
            <span>Trends</span>
            <p>Review progress charts, forecasts, milestones, and goals.</p>
          </div>
        </a>

        <a href="/organ-report" style={{ textDecoration: "none" }}>
          <div className="reportCard clickableCard">
            <h3>📄 Professional Report</h3>
            <span>PDF</span>
            <p>Generate a professional health intelligence report.</p>
          </div>
        </a>

        <a href="/lab-analyzer" style={{ textDecoration: "none" }}>
          <div className="reportCard clickableCard">
            <h3>🧪 Lab Analyzer</h3>
            <span>Score</span>
            <p>Analyze key lab values and receive educational insights.</p>
          </div>
        </a>

        <a href="/assistant" style={{ textDecoration: "none" }}>
          <div className="reportCard clickableCard">
            <h3>🤖 AI Assistant</h3>
            <span>Guide</span>
            <p>Ask educational health questions and receive guided support.</p>
          </div>
        </a>
      </section>

      <section className="features">
        <div className="sectionHeader">
          <p className="sectionLabel">How It Works</p>
          <h2>From assessment to health intelligence</h2>
        </div>

        <div className="featureGrid">
          <div className="featureCard">
            <div className="iconBox">1</div>
            <h3>Complete Assessments</h3>
            <p>
              Start with guided educational assessments and daily wellness
              check-ins.
            </p>
          </div>

          <div className="featureCard">
            <div className="iconBox">2</div>
            <h3>Understand Your Trends</h3>
            <p>
              Review your history, progress charts, milestones, health goals,
              and forecast insights.
            </p>
          </div>

          <div className="featureCard">
            <div className="iconBox">3</div>
            <h3>Take Action</h3>
            <p>
              Use your health plan, daily mission, and professional PDF report
              to support better health conversations.
            </p>
          </div>
        </div>
      </section>

      <section className="trustSection">
        <div className="trustBox">
          <p className="sectionLabel">Important Medical Disclaimer</p>
          <h2>Educational health intelligence, not diagnosis</h2>
          <p>
            OrganHeal is designed for education, wellness tracking, and health
            awareness. It does not diagnose disease, replace a licensed
            healthcare professional, or provide emergency medical advice.
          </p>
        </div>
      </section>

      <section className="homeCTA">
        <h2>Start building your health intelligence profile</h2>
        <p>
          Complete your first assessment, track your daily wellness, and unlock
          your personalized dashboard.
        </p>

        <div className="buttons">
          <a href="/assessment">
            <button className="primaryBtn">Start Assessment</button>
          </a>

          <a href="/dashboard">
            <button className="secondaryBtn">View Dashboard</button>
          </a>
        </div>
      </section>
    </main>
  );
}