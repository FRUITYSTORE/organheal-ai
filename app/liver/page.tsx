"use client";

import { useState } from "react";

export default function LiverPage() {
  const [alt, setAlt] = useState("");
  const [ast, setAst] = useState("");
  const [alcohol, setAlcohol] = useState("No");
  const [obesity, setObesity] = useState("No");
  const [diabetes, setDiabetes] = useState("No");

  const [result, setResult] = useState<null | {
    score: number;
    level: string;
    message: string;
  }>(null);

  function calculateLiverScore() {
    let riskPoints = 0;

    const altNumber = Number(alt);
    const astNumber = Number(ast);

    if (altNumber > 40) riskPoints += 20;
    if (altNumber > 80) riskPoints += 20;

    if (astNumber > 40) riskPoints += 15;
    if (astNumber > 80) riskPoints += 15;

    if (alcohol === "Yes") riskPoints += 15;
    if (obesity === "Yes") riskPoints += 15;
    if (diabetes === "Yes") riskPoints += 15;

    const score = Math.max(0, 100 - riskPoints);

    let level = "Good Liver Health Pattern";
    let message =
      "Your answers suggest a generally healthier liver risk pattern. Continue healthy nutrition, weight management, and routine checkups when needed.";

    if (score < 75 && score >= 45) {
      level = "Moderate Liver Risk";
      message =
        "Your answers suggest some liver-related risk factors. Consider discussing liver enzymes, metabolic health, and lifestyle factors with a healthcare professional.";
    }

    if (score < 45) {
      level = "Higher Liver Risk";
      message =
        "Your answers suggest multiple liver-related risk factors. This tool does not diagnose liver disease, but professional medical review is recommended.";
    }

    setResult({ score, level, message });

    localStorage.setItem("liverScore", String(score));
    localStorage.setItem("liverLevel", level);
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">LIVER HEALTH ASSESSMENT</p>

          <h1>Liver Health Assessment</h1>

          <p>
            Answer a few questions about liver enzymes, metabolic risk factors,
            alcohol exposure, and lifestyle to receive educational liver health
            guidance.
          </p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>ALT Level</label>
              <input
                type="number"
                placeholder="e.g. 35"
                value={alt}
                onChange={(event) => setAlt(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>AST Level</label>
              <input
                type="number"
                placeholder="e.g. 30"
                value={ast}
                onChange={(event) => setAst(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>Regular Alcohol Use?</label>
              <select
                value={alcohol}
                onChange={(event) => setAlcohol(event.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Obesity or Fatty Liver Risk?</label>
              <select
                value={obesity}
                onChange={(event) => setObesity(event.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Diabetes or Insulin Resistance?</label>
              <select
                value={diabetes}
                onChange={(event) => setDiabetes(event.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <button className="primaryBtn" onClick={calculateLiverScore}>
              Calculate Liver Score
            </button>
          </div>

          {result && (
            <div className="resultBox">
              <p className="sectionLabel">Liver Health Score</p>
              <h2>{result.score}/100</h2>
              <h3>{result.level}</h3>
              <p>{result.message}</p>

              <a href="/organ-report">
                <button className="secondaryBtn">View Organ Report</button>
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}