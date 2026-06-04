"use client";

import { useEffect, useState } from "react";

type OrganScore = {
  name: string;
  icon: string;
  score: number | null;
  message: string;
};

export default function OrganReportPage() {
  const [scores, setScores] = useState<OrganScore[]>([]);
  const [overallScore, setOverallScore] = useState<number | null>(null);

  function loadScores() {
    const organs = [
      { key: "heartScore", name: "Heart", icon: "❤️" },
      { key: "lungScore", name: "Lung", icon: "🫁" },
      { key: "kidneyScore", name: "Kidney", icon: "🫘" },
      { key: "liverScore", name: "Liver", icon: "🟤" },
      { key: "brainScore", name: "Brain", icon: "🧠" },
      { key: "metabolicScore", name: "Metabolic", icon: "🩸" },
    ];

    const updatedScores = organs.map((organ) => {
      const savedScore = localStorage.getItem(organ.key);

      return {
        name: organ.name,
        icon: organ.icon,
        score: savedScore ? Number(savedScore) : null,
        message: savedScore
          ? `${organ.name} assessment result is included in this report.`
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
    } else {
      setOverallScore(null);
    }

    setScores(updatedScores);
  }

  function resetReport() {
    localStorage.removeItem("heartScore");
    localStorage.removeItem("heartLevel");
    localStorage.removeItem("lungScore");
    localStorage.removeItem("lungLevel");
    localStorage.removeItem("kidneyScore");
    localStorage.removeItem("kidneyLevel");
    localStorage.removeItem("liverScore");
    localStorage.removeItem("liverLevel");
    localStorage.removeItem("brainScore");
    localStorage.removeItem("brainLevel");
    localStorage.removeItem("metabolicScore");
    localStorage.removeItem("metabolicLevel");

    loadScores();
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