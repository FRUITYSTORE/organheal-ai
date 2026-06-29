"use client";

import Link from "next/link";
import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";

type Language = "en" | "ar";

export default function AssessmentPage() {
  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

  useEffect(() => {
    function syncLanguage() {
      const savedLanguage =
        (localStorage.getItem("organheal-language") as Language | null) || "en";

      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
      document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
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
    <main className="assistantPage" dir={isArabic ? "rtl" : "ltr"}>
      <div className="assistantContainer">
        <PageBackActions />

        <div className="assistantHeader">
          <p className="assistantBadge">
            {text("ORGAN HEALTH ASSESSMENT", "تقييم صحة الأعضاء")}
          </p>

          <h1>
            {text("Evaluate Your Organ Health", "قيّم صحة أعضائك")}
          </h1>

          <p>
            {text(
              "Explore key health indicators related to your heart, liver, kidneys, lungs, brain, and metabolic health.",
              "استكشف المؤشرات الصحية الرئيسية المرتبطة بالقلب، الكبد، الكلى، الرئة، الدماغ، وصحة الأيض."
            )}
          </p>

          <div className="buttons">
            <Link href="/history">
              <button className="primaryBtn">
                {text("View Progress Timeline", "عرض مسار التقدم")}
              </button>
            </Link>
          </div>
        </div>

        <div className="featureGrid">
          <Link href="/heart" className="featureCard">
            <div className="iconBox">❤️</div>
            <h3>{text("Heart Health", "صحة القلب")}</h3>
            <p>
              {text(
                "Blood pressure, cholesterol, activity level, and cardiovascular risk factors.",
                "ضغط الدم، الكوليسترول، مستوى النشاط، وعوامل خطورة القلب والأوعية الدموية."
              )}
            </p>
          </Link>

          <Link href="/lung" className="featureCard">
            <div className="iconBox">🫁</div>
            <h3>{text("Lung Health", "صحة الرئة")}</h3>
            <p>
              {text(
                "Breathing symptoms, smoking exposure, and respiratory wellbeing.",
                "أعراض التنفس، التعرض للتدخين، وصحة الجهاز التنفسي."
              )}
            </p>
          </Link>

          <Link href="/kidney" className="featureCard">
            <div className="iconBox">🫘</div>
            <h3>{text("Kidney Health", "صحة الكلى")}</h3>
            <p>
              {text(
                "Creatinine, hydration, blood pressure, and kidney function indicators.",
                "الكرياتينين، الترطيب، ضغط الدم، ومؤشرات وظائف الكلى."
              )}
            </p>
          </Link>

          <Link href="/liver" className="featureCard">
            <div className="iconBox">🟤</div>
            <h3>{text("Liver Health", "صحة الكبد")}</h3>
            <p>
              {text(
                "Liver enzymes, lifestyle factors, and metabolic health insights.",
                "إنزيمات الكبد، عوامل نمط الحياة، ومؤشرات الصحة الأيضية."
              )}
            </p>
          </Link>

          <Link href="/brain" className="featureCard">
            <div className="iconBox">🧠</div>
            <h3>{text("Brain Health", "صحة الدماغ")}</h3>
            <p>
              {text(
                "Sleep, stress, memory, and cognitive wellbeing.",
                "النوم، التوتر، الذاكرة، والصحة الذهنية."
              )}
            </p>
          </Link>

          <Link href="/metabolic" className="featureCard">
            <div className="iconBox">⚖️</div>
            <h3>{text("Metabolic Health", "صحة الأيض")}</h3>
            <p>
              {text(
                "Blood sugar, weight management, and overall metabolic balance.",
                "سكر الدم، إدارة الوزن، والتوازن الأيضي العام."
              )}
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
