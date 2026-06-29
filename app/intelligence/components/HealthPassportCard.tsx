"use client";

import { useEffect, useState } from "react";

type HealthPassportCardProps = {
  healthProfile: string;
  overallScore: number;
  healthAgeStatus: string;
  priorityOrgan: string | null;
  potentialScore: number;
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

export default function HealthPassportCard({
  healthProfile,
  overallScore,
  healthAgeStatus,
  priorityOrgan,
  potentialScore,
}: HealthPassportCardProps) {
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
        {isArabic ? "\u062c\u0648\u0627\u0632 \u0627\u0644\u0635\u062d\u0629" : "🪪 HEALTH PASSPORT"}
      </p>

      <h2>{healthProfile}</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
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
          <strong>{isArabic ? "\u0627\u0644\u0639\u0645\u0631 \u0627\u0644\u0635\u062d\u064a" : "Health Age"}</strong>
          <p>{healthAgeStatus}</p>
        </div>

        <div>
          <strong>{isArabic ? "\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0623\u0648\u0644\u0648\u064a\u0629" : "Priority Area"}</strong>
          <p>{priorityOrgan || (isArabic ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "N/A")}</p>
        </div>

        <div>
          <strong>{isArabic ? "\u0627\u0644\u0646\u062a\u064a\u062c\u0629 \u0627\u0644\u0645\u062d\u062a\u0645\u0644\u0629" : "Potential Score"}</strong>
          <p>{potentialScore}/100</p>
        </div>
      </div>
    </div>
  );
}
