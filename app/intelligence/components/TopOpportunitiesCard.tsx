"use client";

import { useEffect, useState } from "react";

type Opportunity = {
  organ: string;
  title: string;
  currentScore: number;
  potentialScore: number;
  potentialGain: number;
  priority: string;
  action: string;
};

type TopOpportunitiesCardProps = {
  strongestOrgan: string | null;
  riskPattern: string;
  potentialGain: number;
  opportunities: Opportunity[];
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

export default function TopOpportunitiesCard({
  strongestOrgan,
  riskPattern,
  potentialGain,
  opportunities,
}: TopOpportunitiesCardProps) {
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
        {isArabic ? "\u0644\u0642\u0637\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0635\u062d\u064a" : "🏆 HEALTH INTELLIGENCE SNAPSHOT"}
      </p>

      <h2>{isArabic ? "\u0623\u0647\u0645 \u0641\u0631\u0635 \u0627\u0644\u062a\u062d\u0633\u064a\u0646" : "Top Opportunities"}</h2>

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
          <strong>{isArabic ? "\u0623\u0642\u0648\u0649 \u0645\u0646\u0637\u0642\u0629" : "Strongest Area"}</strong>
          <p>{strongestOrgan || (isArabic ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d" : "N/A")}</p>
        </div>

        <div>
          <strong>{isArabic ? "\u0646\u0645\u0637 \u0627\u0644\u062e\u0637\u0648\u0631\u0629" : "Risk Pattern"}</strong>
          <p>{riskPattern}</p>
        </div>

        <div>
          <strong>{isArabic ? "\u0641\u0631\u0635\u0629 \u0627\u0644\u062a\u062d\u0633\u064a\u0646" : "Potential Gain"}</strong>
          <p>+{potentialGain}</p>
        </div>
      </div>

      <div style={{ marginTop: "20px" }}>
        {opportunities.map((item) => (
          <div
            key={item.organ}
            style={{
              padding: "16px",
              borderRadius: "16px",
              border: "1px solid rgba(148, 163, 184, 0.28)",
              marginTop: "12px",
              textAlign: isArabic ? "right" : "left",
            }}
          >
            <h3>{item.title}</h3>

            <p>
              {isArabic ? "\u0627\u0644\u062d\u0627\u0644\u064a" : "Current"}: {item.currentScore}/100{" "}
              → {isArabic ? "\u0627\u0644\u0645\u062d\u062a\u0645\u0644" : "Potential"}: {item.potentialScore}/100
            </p>

            <p>
              {isArabic ? "\u0627\u0644\u0623\u0648\u0644\u0648\u064a\u0629" : "Priority"}: <strong>{item.priority}</strong>
            </p>

            <p>{item.action}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
