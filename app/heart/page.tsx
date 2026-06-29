"use client";

import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Language = "en" | "ar";

type RiskResult = {
  score: number;
  level: string;
  message: string;
};

export default function HeartPage() {
  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

  const [age, setAge] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [cholesterol, setCholesterol] = useState("");
  const [diabetes, setDiabetes] = useState("No");
  const [smoking, setSmoking] = useState("No");
  const [saveMessage, setSaveMessage] = useState("");

  const [result, setResult] = useState<null | RiskResult>(null);

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

  function localizeRiskLevel(level: string) {
    if (!isArabic) return level;

    if (level === "Low Risk") return "خطورة منخفضة";
    if (level === "Moderate Risk") return "خطورة متوسطة";
    if (level === "High Risk") return "خطورة مرتفعة";

    return level;
  }

  function localizeRiskMessage(level: string, fallback: string) {
    if (!isArabic) return fallback;

    if (level === "Low Risk") {
      return "تشير المدخلات الحالية إلى نمط خطورة قلبية أقل. استمر بالعادات الصحية والفحوصات الوقائية الدورية.";
    }

    if (level === "Moderate Risk") {
      return "تشير مدخلاتك إلى وجود بعض عوامل الخطورة القلبية. يُفضّل مناقشة هذه النتائج مع مختص صحي.";
    }

    if (level === "High Risk") {
      return "تشير مدخلاتك إلى وجود عدة عوامل خطورة قلبية. هذا لا يعني تشخيص مرض، لكنه مؤشر مهم لطلب استشارة طبية متخصصة.";
    }

    return fallback;
  }

  async function saveAssessment(score: number, level: string, message: string) {
    setSaveMessage(text("Saving heart assessment...", "جاري حفظ تقييم القلب..."));

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
          "Result calculated locally. Please login to save it.",
          "تم حساب النتيجة محليًا. يرجى تسجيل الدخول لحفظها."
        )
      );
      return;
    }

    const { error: upsertError } = await supabase
      .from("organ_assessments")
      .upsert(
        {
          user_id: user.id,
          organ_name: "Heart",
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
      module_name: "Heart",
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
      text(
        "Heart assessment saved successfully and added to history.",
        "تم حفظ تقييم القلب بنجاح وإضافته إلى التاريخ الصحي."
      )
    );
  }

  async function calculateRisk() {
    setSaveMessage("");

    if (!age || !bloodPressure || !cholesterol) {
      setSaveMessage(
        text(
          "Please complete all required fields.",
          "يرجى تعبئة جميع الحقول المطلوبة."
        )
      );
      return;
    }

    const ageNumber = Number(age);
    const bpNumber = Number(bloodPressure);
    const cholesterolNumber = Number(cholesterol);

    if (ageNumber <= 0 || bpNumber <= 0 || cholesterolNumber <= 0) {
      setSaveMessage(
        text("Please enter valid numbers.", "يرجى إدخال أرقام صحيحة.")
      );
      return;
    }

    let riskPoints = 0;

    if (ageNumber >= 45) riskPoints += 15;
    if (ageNumber >= 60) riskPoints += 15;

    if (bpNumber >= 130) riskPoints += 15;
    if (bpNumber >= 140) riskPoints += 15;

    if (cholesterolNumber >= 200) riskPoints += 15;
    if (cholesterolNumber >= 240) riskPoints += 15;

    if (diabetes === "Yes") riskPoints += 15;
    if (smoking === "Yes") riskPoints += 15;

    const score = Math.max(0, 100 - riskPoints);

    let level = "Low Risk";
    let message =
      "Your current inputs suggest a lower cardiovascular risk pattern. Continue healthy habits and regular preventive checkups.";

    if (score < 70 && score >= 40) {
      level = "Moderate Risk";
      message =
        "Your inputs suggest some cardiovascular risk factors. Consider discussing these results with a healthcare professional.";
    }

    if (score < 40) {
      level = "High Risk";
      message =
        "Your inputs suggest multiple cardiovascular risk factors. This does not diagnose disease, but it is important to seek professional medical advice.";
    }

    setResult({
      score,
      level,
      message,
    });

    localStorage.setItem("heartScore", String(score));
    localStorage.setItem("heartLevel", level);

    await saveAssessment(score, level, message);
  }

  return (
    <main className="assistantPage" dir={isArabic ? "rtl" : "ltr"}>
      <div className="assistantContainer">
        <PageBackActions />

        <div className="assistantHeader">
          <div>
            <p className="assistantBadge">
              {text("HEART HEALTH ASSESSMENT", "تقييم صحة القلب")}
            </p>

            <h1>{text("Heart Risk Assessment", "تقييم خطورة القلب")}</h1>

            <p>
              {text(
                "Complete the form below to evaluate cardiovascular risk factors and receive educational guidance.",
                "أكمل النموذج التالي لتقييم عوامل خطورة القلب والأوعية الدموية والحصول على إرشاد تعليمي."
              )}
            </p>
          </div>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>{text("Age", "العمر")}</label>
              <input
                type="number"
                placeholder={text("Enter your age", "أدخل عمرك")}
                value={age}
                onChange={(event) => setAge(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>
                {text("Systolic Blood Pressure", "ضغط الدم الانقباضي")}
              </label>
              <input
                type="number"
                placeholder={text("e.g. 120", "مثال: 120")}
                value={bloodPressure}
                onChange={(event) => setBloodPressure(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>{text("Total Cholesterol", "الكوليسترول الكلي")}</label>
              <input
                type="number"
                placeholder={text("e.g. 180", "مثال: 180")}
                value={cholesterol}
                onChange={(event) => setCholesterol(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>
                {text("Do you have Diabetes?", "هل لديك مرض السكري؟")}
              </label>
              <select
                value={diabetes}
                onChange={(event) => setDiabetes(event.target.value)}
              >
                <option value="No">{text("No", "لا")}</option>
                <option value="Yes">{text("Yes", "نعم")}</option>
              </select>
            </div>

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

            <button className="primaryBtn" onClick={calculateRisk}>
              {text("Calculate Heart Risk", "احسب خطورة القلب")}
            </button>

            {saveMessage && <p>{saveMessage}</p>}
          </div>

          {result && (
            <div className="resultBox">
              <p className="sectionLabel">
                {text("Heart Health Score", "مؤشر صحة القلب")}
              </p>
              <h2>{result.score}/100</h2>
              <h3>{localizeRiskLevel(result.level)}</h3>
              <p>{localizeRiskMessage(result.level, result.message)}</p>

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
