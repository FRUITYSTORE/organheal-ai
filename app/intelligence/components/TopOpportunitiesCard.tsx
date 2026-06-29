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

function localizeHealthValue(value: string | null | undefined, isArabic: boolean) {
  if (!isArabic) return value || "N/A";

  const clean = (value || "").trim();

  if (!clean) return "غير متاح";

  const exact: Record<string, string> = {
    "Balanced Health Profile": "ملف صحي متوازن",
    "Balanced Health Age": "عمر صحي متوازن",

    Liver: "الكبد",
    Lung: "الرئة",
    Heart: "القلب",
    Kidney: "الكلى",
    Brain: "الدماغ",
    Metabolic: "الأيض",

    "Liver Health": "صحة الكبد",
    "Lung Health": "صحة الرئة",
    "Heart Health": "صحة القلب",
    "Kidney Health": "صحة الكلى",

    "Support Liver Health": "دعم صحة الكبد",
    "Improve Lung Health": "تحسين صحة الرئة",
    "Improve Heart Health": "تحسين صحة القلب",
    "Support Kidney Health": "دعم صحة الكلى",
    "Improve Kidney Health": "تحسين صحة الكلى",

    "General Health Monitoring Pattern": "نمط متابعة صحية عامة",
    "Preventive Health Monitoring": "متابعة صحية وقائية",
    "Preventive Monitoring Pattern": "نمط متابعة وقائية",

    Low: "منخفضة",
    Moderate: "متوسطة",
    High: "مرتفعة",
    "8+": "+8",
    "N/A": "غير متاح",
  };

  if (exact[clean]) return exact[clean];

  const lower = clean.toLowerCase();

  if (lower.includes("nutrition") && lower.includes("liver")) {
    return "ركز على التغذية، ضبط الوزن، وتقليل العوامل التي قد ترهق الكبد.";
  }

  if (lower.includes("smoke") || lower.includes("pollution") || lower.includes("cough") || lower.includes("wheezing")) {
    return "قلل التعرض للدخان أو التلوث، وراقب السعال أو الصفير أو ضيق التنفس.";
  }

  if (lower.includes("blood pressure") || lower.includes("cholesterol") || lower.includes("regular activity")) {
    return "ركز على ضغط الدم، الكوليسترول، النشاط المنتظم، والمتابعة الوقائية.";
  }

  if (lower.includes("hydration") || lower.includes("kidney")) {
    return "استمر بترطيب الجسم ومتابعة ضغط الدم ومؤشرات الكلى عند الحاجة.";
  }

  if (lower.includes("general health monitoring")) {
    return "نمط متابعة صحية عامة";
  }

  return clean;
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
    window.addEventListener("click", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("focus", syncLanguage);
      window.removeEventListener("click", syncLanguage);
    };
  }, []);

  const isArabic = language === "ar";

  return (
    <div className="resultBox" dir={isArabic ? "rtl" : "ltr"} lang={isArabic ? "ar" : "en"}>
      <p className="sectionLabel">
        {isArabic ? "لقطة الذكاء الصحي" : "🏆 HEALTH INTELLIGENCE SNAPSHOT"}
      </p>

      <h2>{isArabic ? "أهم فرص التحسين" : "Top Opportunities"}</h2>

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
          <strong>{isArabic ? "أقوى منطقة" : "Strongest Area"}</strong>
          <p>{strongestOrgan ? localizeHealthValue(strongestOrgan, isArabic) : isArabic ? "غير متاح" : "N/A"}</p>
        </div>

        <div>
          <strong>{isArabic ? "نمط الخطورة" : "Risk Pattern"}</strong>
          <p>{localizeHealthValue(riskPattern, isArabic)}</p>
        </div>

        <div>
          <strong>{isArabic ? "فرصة التحسين" : "Potential Gain"}</strong>
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
            <h3>{localizeHealthValue(item.title, isArabic)}</h3>

            <p>
              {isArabic ? "الحالي" : "Current"}: {item.currentScore}/100{" "}
              → {isArabic ? "المحتمل" : "Potential"}: {item.potentialScore}/100
            </p>

            <p>
              {isArabic ? "الأولوية" : "Priority"}:{" "}
              <strong>{localizeHealthValue(item.priority, isArabic)}</strong>
            </p>

            <p>{localizeHealthValue(item.action, isArabic)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
