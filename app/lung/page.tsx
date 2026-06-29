"use client";

import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Language = "en" | "ar";

type LungResult = {
  score: number;
  level: string;
  message: string;
};

export default function LungPage() {
  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

  const [smoking, setSmoking] = useState("No");
  const [shortnessOfBreath, setShortnessOfBreath] = useState("No");
  const [chronicCough, setChronicCough] = useState("No");
  const [asthma, setAsthma] = useState("No");
  const [activityLevel, setActivityLevel] = useState("Good");
  const [saveMessage, setSaveMessage] = useState("");

  const [result, setResult] = useState<null | LungResult>(null);

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

  function localizeLevel(level: string) {
    if (!isArabic) return level;

    if (level === "Good Lung Health Pattern") return "نمط صحي جيد للرئة";
    if (level === "Moderate Respiratory Risk") return "خطورة تنفسية متوسطة";
    if (level === "Higher Respiratory Risk") return "خطورة تنفسية أعلى";

    return level;
  }

  function localizeMessage(level: string, fallback: string) {
    if (!isArabic) return fallback;

    if (level === "Good Lung Health Pattern") {
      return "تشير إجاباتك إلى نمط تنفسي صحي أفضل بشكل عام. استمر بتجنب التعرض للدخان، المحافظة على النشاط، وطلب الفحص عند ظهور أعراض.";
    }

    if (level === "Moderate Respiratory Risk") {
      return "تشير إجاباتك إلى وجود بعض عوامل الخطورة التنفسية. يُفضّل مناقشة أعراض مثل السعال، الصفير، أو ضيق النفس مع مختص صحي.";
    }

    if (level === "Higher Respiratory Risk") {
      return "تشير إجاباتك إلى وجود عدة عوامل خطورة تنفسية. هذه الأداة لا تشخّص المرض، لكن يُنصح بالتقييم الطبي إذا كانت الأعراض مستمرة أو تزداد.";
    }

    return fallback;
  }

  async function saveAssessment(score: number, level: string, message: string) {
    setSaveMessage(text("Saving lung assessment...", "جاري حفظ تقييم الرئة..."));

    const { data, error: userError } = await supabase.auth.getUser();

    if (userError) {
      setSaveMessage(
        text("Auth error: ", "خطأ في تسجيل الدخول: ") + userError.message
      );
      return;
    }

    const user = data.user;

    if (!user) {
      setSaveMessage(
        text(
          "Please login to save your assessment.",
          "يرجى تسجيل الدخول لحفظ التقييم."
        )
      );
      return;
    }

    const { error: upsertError } = await supabase
      .from("organ_assessments")
      .upsert(
        {
          user_id: user.id,
          organ_name: "Lung",
          score: score,
          risk_level: level,
          notes: message,
        },
        {
          onConflict: "user_id,organ_name",
        }
      );

    if (upsertError) {
      setSaveMessage(
        text("Database error: ", "خطأ في قاعدة البيانات: ") + upsertError.message
      );
      return;
    }

    const { error: historyError } = await supabase.from("health_history").insert({
      user_id: user.id,
      module_name: "Lung",
      score: score,
      status: level,
      notes: message,
    });

    if (historyError) {
      setSaveMessage(
        text("History error: ", "خطأ في التاريخ الصحي: ") + historyError.message
      );
      return;
    }

    setSaveMessage(
      text("Lung assessment saved successfully.", "تم حفظ تقييم الرئة بنجاح.")
    );
  }

  async function calculateLungScore() {
    let riskPoints = 0;

    if (smoking === "Yes") riskPoints += 25;
    if (shortnessOfBreath === "Yes") riskPoints += 20;
    if (chronicCough === "Yes") riskPoints += 20;
    if (asthma === "Yes") riskPoints += 15;
    if (activityLevel === "Poor") riskPoints += 15;

    const score = Math.max(0, 100 - riskPoints);

    let level = "Good Lung Health Pattern";
    let message =
      "Your answers suggest a generally healthier respiratory pattern. Continue avoiding smoke exposure, staying active, and seeking checkups when symptoms appear.";

    if (score < 75 && score >= 45) {
      level = "Moderate Respiratory Risk";
      message =
        "Your answers suggest some respiratory risk factors. Consider discussing symptoms such as cough, wheezing, or shortness of breath with a healthcare professional.";
    }

    if (score < 45) {
      level = "Higher Respiratory Risk";
      message =
        "Your answers suggest multiple respiratory risk factors. This tool does not diagnose disease, but medical evaluation is recommended if symptoms are persistent or worsening.";
    }

    setResult({ score, level, message });

    await saveAssessment(score, level, message);
  }

  return (
    <main className="assistantPage" dir={isArabic ? "rtl" : "ltr"}>
      <div className="assistantContainer">
        <PageBackActions />

        <div className="assistantHeader">
          <p className="assistantBadge">
            {text("LUNG HEALTH ASSESSMENT", "تقييم صحة الرئة")}
          </p>

          <h1>{text("Lung Health Assessment", "تقييم صحة الرئة")}</h1>

          <p>
            {text(
              "Answer a few questions about breathing, symptoms, smoking exposure, and activity level to receive educational respiratory health guidance.",
              "أجب عن بعض الأسئلة حول التنفس، الأعراض، التعرض للتدخين، ومستوى النشاط للحصول على إرشاد تعليمي لصحة الجهاز التنفسي."
            )}
          </p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>{text("Do you Smoke?", "هل تدخن؟")}</label>
              <select
                value={smoking}
                onChange={(event) => setSmoking(event.target.value)}
              >
                <option value="No">{text("No", "لا")}</option>
                <option value="Yes">{text("Yes", "نعم")}</option>
              </select>
            </div>

            <div className="formGroup">
              <label>{text("Shortness of Breath?", "هل يوجد ضيق في النفس؟")}</label>
              <select
                value={shortnessOfBreath}
                onChange={(event) => setShortnessOfBreath(event.target.value)}
              >
                <option value="No">{text("No", "لا")}</option>
                <option value="Yes">{text("Yes", "نعم")}</option>
              </select>
            </div>

            <div className="formGroup">
              <label>{text("Chronic Cough?", "هل يوجد سعال مزمن؟")}</label>
              <select
                value={chronicCough}
                onChange={(event) => setChronicCough(event.target.value)}
              >
                <option value="No">{text("No", "لا")}</option>
                <option value="Yes">{text("Yes", "نعم")}</option>
              </select>
            </div>

            <div className="formGroup">
              <label>
                {text("Asthma or Wheezing History?", "هل لديك تاريخ ربو أو صفير؟")}
              </label>
              <select
                value={asthma}
                onChange={(event) => setAsthma(event.target.value)}
              >
                <option value="No">{text("No", "لا")}</option>
                <option value="Yes">{text("Yes", "نعم")}</option>
              </select>
            </div>

            <div className="formGroup">
              <label>{text("Activity Level", "مستوى النشاط")}</label>
              <select
                value={activityLevel}
                onChange={(event) => setActivityLevel(event.target.value)}
              >
                <option value="Good">{text("Good", "جيد")}</option>
                <option value="Moderate">{text("Moderate", "متوسط")}</option>
                <option value="Poor">{text("Poor", "ضعيف")}</option>
              </select>
            </div>

            <button className="primaryBtn" onClick={calculateLungScore}>
              {text("Calculate Lung Score", "احسب مؤشر الرئة")}
            </button>

            {saveMessage && <p>{saveMessage}</p>}
          </div>

          {result && (
            <div className="resultBox">
              <p className="sectionLabel">
                {text("Lung Health Score", "مؤشر صحة الرئة")}
              </p>
              <h2>{result.score}/100</h2>
              <h3>{localizeLevel(result.level)}</h3>
              <p>{localizeMessage(result.level, result.message)}</p>

              <a href="/history">
                <button className="secondaryBtn">
                  {text("View Progress Timeline", "عرض مسار التقدم")}
                </button>
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
