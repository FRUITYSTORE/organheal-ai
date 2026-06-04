export default function Home() {
  return (
    <main className="homepage">
      <section className="hero">
        <div className="badge">AI-Powered Health Intelligence</div>

        <h1>OrganHeal AI</h1>

        <p className="tagline">
          Understand Your Body. Empower Your Health.
        </p>

        <p className="description">
          AI-powered health intelligence platform designed to help people
          understand organ health, interpret laboratory results, and access
          trusted evidence-based medical knowledge.
        </p>

        <div className="buttons">
          <a href="/assistant">
            <button className="primaryBtn">Start AI Assessment</button>
          </a>

          <a href="/organ-report">
            <button className="secondaryBtn">View Report</button>
          </a>
        </div>
      </section>

      <section className="reportGrid">
        <div className="reportCard">
          <h3>🧠 AI Assistant</h3>
          <span>24/7</span>
          <p>Educational health conversations.</p>
        </div>

        <div className="reportCard">
          <h3>❤️ Organ Assessments</h3>
          <span>3</span>
          <p>Heart, Lung, and Kidney currently active.</p>
        </div>

        <div className="reportCard">
          <h3>📚 Medical Library</h3>
          <span>6+</span>
          <p>Trusted medical education topics.</p>
        </div>
      </section>
    </main>
  );
}