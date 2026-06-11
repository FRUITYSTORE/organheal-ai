"use client";
import PageBackActions from "../components/PageBackActions";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function BrainPage() {
  const [sleep, setSleep] = useState("Good");
  const [stress, setStress] = useState("Low");
  const [memory, setMemory] = useState("No");
  const [headache, setHeadache] = useState("No");
  const [activity, setActivity] = useState("Good");
  const [saveMessage, setSaveMessage] = useState("");

  const [result, setResult] = useState<null | {
    score: number;
    level: string;
    message: string;
  }>(null);

  async function saveAssessment(score: number, level: string, message: string) {
    setSaveMessage("Saving brain assessment...");

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
          organ_name: "Brain",
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
      module_name: "Brain",
      score: score,
      status: level,
      notes: message,
    });

    if (historyError) {
      setSaveMessage("History error: " + historyError.message);
      return;
    }

    setSaveMessage("Brain assessment saved successfully.");
  }

  async function calculateBrainScore() {
    setSaveMessage("");

    let riskPoints = 0;

    if (sleep === "Poor") riskPoints += 20;
    if (stress === "Moderate") riskPoints += 15;
    if (stress === "High") riskPoints += 30;
    if (memory === "Yes") riskPoints += 20;
    if (headache === "Yes") riskPoints += 15;
    if (activity === "Poor") riskPoints += 15;

    const score = Math.max(0, 100 - riskPoints);

    let level = "Good Brain Health Pattern";
    let message =
      "Your answers suggest a generally healthier brain wellness pattern. Continue good sleep, stress control, physical activity, and regular checkups when symptoms appear.";

    if (score < 75 && score >= 45) {
      level = "Moderate Brain Wellness Risk";
      message =
        "Your answers suggest some brain wellness risk factors such as sleep, stress, headaches, or memory concerns. Consider lifestyle improvement and professional advice if symptoms continue.";
    }

    if (score < 45) {
      level = "Higher Brain Wellness Risk";
      message =
        "Your answers suggest multiple brain wellness risk factors. This tool does not diagnose disease, but medical evaluation is recommended if symptoms are persistent or worsening.";
    }

    setResult({ score, level, message });
    await saveAssessment(score, level, message);
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <PageBackActions />
        <div className="assistantHeader">
          <p className="assistantBadge">BRAIN HEALTH ASSESSMENT</p>
          <h1>Brain Health Assessment</h1>
          <p>
            Evaluate brain wellness factors including sleep, stress, memory,
            headaches, and activity level.
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
              <label>Memory or concentration problems?</label>
              <select
                value={memory}
                onChange={(event) => setMemory(event.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>

            <div className="formGroup">
              <label>Frequent headaches?</label>
              <select
                value={headache}
                onChange={(event) => setHeadache(event.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
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

            <button className="primaryBtn" onClick={calculateBrainScore}>
              Calculate Brain Score
            </button>

            {saveMessage && <p>{saveMessage}</p>}
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