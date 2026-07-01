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
    "Brain Health": "صحة الدماغ",
    "Metabolic Health": "الصحة الأيضية",

    "Support Liver Health": "دعم صحة الكبد",
    "Improve Lung Health": "تحسين صحة الرئة",
    "Improve Heart Health": "تحسين صحة القلب",
    "Support Kidney Health": "دعم صحة الكلى",
    "Improve Kidney Health": "تحسين صحة الكلى",
    "Improve Brain Health": "تحسين صحة الدماغ",
    "Improve Metabolic Health": "تحسين الصحة الأيضية",

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
    return "ركّز على التغذية، ضبط الوزن، وتقليل العوامل التي قد ترهق الكبد.";
  }

  if (
    lower.includes("smoke") ||
    lower.includes("pollution") ||
    lower.includes("cough") ||
    lower.includes("wheezing")
  ) {
    return "قلّل التعرض للدخان أو التلوث، وراقب السعال أو الصفير أو ضيق التنفس.";
  }

  if (
    lower.includes("blood pressure") ||
    lower.includes("cholesterol") ||
    lower.includes("regular activity")
  ) {
    return "ركّز على ضغط الدم، الكوليسترول، النشاط المنتظم، والمتابعة الوقائية.";
  }

  if (lower.includes("hydration") || lower.includes("kidney")) {
    return "استمر بترطيب الجسم ومتابعة ضغط الدم ومؤشرات الكلى عند الحاجة.";
  }

  if (lower.includes("general health monitoring")) {
    return "نمط متابعة صحية عامة";
  }

  return clean;
}

function getScoreTone(score: number) {
  if (score >= 75) return "good";
  if (score >= 50) return "moderate";
  return "risk";
}

export default function DoctorReadySummaryCard({
  overallScore,
  priorityOrgan,
  riskPattern,
  opportunityTitle,
  bestNextAction,
}: DoctorReadySummaryCardProps) {
  const [language, setLanguage] = useState<Language>("en");

  const isArabic = language === "ar";

  useEffect(() => {
    function syncLanguage() {
      const selectedLanguage = getStoredLanguage();

      setLanguage(selectedLanguage);
      document.documentElement.lang = selectedLanguage;
      document.documentElement.dir = selectedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
  }, []);

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  const scoreTone = getScoreTone(overallScore);

  return (
    <section
      className="ohCard"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">
            {text("Doctor Ready Summary", "ملخص جاهز للطبيب")}
          </p>

          <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
            {text("Doctor Brief", "ملخص الطبيب")}
          </h2>
        </div>

        <span className={`ohStatusBadge ${scoreTone}`}>
          {overallScore}/100
        </span>
      </div>

      <p className="ohCardText">
        {text(
          "This brief organizes the most important health analysis points to support a focused discussion with a licensed healthcare professional.",
          "هذا الملخص ينظّم أهم نقاط التحليل الصحي لدعم نقاش واضح ومركز مع مختص صحي مرخص."
        )}
      </p>

      <div className="ohMetricGrid" style={{ marginTop: "18px" }}>
        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text("Overall Score", "النتيجة العامة")}
          </span>
          <span className="ohMetricValue">{overallScore}</span>
          <span className="ohMetricHint">
            {text("Out of 100", "من 100")}
          </span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text("Priority Area", "منطقة الأولوية")}
          </span>
          <span className="ohMetricHint">
            {priorityOrgan
              ? localizeHealthValue(priorityOrgan, isArabic)
              : text("N/A", "غير متاح")}
          </span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text("Risk Pattern", "نمط الخطورة")}
          </span>
          <span className="ohMetricHint">
            {localizeHealthValue(riskPattern, isArabic)}
          </span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text("Main Opportunity", "الفرصة الرئيسية")}
          </span>
          <span className="ohMetricHint">
            {localizeHealthValue(opportunityTitle, isArabic)}
          </span>
        </article>
      </div>

      <div className="ohDivider" />

      <div className="ohTrustNotice">
        <span aria-hidden="true">🩺</span>
        <div>
          <strong>
            {text("Best Next Action", "أفضل خطوة تالية")}
          </strong>
          <br />
          {localizeHealthValue(bestNextAction, isArabic)}
        </div>
      </div>

      <div className="ohDivider" />

      <div className="ohTimeline">
        <div className="ohTimelineItem">
          <span className="ohTimelineDot" />
          <div>
            <p className="ohTimelineTitle">
              {text("Use this as a discussion aid", "استخدمه كأداة للنقاش")}
            </p>
            <p className="ohTimelineMeta">
              {text(
                "Bring this brief to your clinician to support a clearer conversation.",
                "اعرض هذا الملخص على المختص الصحي لدعم نقاش أوضح."
              )}
            </p>
          </div>
        </div>

        <div className="ohTimelineItem">
          <span className="ohTimelineDot" />
          <div>
            <p className="ohTimelineTitle">
              {text("Not a diagnosis", "ليس تشخيصًا")}
            </p>
            <p className="ohTimelineMeta">
              {text(
                "OrganHeal organizes educational signals only and does not replace clinical judgment.",
                "OrganHeal ينظّم المؤشرات التعليمية فقط ولا يستبدل الحكم الطبي السريري."
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}


