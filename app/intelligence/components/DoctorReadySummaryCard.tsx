"use client";

import { useEffect, useState } from "react";

type DoctorReadySummaryCardProps = {
  overallScore: number;
  priorityOrgan: string | null;
  riskPattern: string;
  opportunityTitle: string;
  bestNextAction: string;
};

type Language = "en" | "ar";

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";

  const savedLanguage =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("organheal_language") ||
    localStorage.getItem("language") ||
    "";

  return savedLanguage.toLowerCase().startsWith("ar") ? "ar" : "en";
}

export default function DoctorReadySummaryCard({
  overallScore,
  priorityOrgan,
  riskPattern,
  opportunityTitle,
  bestNextAction,
}: DoctorReadySummaryCardProps) {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    function syncLanguage() {
      setLanguage(getStoredLanguage());
    }

    syncLanguage();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("focus", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("focus", syncLanguage);
    };
  }, []);

  const isArabic = language === "ar";

  return (
    <div className="resultBox" dir={isArabic ? "rtl" : "ltr"}>
      <p className="sectionLabel">
        {isArabic ? "\u0645\u0644\u062e\u0635 \u062c\u0627\u0647\u0632 \u0644\u0644\u0637\u0628\u064a\u0628" : "🩺 DOCTOR READY SUMMARY"}
      </p>

      <h2>{isArabic ? "\u0645\u0644\u062e\u0635 \u0627\u0644\u0637\u0628\u064a\u0628" : "Doctor Brief"}</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          marginTop: "20px",
          textAlign: isArabic ? "right" : "left",
        }}
      >
        <div>
          <strong>{isArabic ? "\u0627\u0644\u0646\u062a\u064a\u062c\u0629 \u0627\u0644\u0639\u0627\u0645\u0629" : "Overall Score"}</strong>
          <p>{overallScore}/100</p>
        </div>

        <div>
          <strong>{isArabic ? "\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0623\u0648\u0644\u0648\u064a\u0629" : "Priority Area"}</strong>
          <p>{priorityOrgan || (isArabic ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "N/A")}</p>
        </div>

        <div>
          <strong>{isArabic ? "\u0646\u0645\u0637 \u0627\u0644\u062e\u0637\u0648\u0631\u0629" : "Risk Pattern"}</strong>
          <p>{riskPattern}</p>
        </div>

        <div>
          <strong>{isArabic ? "\u0627\u0644\u0641\u0631\u0635\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629" : "Main Opportunity"}</strong>
          <p>{opportunityTitle}</p>
        </div>
      </div>

      <div
        style={{
          marginTop: "18px",
          padding: "14px",
          borderRadius: "14px",
          background: "rgba(248, 250, 252, 0.85)",
          textAlign: isArabic ? "right" : "left",
        }}
      >
        <strong>{isArabic ? "\u0623\u0641\u0636\u0644 \u062e\u0637\u0648\u0629 \u062a\u0627\u0644\u064a\u0629" : "Best Next Action"}</strong>
        <p style={{ marginTop: "8px" }}>{bestNextAction}</p>
      </div>
    </div>
  );
}
