export default function LibraryPage() {
  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">MEDICAL LIBRARY</p>

          <h1>Trusted Medical Knowledge</h1>

          <p>
            Explore evidence-based health topics designed to help people better
            understand their bodies, lab results, and organ health.
          </p>
        </div>

        <div className="featureGrid">
          <div className="featureCard">
            <div className="iconBox">❤️</div>
            <h3>Understanding Cholesterol</h3>
            <p>
              Learn what cholesterol means, why LDL and HDL matter, and when
              results should be discussed with a healthcare professional.
            </p>
          </div>

          <div className="featureCard">
            <div className="iconBox">🩸</div>
            <h3>Understanding HbA1c</h3>
            <p>
              A simple guide to long-term blood sugar control and its importance
              in diabetes prevention and monitoring.
            </p>
          </div>

          <div className="featureCard">
            <div className="iconBox">🫘</div>
            <h3>Kidney Function Tests</h3>
            <p>
              Understand creatinine, eGFR, hydration, and common kidney health
              indicators.
            </p>
          </div>

          <div className="featureCard">
            <div className="iconBox">🟤</div>
            <h3>Liver Enzymes Explained</h3>
            <p>
              Learn about ALT, AST, liver inflammation, lifestyle factors, and
              when abnormal results may need medical review.
            </p>
          </div>

          <div className="featureCard">
            <div className="iconBox">🫀</div>
            <h3>Heart Health Basics</h3>
            <p>
              Explore blood pressure, cholesterol, activity, smoking, diabetes,
              and major cardiovascular risk factors.
            </p>
          </div>

          <div className="featureCard">
            <div className="iconBox">☀️</div>
            <h3>Vitamin D Deficiency</h3>
            <p>
              Understand common causes, symptoms, testing, and why vitamin D
              matters for overall health.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}