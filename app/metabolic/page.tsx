"use client";

import { useState } from "react";

export default function MetabolicPage() {
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [bloodSugar, setBloodSugar] = useState("");
  const [activity, setActivity] = useState("Good");
  const [diabetes, setDiabetes] = useState("No");

  const [result, setResult] = useState<null | {
    score: number;
    level: string;
    message: string;
  }>(null);

  function calculateMetabolicScore() {
    let riskPoints = 0;

    const sugar = Number(bloodSugar);
    const waistSize = Number(waist);

    if (sugar >= 100) riskPoints += 15;
    if (sugar >= 126) riskPoints += 20;
    if (waistSize >= 100) riskPoints += 15;
    if (activity === "Poor") riskPoints += 15;
    if (diabetes === "Yes") riskPoints += 25;

    const score = Math.max(0, 100 - riskPoints);

    let level = "Good Metabolic Health";
    let message =
      "Your answers suggest a generally healthier metabolic pattern. Continue healthy nutrition and regular physical activity.";

    if (score < 75 && score >= 45) {
      level = "Moderate Metabolic Risk";
      message =
        "Your answers suggest some metabolic risk factors. Consider monitoring weight, blood sugar, and physical activity.";
    }

    if (score < 45) {
      level = "Higher Metabolic Risk";
      message =
        "Your answers suggest multiple metabolic risk factors. Professional medical evaluation is recommended.";
    }

    setResult({ score, level, message });

    localStorage.setItem("metabolicScore", String(score));
    localStorage.setItem("metabolicLevel", level);
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">METABOLIC HEALTH ASSESSMENT</p>

          <h1>Metabolic Health Assessment</h1>

          <p>
            Evaluate metabolic risk factors related to blood sugar, weight
            management, and lifestyle.
          </p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>Weight (kg)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>Waist Circumference (cm)</label>
              <input
                type="number"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>Fasting Blood Sugar</label>
              <input
                type="number"
                value={bloodSugar}
                onChange={(e) => setBloodSugar(e.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>Physical Activity</label>
              <select
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
              >
                <option>Good</option>
                <option>Moderate</option>
                <option>Poor</option>
              </select>
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

            <button className="primaryBtn" onClick={calculateMetabolicScore}>
              Calculate Metabolic Score
            </button>
          </div>

          {result && (
            <div className="resultBox">
              <p className="sectionLabel">Metabolic Health Score</p>
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