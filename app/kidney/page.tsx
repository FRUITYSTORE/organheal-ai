"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function KidneyPage() {
  const [creatinine, setCreatinine] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [diabetes, setDiabetes] = useState("No");
  const [swelling, setSwelling] = useState("No");
  const [hydration, setHydration] = useState("Good");
  const [saveMessage, setSaveMessage] = useState("");

  const [result, setResult] = useState<null | {
    score: number;
    level: string;
    message: string;
  }>(null);

  async function saveAssessment(score: number, level: string, message: string) {
    setSaveMessage("Saving kidney assessment...");

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
          organ_name: "Kidney",
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
      module_name: "Kidney",
      score: score,
      status: level,
      notes: message,
    });

    if (historyError) {
      setSaveMessage("History error: " + historyError.message);
      return;
    }

    setSaveMessage("Kidney assessment saved successfully.");
  }

  async function calculateKidneyScore() {
    setSaveMessage("");

    if (!creatinine || !bloodPressure) {
      setSaveMessage("Please complete all required fields.");
      return;
    }

    const creatinineNumber = Number(creatinine);
    const bpNumber = Number(bloodPressure);

    if (creatinineNumber <= 0 || bpNumber <= 0) {
      setSaveMessage("Please enter valid numbers.");
      return;
    }

    let riskPoints = 0;

    if (creatinineNumber > 1.2) riskPoints += 20;
    if (creatinineNumber > 1.5) riskPoints += 20;
    if (bpNumber >= 130) riskPoints += 15;
    if (bpNumber >= 140) riskPoints += 15;
    if (diabetes === "Yes") riskPoints += 15;
    if (swelling === "Yes") riskPoints += 15;
    if (hydration === "Poor") riskPoints += 10;

    const score = Math.max(0, 100 - riskPoints);

    let level = "Good Kidney Health Pattern";
    let message =
      "Your answers suggest a generally healthier kidney risk pattern. Continue hydration, blood pressure monitoring, and regular checkups.";

    if (score < 75 && score >= 45) {
      level = "Moderate Kidney Risk";
      message =
        "Your answers suggest some kidney-related risk factors. Consider discussing kidney function, blood pressure, and urine tests with a healthcare professional.";
    }

    if (score < 45) {
      level = "Higher Kidney Risk";
      message =
        "Your answers suggest multiple kidney-related risk factors. This tool does not diagnose disease, but medical evaluation is recommended.";
    }

    setResult({ score, level, message });
    await saveAssessment(score, level, message);
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">KIDNEY HEALTH ASSESSMENT</p>
          <h1>Kidney Health Assessment</h1>
          <p>
            Evaluate kidney-related risk factors including creatinine, blood
            pressure, hydration, diabetes, and swelling.
          </p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>Creatinine</label>
              <input
                type="number"
                placeholder="e.g. 1.0"
                value={creatinine}
                onChange={(event) => setCreatinine(event.target.value)}
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
              <label>Leg or body swelling?</label>
              <select
                value={swelling}
                onChange={(event) => setSwelling(event.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Hydration Level</label>
              <select
                value={hydration}
                onChange={(event) => setHydration(event.target.value)}
              >
                <option>Good</option>
                <option>Moderate</option>
                <option>Poor</option>
              </select>
            </div>

            <button className="primaryBtn" onClick={calculateKidneyScore}>
              Calculate Kidney Score
            </button>

            {saveMessage && <p>{saveMessage}</p>}
          </div>

          {result && (
            <div className="resultBox">
              <p className="sectionLabel">Kidney Health Score</p>
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