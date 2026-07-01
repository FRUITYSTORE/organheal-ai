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

function getPriorityTone(priority: string) {
  const normalized = priority.toLowerCase();

  if (normalized.includes("high")) return "risk";
  if (normalized.includes("moderate")) return "moderate";
  if (normalized.includes("low")) return "good";

  return "neutral";
}

export default function TopOpportunitiesCard({
  strongestOrgan,
  riskPattern,
  potentialGain,
  opportunities,
}: TopOpportunitiesCardProps) {
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

  return (
    <section className="ohCard" dir={isArabic ? "rtl" : "ltr"} lang={isArabic ? "ar" : "en"}>
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">
            {text("Health Analysis Snapshot", "لقطة التحليل الصحي")}
          </p>

          <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
            {text("Top Opportunities", "أهم فرص التحسين")}
          </h2>
        </div>

        <span className={`ohStatusBadge ${potentialGain >= 8 ? "good" : "moderate"}`}>
          +{potentialGain} {text("potential", "فرصة")}
        </span>
      </div>

      <p className="ohCardText">
        {text(
          "This snapshot highlights the strongest area, current risk pattern, and the most useful improvement opportunities.",
          "هذه اللقطة توضّح أقوى منطقة صحية، نمط المخاطر الحالي، وأهم فرص التحسين المفيدة."
        )}
      </p>

      <div className="ohMetricGrid" style={{ marginTop: "18px" }}>
        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text("Strongest Area", "أقوى منطقة")}
          </span>
          <span className="ohMetricHint">
            {strongestOrgan
              ? localizeHealthValue(strongestOrgan, isArabic)
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
            {text("Potential Gain", "فرصة التحسين")}
          </span>
          <span className="ohMetricValue">+{potentialGain}</span>
          <span className="ohMetricHint">
            {text("Estimated improvement room", "مساحة التحسين المتوقعة")}
          </span>
        </article>
      </div>

      <div className="ohDivider" />

      {opportunities.length === 0 ? (
        <div className="ohEmptyState">
          <h3>{text("No opportunities available yet", "لا توجد فرص تحسين بعد")}</h3>
          <p>
            {text(
              "Complete more assessments or upload reports to generate stronger opportunities.",
              "أكمل المزيد من التقييمات أو ارفع تقارير للحصول على فرص تحسين أوضح."
            )}
          </p>
        </div>
      ) : (
        <div className="ohStack">
          {opportunities.map((item) => {
            const priorityTone = getPriorityTone(item.priority);
            const currentTone = getScoreTone(item.currentScore);
            const potentialTone = getScoreTone(item.potentialScore);

            return (
              <article className="ohMetricCard" key={`${item.organ}-${item.title}`}>
                <div className="ohCardHeader">
                  <div>
                    <p className="ohMetricLabel">
                      {localizeHealthValue(item.organ, isArabic)}
                    </p>

                    <h3 className="ohCardTitle" style={{ fontSize: "1.18rem", marginTop: "6px" }}>
                      {localizeHealthValue(item.title, isArabic)}
                    </h3>
                  </div>

                  <span className={`ohStatusBadge ${priorityTone}`}>
                    {text("Priority:", "الأولوية:")}{" "}
                    {localizeHealthValue(item.priority, isArabic)}
                  </span>
                </div>

                <div className="ohMetricGrid" style={{ marginTop: "14px" }}>
                  <div className="ohMetricCard">
                    <span className="ohMetricLabel">
                      {text("Current", "الحالي")}
                    </span>
                    <span className={`ohStatusBadge ${currentTone}`}>
                      {item.currentScore}/100
                    </span>
                  </div>

                  <div className="ohMetricCard">
                    <span className="ohMetricLabel">
                      {text("Potential", "المحتمل")}
                    </span>
                    <span className={`ohStatusBadge ${potentialTone}`}>
                      {item.potentialScore}/100
                    </span>
                  </div>

                  <div className="ohMetricCard">
                    <span className="ohMetricLabel">
                      {text("Gain", "التحسين")}
                    </span>
                    <span className="ohMetricValue">+{item.potentialGain}</span>
                  </div>
                </div>

                <div className="ohDivider" />

                <div className="ohTrustNotice">
                  <span aria-hidden="true">🎯</span>
                  <div>
                    <strong>{text("Suggested action", "الإجراء المقترح")}</strong>
                    <br />
                    {localizeHealthValue(item.action, isArabic)}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}


