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

export default function HealthPassportCard({
  healthProfile,
  overallScore,
  healthAgeStatus,
  priorityOrgan,
  potentialScore,
}: HealthPassportCardProps) {
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

  const overallTone = getScoreTone(overallScore);
  const potentialTone = getScoreTone(potentialScore);

  return (
    <section
      className="ohCard"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">
            {text("Health Passport", "جواز الصحة")}
          </p>

          <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
            {localizeHealthValue(healthProfile, isArabic)}
          </h2>
        </div>

        <span className={`ohStatusBadge ${overallTone}`}>
          {overallScore}/100
        </span>
      </div>

      <p className="ohCardText">
        {text(
          "A compact snapshot of your current health profile, priority area, health age status, and potential improvement range.",
          "لقطة مختصرة لملفك الصحي الحالي، منطقة الأولوية، حالة العمر الصحي، ومساحة التحسين المحتملة."
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
            {text("Health Age", "العمر الصحي")}
          </span>
          <span className="ohMetricHint">
            {localizeHealthValue(healthAgeStatus, isArabic)}
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
            {text("Potential Score", "النتيجة المحتملة")}
          </span>
          <span className={`ohStatusBadge ${potentialTone}`}>
            {potentialScore}/100
          </span>
          <span className="ohMetricHint">
            {text("Estimated improvement target", "هدف التحسين المتوقع")}
          </span>
        </article>
      </div>

      <div className="ohDivider" />

      <div className="ohTimeline">
        <div className="ohTimelineItem">
          <span className="ohTimelineDot" />
          <div>
            <p className="ohTimelineTitle">
              {text("Use as a quick profile", "استخدمه كملف سريع")}
            </p>
            <p className="ohTimelineMeta">
              {text(
                "This card gives a fast view of your current OrganHeal intelligence status.",
                "هذه البطاقة تعطيك نظرة سريعة على حالة الذكاء الصحي الحالية في OrganHeal."
              )}
            </p>
          </div>
        </div>

        <div className="ohTimelineItem">
          <span className="ohTimelineDot" />
          <div>
            <p className="ohTimelineTitle">
              {text("Review trends over time", "راجع الاتجاهات مع الوقت")}
            </p>
            <p className="ohTimelineMeta">
              {text(
                "Future check-ins, reports, and assessments can make this passport more meaningful.",
                "التحديثات اليومية والتقارير والتقييمات القادمة تجعل جواز الصحة أكثر فائدة."
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
