export default function Home() {
  return (
    <main className="homepage">
      <section className="hero">
        <div className="badge">AI-Powered Health Intelligence</div>

        <h1 className="heroTitle">OrganHeal AI</h1>

        <p className="heroTagline">
          Understand Your Body. Empower Your Health.
        </p>

        <p className="heroDescription">
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

      <section className="features">
        <div className="sectionHeader">
          <p className="sectionLabel">How It Works</p>
          <h2>From Assessment to Health Intelligence</h2>
        </div>

        <div className="featureGrid">
          <div className="featureCard">
            <div className="iconBox">📝</div>
            <h3>1. Complete Assessments</h3>
            <p>
              Answer guided questions for heart, lung, kidney, liver, brain,
              and metabolic health.
            </p>
          </div>

          <div className="featureCard">
            <div className="iconBox">🧪</div>
            <h3>2. Analyze Lab Values</h3>
            <p>
              Enter key lab results and receive an educational lab health score.
            </p>
          </div>

          <div className="featureCard">
            <div className="iconBox">📊</div>
            <h3>3. View Insights</h3>
            <p>
              See your dashboard, trends, priority alerts, and AI health
              insights.
            </p>
          </div>
        </div>
      </section>

      <section className="reportGrid">
        <a href="/assistant" style={{ textDecoration: "none" }}>
          <div className="reportCard clickableCard">
            <h3>🧠 AI Assistant</h3>
            <span>24/7</span>
            <p>Educational health conversations and guided health questions.</p>
          </div>
        </a>

        <a href="/assessment" style={{ textDecoration: "none" }}>
          <div className="reportCard clickableCard">
            <h3>❤️ Organ Assessments</h3>
            <span>6</span>
            <p>Heart, Lung, Kidney, Liver, Brain, and Metabolic modules.</p>
          </div>
        </a>

        <a href="/lab-analyzer" style={{ textDecoration: "none" }}>
          <div className="reportCard clickableCard">
            <h3>🧪 Lab Analyzer</h3>
            <span>Score</span>
            <p>Analyze key lab values and generate a lab health score.</p>
          </div>
        </a>

        <a href="/lab-upload" style={{ textDecoration: "none" }}>
          <div className="reportCard clickableCard">
            <h3>📄 PDF Analyzer</h3>
            <span>Upload</span>
            <p>Upload PDF or photo lab reports for future AI-powered analysis.</p>
          </div>
        </a>

        <a href="/dashboard" style={{ textDecoration: "none" }}>
          <div className="reportCard clickableCard">
            <h3>📊 Dashboard</h3>
            <span>Live</span>
            <p>View your overall score, AI insights, and priority alerts.</p>
          </div>
        </a>

        <a href="/history" style={{ textDecoration: "none" }}>
          <div className="reportCard clickableCard">
            <h3>📈 Health History</h3>
            <span>Trends</span>
            <p>Track saved results and follow your health score over time.</p>
          </div>
        </a>

        <a href="/library" style={{ textDecoration: "none" }}>
          <div className="reportCard clickableCard">
            <h3>📚 Medical Library</h3>
            <span>6+</span>
            <p>Trusted medical education topics and health knowledge.</p>
          </div>
        </a>

        <a href="/organ-report" style={{ textDecoration: "none" }}>
          <div className="reportCard clickableCard">
            <h3>📄 Health Report</h3>
            <span>PDF</span>
            <p>Generate a professional health intelligence PDF report.</p>
          </div>
        </a>

        <a href="/profile" style={{ textDecoration: "none" }}>
          <div className="reportCard clickableCard">
            <h3>👤 Profile</h3>
            <span>Account</span>
            <p>Access your account summary and quick health actions.</p>
          </div>
        </a>
      </section>

      <section className="trustSection">
        <div className="trustBox">
          <p className="sectionLabel">Important Medical Disclaimer</p>
          <h2>Educational Health Intelligence, Not Diagnosis</h2>
          <p>
            OrganHeal AI is designed for education, wellness tracking, and
            health awareness. It does not diagnose disease, replace a licensed
            healthcare professional, or provide emergency medical advice.
          </p>
        </div>
      </section>

      <section className="homeCTA">
        <h2>Start your health intelligence journey today</h2>
        <p>
          Track your scores, understand your trends, and generate your health
          report.
        </p>

        <div className="buttons">
          <a href="/dashboard">
            <button className="primaryBtn">Open Dashboard</button>
          </a>

          <a href="/assessment">
            <button className="secondaryBtn">Start Assessment</button>
          </a>
        </div>
      </section>
    </main>
  );
}