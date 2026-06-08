"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function HeartPage() {
  const [age, setAge] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [cholesterol, setCholesterol] = useState("");
  const [diabetes, setDiabetes] = useState("No");
  const [smoking, setSmoking] = useState("No");
  const [saveMessage, setSaveMessage] = useState("");

  const [result, setResult] = useState<null | {
    score: number;
    level: string;
    message: string;
  }>(null);

  async function saveAssessment(score: number, level: string, message: string) {
    setSaveMessage("Saving heart assessment...");

    const { data, error: userError } = await supabase.auth.getUser();

    if (userError) {
      setSaveMessage("Auth error: " + userError.message);
      return;
    }

    const user = data.user;

    if (!user) {
      setSaveMessage("Result calculated locally. Please login to save it.");
      return;
    }

    const { error: upsertError } = await supabase
      .from("organ_assessments")
      .upsert(
        {
          user_id: user.id,
          organ_name: "Heart",
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

    const { error: historyError } = await supabase
      .from("health_history")
      .insert({
        user_id: user.id,
        module_name: "Heart",
        score: score,
        status: level,
        notes: message,
      });

    if (historyError) {
      setSaveMessage("History error: " + historyError.message);
      return;
    }

    setSaveMessage("Heart assessment saved successfully and added to history.");
  }

  async function calculateRisk() {
    setSaveMessage("");

    if (!age || !bloodPressure || !cholesterol) {
      setSaveMessage("Please complete all required fields.");
      return;
    }

    const ageNumber = Number(age);
    const bpNumber = Number(bloodPressure);
    const cholesterolNumber = Number(cholesterol);

    if (ageNumber <= 0 || bpNumber <= 0 || cholesterolNumber <= 0) {
      setSaveMessage("Please enter valid numbers.");
      return;
    }

    let riskPoints = 0;

    if (ageNumber >= 45) riskPoints += 15;
    if (ageNumber >= 60) riskPoints += 15;

    if (bpNumber >= 130) riskPoints += 15;
    if (bpNumber >= 140) riskPoints += 15;

    if (cholesterolNumber >= 200) riskPoints += 15;
    if (cholesterolNumber >= 240) riskPoints += 15;

    if (diabetes === "Yes") riskPoints += 15;
    if (smoking === "Yes") riskPoints += 15;

    const score = Math.max(0, 100 - riskPoints);

    let level = "Low Risk";
    let message =
      "Your current inputs suggest a lower cardiovascular risk pattern. Continue healthy habits and regular preventive checkups.";

    if (score < 70 && score >= 40) {
      level = "Moderate Risk";
      message =
        "Your inputs suggest some cardiovascular risk factors. Consider discussing these results with a healthcare professional.";
    }

    if (score < 40) {
      level = "High Risk";
      message =
        "Your inputs suggest multiple cardiovascular risk factors. This does not diagnose disease, but it is important to seek professional medical advice.";
    }

    setResult({
      score,
      level,
      message,
    });

    localStorage.setItem("heartScore", String(score));
    localStorage.setItem("heartLevel", level);

    await saveAssessment(score, level, message);
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <div>
            <p className="assistantBadge">HEART HEALTH ASSESSMENT</p>

            <h1>Heart Risk Assessment</h1>

            <p>
              Complete the form below to evaluate cardiovascular risk factors
              and receive educational guidance.
            </p>
          </div>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>Age</label>
              <input
                type="number"
                placeholder="Enter your age"
                value={age}
                onChange={(event) => setAge(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>Systolic Blood Pressure</label>
              <input
                type="number"
                placeholder="e.g. 120"
                value={bloodPressure}
                onChange={(event) => setBloodPressure(event.target.value)}
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
              <label>Do you have Diabetes?</label>
              <select
                value={diabetes}
                onChange={(event) => setDiabetes(event.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Do you Smoke?</label>
              <select
                value={smoking}
                onChange={(event) => setSmoking(event.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <button className="primaryBtn" onClick={calculateRisk}>
              Calculate Heart Risk
            </button>

            {saveMessage && <p>{saveMessage}</p>}
          </div>

          {result && (
            <div className="resultBox">
              <p className="sectionLabel">Heart Health Score</p>
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