"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LungPage() {
  const [smoking, setSmoking] = useState("No");
  const [shortnessOfBreath, setShortnessOfBreath] = useState("No");
  const [chronicCough, setChronicCough] = useState("No");
  const [asthma, setAsthma] = useState("No");
  const [activityLevel, setActivityLevel] = useState("Good");
  const [saveMessage, setSaveMessage] = useState("");

  const [result, setResult] = useState<null | {
    score: number;
    level: string;
    message: string;
  }>(null);

  async function saveAssessment(score: number, level: string, message: string) {
    setSaveMessage("Saving lung assessment...");
    console.log("Saving lung assessment started");

    const { data, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.log("Auth error:", userError);
      setSaveMessage("Auth error: " + userError.message);
      return;
    }

    if (!data.user) {
      console.log("No user logged in");
      setSaveMessage("Please login to save your assessment.");
      return;
    }

    const { data: insertedData, error } = await supabase
      .from("organ_assessments")
      .upsert({
        user_id: data.user.id,
        organ_name: "Lung",
        score: score,
        risk_level: level,
        notes: message,
      })
      .select();

    console.log("Inserted lung:", insertedData);
    console.log("Insert error:", error);

    if (error) {
      setSaveMessage("Database error: " + error.message);
      return;
    }

    setSaveMessage("Lung assessment saved successfully.");
  }

  async function calculateLungScore() {
    console.log("Lung button clicked");

    let riskPoints = 0;

    if (smoking === "Yes") riskPoints += 25;
    if (shortnessOfBreath === "Yes") riskPoints += 20;
    if (chronicCough === "Yes") riskPoints += 20;
    if (asthma === "Yes") riskPoints += 15;
    if (activityLevel === "Poor") riskPoints += 15;

    const score = Math.max(0, 100 - riskPoints);

    let level = "Good Lung Health Pattern";
    let message =
      "Your answers suggest a generally healthier respiratory pattern. Continue avoiding smoke exposure, staying active, and seeking checkups when symptoms appear.";

    if (score < 75 && score >= 45) {
      level = "Moderate Respiratory Risk";
      message =
        "Your answers suggest some respiratory risk factors. Consider discussing symptoms such as cough, wheezing, or shortness of breath with a healthcare professional.";
    }

    if (score < 45) {
      level = "Higher Respiratory Risk";
      message =
        "Your answers suggest multiple respiratory risk factors. This tool does not diagnose disease, but medical evaluation is recommended if symptoms are persistent or worsening.";
    }

    setResult({ score, level, message });

    await saveAssessment(score, level, message);
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">LUNG HEALTH ASSESSMENT</p>

          <h1>Lung Health Assessment</h1>

          <p>
            Answer a few questions about breathing, symptoms, smoking exposure,
            and activity level to receive educational respiratory health
            guidance.
          </p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
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

            <div className="formGroup">
              <label>Shortness of Breath?</label>
              <select
                value={shortnessOfBreath}
                onChange={(event) =>
                  setShortnessOfBreath(event.target.value)
                }
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Chronic Cough?</label>
              <select
                value={chronicCough}
                onChange={(event) => setChronicCough(event.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Asthma or Wheezing History?</label>
              <select
                value={asthma}
                onChange={(event) => setAsthma(event.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Activity Level</label>
              <select
                value={activityLevel}
                onChange={(event) => setActivityLevel(event.target.value)}
              >
                <option>Good</option>
                <option>Moderate</option>
                <option>Poor</option>
              </select>
            </div>

            <button className="primaryBtn" onClick={calculateLungScore}>
              TEST LUNG BUTTON
            </button>

            {saveMessage && <p>{saveMessage}</p>}
          </div>

          {result && (
            <div className="resultBox">
              <p className="sectionLabel">Lung Health Score</p>
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