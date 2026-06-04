"use client";

import { useState } from "react";

export default function BrainPage() {
  const [sleep, setSleep] = useState("Good");
  const [stress, setStress] = useState("Low");
  const [memory, setMemory] = useState("No");
  const [headache, setHeadache] = useState("No");
  const [activity, setActivity] = useState("Good");

  const [result, setResult] = useState<null | {
    score: number;
    level: string;
    message: string;
  }>(null);

  function calculateBrainScore() {
    let riskPoints = 0;

    if (sleep === "Poor") riskPoints += 20;
    if (stress === "High") riskPoints += 20;
    if (memory === "Yes") riskPoints += 20;
    if (headache === "Yes") riskPoints += 15;
    if (activity === "Poor") riskPoints += 15;

    const score = Math.max(0, 100 - riskPoints);

    let level = "Good Brain Health Pattern";
    let message =
      "Your answers suggest a generally healthier brain wellbeing pattern. Continue prioritizing sleep, stress control, activity, and preventive care.";

    if (score < 75 && score >= 45) {
      level = "Moderate Brain Health Risk";
      message =
        "Your answers suggest some brain health and lifestyle risk factors. Consider improving sleep, managing stress, and discussing persistent symptoms with a healthcare professional.";
    }

    if (score < 45) {
      level = "Higher Brain Health Risk";
      message =
        "Your answers suggest multiple brain health-related risk factors. This tool does not diagnose neurological disease, but professional medical advice is recommended if symptoms persist or worsen.";
    }

    setResult({ score, level, message });

    localStorage.setItem("brainScore", String(score));
    localStorage.setItem("brainLevel", level);
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">BRAIN HEALTH ASSESSMENT</p>

          <h1>Brain Health Assessment</h1>

          <p>
            Answer a few questions about sleep, stress, memory, headaches, and
            activity level to receive educational brain health guidance.
          </p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>Sleep Quality</label>
              <select
                value={sleep}
                onChange={(event) => setSleep(event.target.value)}
              >
                <option>Good</option>
                <option>Moderate</option>
                <option>Poor</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Stress Level</label>
              <select
                value={stress}
                onChange={(event) => setStress(event.target.value)}
              >
                <option>Low</option>
                <option>Moderate</option>
                <option>High</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Memory or Concentration Issues?</label>
              <select
                value={memory}
                onChange={(event) => setMemory(event.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Frequent Headaches?</label>
              <select
                value={headache}
                onChange={(event) => setHeadache(event.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Physical Activity Level</label>
              <select
                value={activity}
                onChange={(event) => setActivity(event.target.value)}
              >
                <option>Good</option>
                <option>Moderate</option>
                <option>Poor</option>
              </select>
            </div>

            <button className="primaryBtn" onClick={calculateBrainScore}>
              Calculate Brain Score
            </button>
          </div>

          {result && (
            <div className="resultBox">
              <p className="sectionLabel">Brain Health Score</p>
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