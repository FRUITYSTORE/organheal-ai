"use client";

import { useState } from "react";

export default function KidneyPage() {
  const [creatinine, setCreatinine] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [diabetes, setDiabetes] = useState("No");
  const [hydration, setHydration] = useState("Good");

  const [result, setResult] = useState<null | {
    score: number;
    level: string;
    message: string;
  }>(null);

  function calculateKidneyScore() {
    let riskPoints = 0;

    const creatinineValue = Number(creatinine);
    const bpValue = Number(bloodPressure);

    if (creatinineValue > 1.2) riskPoints += 25;
    if (creatinineValue > 1.5) riskPoints += 15;

    if (bpValue >= 140) riskPoints += 20;

    if (diabetes === "Yes") riskPoints += 20;

    if (hydration === "Poor") riskPoints += 15;

    const score = Math.max(0, 100 - riskPoints);

    let level = "Good Kidney Health Pattern";
    let message =
      "Your answers suggest a generally healthier kidney health pattern. Continue hydration, blood pressure control, and regular monitoring.";

    if (score < 75 && score >= 45) {
      level = "Moderate Kidney Risk";
      message =
        "Your answers suggest some kidney-related risk factors. Monitoring kidney function and discussing results with a healthcare professional may be helpful.";
    }

    if (score < 45) {
      level = "Higher Kidney Risk";
      message =
        "Your answers suggest multiple kidney-related risk factors. This tool does not diagnose kidney disease but medical review is recommended.";
    }

    setResult({
      score,
      level,
      message,
    });

    localStorage.setItem("kidneyScore", String(score));
    localStorage.setItem("kidneyLevel", level);
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">KIDNEY HEALTH ASSESSMENT</p>

          <h1>Kidney Health Assessment</h1>

          <p>
            Evaluate kidney-related risk factors including creatinine,
            hydration, blood pressure, and diabetes history.
          </p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>Creatinine (mg/dL)</label>

              <input
                type="number"
                step="0.1"
                value={creatinine}
                onChange={(e) => setCreatinine(e.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>Systolic Blood Pressure</label>

              <input
                type="number"
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>Diabetes?</label>

              <select
                value={diabetes}
                onChange={(e) => setDiabetes(e.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Hydration Status</label>

              <select
                value={hydration}
                onChange={(e) => setHydration(e.target.value)}
              >
                <option>Good</option>
                <option>Moderate</option>
                <option>Poor</option>
              </select>
            </div>

            <button
              className="primaryBtn"
              onClick={calculateKidneyScore}
            >
              Calculate Kidney Score
            </button>
          </div>

          {result && (
            <div className="resultBox">
              <p className="sectionLabel">Kidney Health Score</p>

              <h2>{result.score}/100</h2>

              <h3>{result.level}</h3>

              <p>{result.message}</p>

              <a href="/organ-report">
                <button className="secondaryBtn">
                  View Organ Report
                </button>
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}