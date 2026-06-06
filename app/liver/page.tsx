"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LiverPage() {
  const [alt, setAlt] = useState("");
  const [ast, setAst] = useState("");
  const [alcohol, setAlcohol] = useState("No");
  const [fattyLiver, setFattyLiver] = useState("No");
  const [obesity, setObesity] = useState("No");
  const [saveMessage, setSaveMessage] = useState("");

  const [result, setResult] = useState<null | {
    score: number;
    level: string;
    message: string;
  }>(null);

  async function saveAssessment(score: number, level: string, message: string) {
    setSaveMessage("Saving liver assessment...");

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

    const { error } = await supabase
      .from("organ_assessments")
      .upsert(
        {
          user_id: user.id,
          organ_name: "Liver",
          score: score,
          risk_level: level,
          notes: message,
        },
        {
          onConflict: "user_id,organ_name",
        }
      );

    if (error) {
      setSaveMessage("Database error: " + error.message);
      return;
    }

    setSaveMessage("Liver assessment saved successfully.");
  }

  async function calculateLiverScore() {
    setSaveMessage("");

    if (!alt || !ast) {
      setSaveMessage("Please complete all required fields.");
      return;
    }

    const altNumber = Number(alt);
    const astNumber = Number(ast);

    if (altNumber <= 0 || astNumber <= 0) {
      setSaveMessage("Please enter valid numbers.");
      return;
    }

    let riskPoints = 0;

    if (altNumber > 40) riskPoints += 20;
    if (altNumber > 80) riskPoints += 20;
    if (astNumber > 40) riskPoints += 20;
    if (astNumber > 80) riskPoints += 20;
    if (alcohol === "Yes") riskPoints += 15;
    if (fattyLiver === "Yes") riskPoints += 15;
    if (obesity === "Yes") riskPoints += 10;

    const score = Math.max(0, 100 - riskPoints);

    let level = "Good Liver Health Pattern";
    let message =
      "Your answers suggest a generally healthier liver risk pattern. Continue healthy nutrition, weight control, and regular preventive checkups.";

    if (score < 75 && score >= 45) {
      level = "Moderate Liver Risk";
      message =
        "Your answers suggest some liver-related risk factors. Consider discussing liver enzymes, fatty liver risk, and lifestyle factors with a healthcare professional.";
    }

    if (score < 45) {
      level = "Higher Liver Risk";
      message =
        "Your answers suggest multiple liver-related risk factors. This tool does not diagnose disease, but medical evaluation is recommended.";
    }

    setResult({ score, level, message });
    await saveAssessment(score, level, message);
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">LIVER HEALTH ASSESSMENT</p>
          <h1>Liver Health Assessment</h1>
          <p>
            Evaluate liver-related risk factors including liver enzymes, fatty
            liver history, alcohol exposure, and obesity.
          </p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>ALT</label>
              <input
                type="number"
                placeholder="e.g. 35"
                value={alt}
                onChange={(event) => setAlt(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>AST</label>
              <input
                type="number"
                placeholder="e.g. 30"
                value={ast}
                onChange={(event) => setAst(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>Alcohol exposure?</label>
              <select
                value={alcohol}
                onChange={(event) => setAlcohol(event.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Known fatty liver?</label>
              <select
                value={fattyLiver}
                onChange={(event) => setFattyLiver(event.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Obesity or overweight?</label>
              <select
                value={obesity}
                onChange={(event) => setObesity(event.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <button className="primaryBtn" onClick={calculateLiverScore}>
              Calculate Liver Score
            </button>

            {saveMessage && <p>{saveMessage}</p>}
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