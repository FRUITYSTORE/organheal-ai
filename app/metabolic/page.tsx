"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function MetabolicPage() {
  const [glucose, setGlucose] = useState("");
  const [cholesterol, setCholesterol] = useState("");
  const [weight, setWeight] = useState("Normal");
  const [activity, setActivity] = useState("Good");
  const [familyHistory, setFamilyHistory] = useState("No");
  const [saveMessage, setSaveMessage] = useState("");

  const [result, setResult] = useState<null | {
    score: number;
    level: string;
    message: string;
  }>(null);

  async function saveAssessment(score: number, level: string, message: string) {
    setSaveMessage("Saving metabolic assessment...");

    const { data, error: userError } = await supabase.auth.getUser();

    if (userError) {
      setSaveMessage("Auth error: " + userError.message);
      return;
    }

    const user = data.user;

    if (!user) {
      setSaveMessage("Please login to save your assessment.");
      return;
    }

    const { error: upsertError } = await supabase
      .from("organ_assessments")
      .upsert(
        {
          user_id: user.id,
          organ_name: "Metabolic",
          score: score,
          risk_level: level,
          notes: message,
        },
        {
          onConflict: "user_id,organ_name",
        }
      );

    if (upsertError) {
      setSaveMessage("Database error: " + upsertError.message);
      return;
    }

    const { error: historyError } = await supabase.from("health_history").insert({
      user_id: user.id,
      module_name: "Metabolic",
      score: score,
      status: level,
      notes: message,
    });

    if (historyError) {
      setSaveMessage("History error: " + historyError.message);
      return;
    }

    setSaveMessage("Metabolic assessment saved successfully.");
  }

  async function calculateMetabolicScore() {
    setSaveMessage("");

    if (!glucose || !cholesterol) {
      setSaveMessage("Please complete all required fields.");
      return;
    }

    const glucoseNumber = Number(glucose);
    const cholesterolNumber = Number(cholesterol);

    if (glucoseNumber <= 0 || cholesterolNumber <= 0) {
      setSaveMessage("Please enter valid numbers.");
      return;
    }

    let riskPoints = 0;

    if (glucoseNumber >= 100) riskPoints += 20;
    if (glucoseNumber >= 126) riskPoints += 25;

    if (cholesterolNumber >= 200) riskPoints += 15;
    if (cholesterolNumber >= 240) riskPoints += 20;

    if (weight === "Overweight") riskPoints += 15;
    if (weight === "Obese") riskPoints += 25;

    if (activity === "Poor") riskPoints += 15;
    if (familyHistory === "Yes") riskPoints += 15;

    const score = Math.max(0, 100 - riskPoints);

    let level = "Good Metabolic Health Pattern";
    let message =
      "Your answers suggest a generally healthier metabolic pattern. Continue physical activity, balanced nutrition, and regular preventive checkups.";

    if (score < 75 && score >= 45) {
      level = "Moderate Metabolic Risk";
      message =
        "Your answers suggest some metabolic risk factors. Consider monitoring blood sugar, cholesterol, weight, and lifestyle habits with professional guidance.";
    }

    if (score < 45) {
      level = "Higher Metabolic Risk";
      message =
        "Your answers suggest multiple metabolic risk factors. This tool does not diagnose disease, but medical evaluation is recommended.";
    }

    setResult({ score, level, message });
    await saveAssessment(score, level, message);
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">METABOLIC HEALTH ASSESSMENT</p>
          <h1>Metabolic Health Assessment</h1>
          <p>
            Evaluate metabolic wellness factors including glucose, cholesterol,
            weight pattern, activity, and family history.
          </p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>Fasting Glucose</label>
              <input
                type="number"
                placeholder="e.g. 95"
                value={glucose}
                onChange={(event) => setGlucose(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>Total Cholesterol</label>
              <input
                type="number"
                placeholder="e.g. 180"
                value={cholesterol}
                onChange={(event) => setCholesterol(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>Weight Pattern</label>
              <select
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
              >
                <option>Normal</option>
                <option>Overweight</option>
                <option>Obese</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Physical Activity</label>
              <select
                value={activity}
                onChange={(event) => setActivity(event.target.value)}
              >
                <option>Good</option>
                <option>Moderate</option>
                <option>Poor</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Family history of diabetes or metabolic disease?</label>
              <select
                value={familyHistory}
                onChange={(event) => setFamilyHistory(event.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <button className="primaryBtn" onClick={calculateMetabolicScore}>
              Calculate Metabolic Score
            </button>

            {saveMessage && <p>{saveMessage}</p>}
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