"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LabAnalyzerPage() {
  const [totalCholesterol, setTotalCholesterol] = useState("");
  const [ldl, setLdl] = useState("");
  const [hdl, setHdl] = useState("");
  const [triglycerides, setTriglycerides] = useState("");
  const [hba1c, setHba1c] = useState("");
  const [vitaminD, setVitaminD] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const [result, setResult] = useState<null | {
    score: number;
    interpretation: string;
  }>(null);

  async function saveLabReport(score: number, interpretation: string) {
    setSaveMessage("Saving lab report...");

    const { data, error: userError } = await supabase.auth.getUser();

    if (userError) {
      setSaveMessage("Auth error: " + userError.message);
      return;
    }

    const user = data.user;

    if (!user) {
      setSaveMessage("Please login to save your lab report.");
      return;
    }

    const { error } = await supabase
      .from("lab_reports")
      .upsert(
        {
          user_id: user.id,
          total_cholesterol: Number(totalCholesterol),
          ldl: Number(ldl),
          hdl: Number(hdl),
          triglycerides: Number(triglycerides),
          hba1c: Number(hba1c),
          vitamin_d: Number(vitaminD),
          score: score,
          interpretation: interpretation,
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      setSaveMessage("Database error: " + error.message);
      return;
    }

    setSaveMessage("Lab report saved successfully.");
  }

  async function analyzeLabs() {
    setSaveMessage("");

    if (
      !totalCholesterol ||
      !ldl ||
      !hdl ||
      !triglycerides ||
      !hba1c ||
      !vitaminD
    ) {
      setSaveMessage("Please complete all lab values.");
      return;
    }

    const totalCholesterolNumber = Number(totalCholesterol);
    const ldlNumber = Number(ldl);
    const hdlNumber = Number(hdl);
    const triglyceridesNumber = Number(triglycerides);
    const hba1cNumber = Number(hba1c);
    const vitaminDNumber = Number(vitaminD);

    if (
      totalCholesterolNumber <= 0 ||
      ldlNumber <= 0 ||
      hdlNumber <= 0 ||
      triglyceridesNumber <= 0 ||
      hba1cNumber <= 0 ||
      vitaminDNumber <= 0
    ) {
      setSaveMessage("Please enter valid positive numbers.");
      return;
    }

    let riskPoints = 0;
    const findings: string[] = [];

    if (totalCholesterolNumber >= 200) {
      riskPoints += 10;
      findings.push("Total cholesterol is above the desirable range.");
    }

    if (ldlNumber >= 130) {
      riskPoints += 15;
      findings.push("LDL cholesterol is elevated.");
    }

    if (ldlNumber >= 160) {
      riskPoints += 10;
      findings.push("LDL cholesterol is significantly elevated.");
    }

    if (hdlNumber < 40) {
      riskPoints += 15;
      findings.push("HDL cholesterol is low.");
    }

    if (triglyceridesNumber >= 150) {
      riskPoints += 15;
      findings.push("Triglycerides are elevated.");
    }

    if (triglyceridesNumber >= 200) {
      riskPoints += 10;
      findings.push("Triglycerides are high.");
    }

    if (hba1cNumber >= 5.7) {
      riskPoints += 15;
      findings.push("HbA1c is in a higher-risk range.");
    }

    if (hba1cNumber >= 6.5) {
      riskPoints += 20;
      findings.push("HbA1c is in the diabetes range.");
    }

    if (vitaminDNumber < 30) {
      riskPoints += 10;
      findings.push("Vitamin D is below the commonly accepted sufficient range.");
    }

    const score = Math.max(0, 100 - riskPoints);

    let interpretation =
      "Your lab pattern looks generally reassuring based on the values entered.";

    if (findings.length > 0) {
      interpretation =
        findings.join(" ") +
        " This educational tool does not diagnose disease. Please discuss abnormal results with a healthcare professional.";
    }

    setResult({
      score,
      interpretation,
    });

    await saveLabReport(score, interpretation);
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">LAB ANALYZER</p>
          <h1>Lab Analyzer</h1>
          <p>
            Enter key lab values to receive a simple educational interpretation
            and a lab health score.
          </p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>Total Cholesterol</label>
              <input
                type="number"
                placeholder="e.g. 180"
                value={totalCholesterol}
                onChange={(event) => setTotalCholesterol(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>LDL</label>
              <input
                type="number"
                placeholder="e.g. 100"
                value={ldl}
                onChange={(event) => setLdl(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>HDL</label>
              <input
                type="number"
                placeholder="e.g. 45"
                value={hdl}
                onChange={(event) => setHdl(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>Triglycerides</label>
              <input
                type="number"
                placeholder="e.g. 140"
                value={triglycerides}
                onChange={(event) => setTriglycerides(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>HbA1c</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 5.4"
                value={hba1c}
                onChange={(event) => setHba1c(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>Vitamin D</label>
              <input
                type="number"
                placeholder="e.g. 35"
                value={vitaminD}
                onChange={(event) => setVitaminD(event.target.value)}
              />
            </div>

            <button className="primaryBtn" onClick={analyzeLabs}>
              Analyze Labs
            </button>

            {saveMessage && <p>{saveMessage}</p>}
          </div>

          {result && (
            <div className="resultBox">
              <p className="sectionLabel">Lab Health Score</p>
              <h2>{result.score}/100</h2>
              <p>{result.interpretation}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}