"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type OrganScore = {
  name: string;
  icon: string;
  score: number | null;
  message: string;
};

type AssessmentRow = {
  organ_name: string;
  score: number;
  risk_level: string | null;
  notes: string | null;
  created_at: string;
};

export default function OrganReportPage() {
  const [scores, setScores] = useState<OrganScore[]>([]);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState("Loading report...");

  async function loadScores() {
    setStatusMessage("Loading report...");

    const organs = [
      { name: "Heart", icon: "❤️" },
      { name: "Lung", icon: "🫁" },
      { name: "Kidney", icon: "🫘" },
      { name: "Liver", icon: "🟤" },
      { name: "Brain", icon: "🧠" },
      { name: "Metabolic", icon: "🩸" },
    ];

    const { data, error: userError } = await supabase.auth.getUser();

    if (userError) {
      setStatusMessage("Auth error: " + userError.message);
      return;
    }

    const user = data.user;

    if (!user) {
      setStatusMessage("Please login to view your saved report.");
      setScores(
        organs.map((organ) => ({
          name: organ.name,
          icon: organ.icon,
          score: null,
          message: `Login and complete the ${organ.name.toLowerCase()} assessment to generate this score.`,
        }))
      );
      setOverallScore(null);
      return;
    }

    const { data: assessments, error } = await supabase
      .from("organ_assessments")
      .select("organ_name, score, risk_level, notes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setStatusMessage("Database error: " + error.message);
      return;
    }

    const latestByOrgan: Record<string, AssessmentRow> = {};

    (assessments as AssessmentRow[]).forEach((assessment) => {
      if (!latestByOrgan[assessment.organ_name]) {
        latestByOrgan[assessment.organ_name] = assessment;
      }
    });

    const updatedScores = organs.map((organ) => {
      const saved = latestByOrgan[organ.name];

      return {
        name: organ.name,
        icon: organ.icon,
        score: saved ? saved.score : null,
        message: saved
          ? `${organ.name} assessment saved. Risk level: ${
              saved.risk_level || "Not specified"
            }.`
          : `Complete the ${organ.name.toLowerCase()} assessment to generate this score.`,
      };
    });

    const completedScores = updatedScores
      .filter((item) => item.score !== null)
      .map((item) => item.score as number);

    if (completedScores.length > 0) {
      const average =
        completedScores.reduce((total, score) => total + score, 0) /
        completedScores.length;

      setOverallScore(Math.round(average));
      setStatusMessage("Report loaded from Supabase.");
    } else {
      setOverallScore(null);
      setStatusMessage("No saved assessments found yet.");
    }

    setScores(updatedScores);
  }

  async function resetReport() {
    const { data, error: userError } = await supabase.auth.getUser();

    if (userError) {
      setStatusMessage("Auth error: " + userError.message);
      return;
    }

    const user = data.user;

    if (!user) {
      setStatusMessage("Please login to reset your report.");
      return;
    }

    const { error } = await supabase
      .from("organ_assessments")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      setStatusMessage("Database error: " + error.message);
      return;
    }

    setStatusMessage("Report reset successfully.");
    await loadScores();
  }

  useEffect(() => {
    loadScores();
  }, []);

  let overallLevel = "No Assessment Data Yet";
  let overallMessage =
    "Complete at least one organ assessment to generate your health intelligence report.";

  if (overallScore !== null) {
    overallLevel = "Lower Health Risk Pattern";
    overallMessage =
      "Your completed assessments suggest a generally healthier pattern based on the available results.";

    if (overallScore < 75 && overallScore >= 45) {
      overallLevel = "Moderate Health Risk Pattern";
      overallMessage =
        "Your completed assessments suggest some health risk factors that may be worth discussing with a healthcare professional.";
    }

    if (overallScore < 45) {
      overallLevel = "Higher Health Risk Pattern";
      overallMessage =
        "Your completed assessments suggest multiple health risk factors. This report is educational and does not replace professional medical advice.";
    }
  }

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <div className="assistantHeader">
          <p className="assistantBadge">ORGAN HEALTH REPORT</p>

          <h1>Your Organ Health Overview</h1>

          <p>
            A combined educational overview of organ health patterns based on
            available assessment modules.
          </p>

          <div className="buttons">
            <button className="secondaryBtn" onClick={resetReport}>
              Reset Report
            </button>
          </div>
        </div>

        <div className="chatWindow">
          <div className="resultBox">
            <p className="sectionLabel">Overall Health Intelligence Score</p>
            <h2>{overallScore !== null ? `${overallScore}/100` : "--/100"}</h2>
            <h3>{overallLevel}</h3>
            <p>{overallMessage}</p>
            <p>{statusMessage}</p>
          </div>

          <div className="reportGrid">
            {scores.map((organ) => (
              <div className="reportCard" key={organ.name}>
                <h3>
                  {organ.icon} {organ.name}
                </h3>

                <span>
                  {organ.score !== null ? `${organ.score}/100` : "--/100"}
                </span>

                <p>{organ.message}</p>
              </div>
            ))}
          </div>

          <div className="trustBox reportNote">
            <p className="sectionLabel">Important Note</p>
            <p>
              This report is for education and awareness only. It does not
              diagnose disease, replace laboratory interpretation by clinicians,
              or substitute professional medical advice.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}