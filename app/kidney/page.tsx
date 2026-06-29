"use client";

import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Language = "en" | "ar";

type KidneyResult = {
  score: number;
  level: string;
  message: string;
};

export default function KidneyPage() {
  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

  const [creatinine, setCreatinine] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [diabetes, setDiabetes] = useState("No");
  const [swelling, setSwelling] = useState("No");
  const [hydration, setHydration] = useState("Good");
  const [saveMessage, setSaveMessage] = useState("");

  const [result, setResult] = useState<null | KidneyResult>(null);

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

    if (level === "Good Kidney Health Pattern") return "نمط صحي جيد للكلى";
    if (level === "Moderate Kidney Risk") return "خطورة كلوية متوسطة";
    if (level === "Higher Kidney Risk") return "خطورة كلوية أعلى";

    return level;
  }

  function localizeMessage(level: string, fallback: string) {
    if (!isArabic) return fallback;

    if (level === "Good Kidney Health Pattern") {
      return "تشير إجاباتك إلى نمط صحي أفضل للكلى بشكل عام. استمر بالترطيب، مراقبة ضغط الدم، والفحوصات الدورية.";
    }

    if (level === "Moderate Kidney Risk") {
      return "تشير إجاباتك إلى وجود بعض عوامل الخطورة المرتبطة بالكلى. يُفضّل مناقشة وظائف الكلى، ضغط الدم، وفحوصات البول مع مختص صحي.";
    }

    if (level === "Higher Kidney Risk") {
      return "تشير إجاباتك إلى وجود عدة عوامل خطورة مرتبطة بالكلى. هذه الأداة لا تشخّص المرض، لكن يُنصح بالتقييم الطبي.";
    }

    return fallback;
  }

  async function saveAssessment(score: number, level: string, message: string) {
    setSaveMessage(text("Saving kidney assessment...", "جاري حفظ تقييم الكلى..."));

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
          organ_name: "Kidney",
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
      module_name: "Kidney",
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
        "Kidney assessment saved successfully.",
        "تم حفظ تقييم الكلى بنجاح."
      )
    );
  }

  async function calculateKidneyScore() {
    setSaveMessage("");

    if (!creatinine || !bloodPressure) {
      setSaveMessage(
        text(
          "Please complete all required fields.",
          "يرجى تعبئة جميع الحقول المطلوبة."
        )
      );
      return;
    }

    const creatinineNumber = Number(creatinine);
    const bpNumber = Number(bloodPressure);

    if (creatinineNumber <= 0 || bpNumber <= 0) {
      setSaveMessage(
        text("Please enter valid numbers.", "يرجى إدخال أرقام صحيحة.")
      );
      return;
    }

    let riskPoints = 0;

    if (creatinineNumber > 1.2) riskPoints += 20;
    if (creatinineNumber > 1.5) riskPoints += 20;
    if (bpNumber >= 130) riskPoints += 15;
    if (bpNumber >= 140) riskPoints += 15;
    if (diabetes === "Yes") riskPoints += 15;
    if (swelling === "Yes") riskPoints += 15;
    if (hydration === "Poor") riskPoints += 10;

    const score = Math.max(0, 100 - riskPoints);

    let level = "Good Kidney Health Pattern";
    let message =
      "Your answers suggest a generally healthier kidney risk pattern. Continue hydration, blood pressure monitoring, and regular checkups.";

    if (score < 75 && score >= 45) {
      level = "Moderate Kidney Risk";
      message =
        "Your answers suggest some kidney-related risk factors. Consider discussing kidney function, blood pressure, and urine tests with a healthcare professional.";
    }

    if (score < 45) {
      level = "Higher Kidney Risk";
      message =
        "Your answers suggest multiple kidney-related risk factors. This tool does not diagnose disease, but medical evaluation is recommended.";
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
            {text("KIDNEY HEALTH ASSESSMENT", "تقييم صحة الكلى")}
          </p>
          <h1>{text("Kidney Health Assessment", "تقييم صحة الكلى")}</h1>
          <p>
            {text(
              "Evaluate kidney-related risk factors including creatinine, blood pressure, hydration, diabetes, and swelling.",
              "قيّم عوامل الخطورة المرتبطة بالكلى مثل الكرياتينين، ضغط الدم، الترطيب، السكري، والتورم."
            )}
          </p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>{text("Creatinine", "الكرياتينين")}</label>
              <input
                type="number"
                placeholder={text("e.g. 1.0", "مثال: 1.0")}
                value={creatinine}
                onChange={(event) => setCreatinine(event.target.value)}
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
              <label>
                {text("Leg or body swelling?", "هل يوجد تورم في الساق أو الجسم؟")}
              </label>
              <select
                value={swelling}
                onChange={(event) => setSwelling(event.target.value)}
              >
                <option value="No">{text("No", "لا")}</option>
                <option value="Yes">{text("Yes", "نعم")}</option>
              </select>
            </div>

            <div className="formGroup">
              <label>{text("Hydration Level", "مستوى الترطيب")}</label>
              <select
                value={hydration}
                onChange={(event) => setHydration(event.target.value)}
              >
                <option value="Good">{text("Good", "جيد")}</option>
                <option value="Moderate">{text("Moderate", "متوسط")}</option>
                <option value="Poor">{text("Poor", "ضعيف")}</option>
              </select>
            </div>

            <button className="primaryBtn" onClick={calculateKidneyScore}>
              {text("Calculate Kidney Score", "احسب مؤشر الكلى")}
            </button>

            {saveMessage && <p>{saveMessage}</p>}
          </div>

          {result && (
            <div className="resultBox">
              <p className="sectionLabel">
                {text("Kidney Health Score", "مؤشر صحة الكلى")}
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
