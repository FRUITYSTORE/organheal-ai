export default function Home() {
  return (
    <main className="homepage">
      <section className="hero">
        <div className="badge">AI-Powered Health Intelligence</div>

        <h1>OrganHeal AI</h1>

        <p className="tagline">Understand Your Body. Empower Your Health.</p>

        <p className="description">
          AI-powered health intelligence platform designed to help people
          understand organ health, interpret laboratory results, track health
          trends, and access trusted medical education.
        </p>

        <div className="buttons">
          <a href="/dashboard">
            <button className="primaryBtn">Open Dashboard</button>
          </a>

          <a href="/assessment">
            <button className="secondaryBtn">Start Assessment</button>
          </a>

          <a href="/organ-report">
            <button className="secondaryBtn">View Report</button>
          </a>
        </div>
      </section>

      <section className="reportGrid">
        <a href="/assistant" style={{ textDecoration: "none" }}>
          <div className="reportCard">
            <h3>🧠 AI Assistant</h3>
            <span>24/7</span>
            <p>Educational health conversations and guided health questions.</p>
          </div>
        </a>

        <a href="/assessment" style={{ textDecoration: "none" }}>
          <div className="reportCard">
            <h3>❤️ Organ Assessments</h3>
            <span>6</span>
            <p>Heart, Lung, Kidney, Liver, Brain, and Metabolic modules.</p>
          </div>
        </a>

        <a href="/lab-analyzer" style={{ textDecoration: "none" }}>
          <div className="reportCard">
            <h3>🧪 Lab Analyzer</h3>
            <span>Score</span>
            <p>Analyze key lab values and generate a lab health score.</p>
          </div>
        </a>

        <a href="/dashboard" style={{ textDecoration: "none" }}>
          <div className="reportCard">
            <h3>📊 Dashboard</h3>
            <span>Live</span>
            <p>View your overall score, AI insights, and priority alerts.</p>
          </div>
        </a>

        <a href="/history" style={{ textDecoration: "none" }}>
          <div className="reportCard">
            <h3>📈 Health History</h3>
            <span>Trends</span>
            <p>Track saved results and follow your health score over time.</p>
          </div>
        </a>

        <a href="/library" style={{ textDecoration: "none" }}>
          <div className="reportCard">
            <h3>📚 Medical Library</h3>
            <span>6+</span>
            <p>Trusted medical education topics and health knowledge.</p>
          </div>
        </a>

        <a href="/organ-report" style={{ textDecoration: "none" }}>
          <div className="reportCard">
            <h3>📄 Health Report</h3>
            <span>PDF</span>
            <p>Generate a professional health intelligence PDF report.</p>
          </div>
        </a>

        <a href="/profile" style={{ textDecoration: "none" }}>
          <div className="reportCard">
            <h3>👤 Profile</h3>
            <span>Account</span>
            <p>Access your account summary and quick health actions.</p>
          </div>
        </a>
      </section>
    </main>
  );
}