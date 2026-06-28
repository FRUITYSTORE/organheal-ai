import Link from "next/link";
import PageBackActions from "../components/PageBackActions";
export default function AssessmentPage() {
  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <PageBackActions />
        <div className="assistantHeader">
          <p className="assistantBadge">ORGAN HEALTH ASSESSMENT</p>

          <h1>Evaluate Your Organ Health</h1>

          <p>
            Explore key health indicators related to your heart, liver,
            kidneys, lungs, brain, and metabolic health.
          </p>

          <div className="buttons">
            <Link href="/history">
              <button className="primaryBtn">View Progress Timeline</button>
            </Link>
          </div>
        </div>

        <div className="featureGrid">
          <Link href="/heart" className="featureCard">
            <div className="iconBox">❤️</div>
            <h3>Heart Health</h3>
            <p>Blood pressure, cholesterol, activity level, and cardiovascular risk factors.</p>
          </Link>

          <Link href="/lung" className="featureCard">
            <div className="iconBox">🫁</div>
            <h3>Lung Health</h3>
            <p>Breathing symptoms, smoking exposure, and respiratory wellbeing.</p>
          </Link>

          <Link href="/kidney" className="featureCard">
            <div className="iconBox">🫘</div>
            <h3>Kidney Health</h3>
            <p>Creatinine, hydration, blood pressure, and kidney function indicators.</p>
          </Link>

          <Link href="/liver" className="featureCard">
            <div className="iconBox">🟤</div>
            <h3>Liver Health</h3>
            <p>Liver enzymes, lifestyle factors, and metabolic health insights.</p>
          </Link>

          <Link href="/brain" className="featureCard">
            <div className="iconBox">🧠</div>
            <h3>Brain Health</h3>
            <p>Sleep, stress, memory, and cognitive wellbeing.</p>
          </Link>

          <Link href="/metabolic" className="featureCard">
            <div className="iconBox">🩸</div>
            <h3>Metabolic Health</h3>
            <p>Blood sugar, weight management, and overall metabolic balance.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
