"use client";

import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Language = "en" | "ar";

type MetabolicResult = {
  score: number;
  level: string;
  message: string;
};

export default function MetabolicPage() {
  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

  const [glucose, setGlucose] = useState("");
  const [cholesterol, setCholesterol] = useState("");
  const [weight, setWeight] = useState("Normal");
  const [activity, setActivity] = useState("Good");
  const [familyHistory, setFamilyHistory] = useState("No");
  const [saveMessage, setSaveMessage] = useState("");

  const [result, setResult] = useState<null | MetabolicResult>(null);

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

    if (level === "Good Metabolic Health Pattern") return "نمط أيضي صحي جيد";
    if (level === "Moderate Metabolic Risk") return "خطورة أيضية متوسطة";
    if (level === "Higher Metabolic Risk") return "خطورة أيضية أعلى";

    return level;
  }

  function localizeMessage(level: string, fallback: string) {
    if (!isArabic) return fallback;

    if (level === "Good Metabolic Health Pattern") {
      return "تشير إجاباتك إلى نمط أيضي صحي أفضل بشكل عام. استمر بالنشاط البدني، التغذية المتوازنة، والفحوصات الوقائية الدورية.";
    }

    if (level === "Moderate Metabolic Risk") {
      return "تشير إجاباتك إلى وجود بعض عوامل الخطورة الأيضية. يُفضّل متابعة السكر، الكوليسترول، الوزن، وعادات نمط الحياة بإرشاد مختص.";
    }

    if (level === "Higher Metabolic Risk") {
      return "تشير إجاباتك إلى وجود عدة عوامل خطورة أيضية. هذه الأداة لا تشخّص المرض، لكن يُنصح بالتقييم الطبي.";
    }

    return fallback;
  }

  async function saveAssessment(score: number, level: string, message: string) {
    setSaveMessage(
      text("Saving metabolic assessment...", "جاري حفظ تقييم الأيض...")
    );

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
          organ_name: "Metabolic",
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
      module_name: "Metabolic",
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
        "Metabolic assessment saved successfully.",
        "تم حفظ تقييم الأيض بنجاح."
      )
    );
  }

  async function calculateMetabolicScore() {
    setSaveMessage("");

    if (!glucose || !cholesterol) {
      setSaveMessage(
        text(
          "Please complete all required fields.",
          "يرجى تعبئة جميع الحقول المطلوبة."
        )
      );
      return;
    }

    const glucoseNumber = Number(glucose);
    const cholesterolNumber = Number(cholesterol);

    if (glucoseNumber <= 0 || cholesterolNumber <= 0) {
      setSaveMessage(
        text("Please enter valid numbers.", "يرجى إدخال أرقام صحيحة.")
      );
      return;
    }

    let riskPoints = 0;

    if (glucoseNumber >= 100) riskPoints += 20;
    if (glucoseNumber >= 126) riskPoints += 25;

    if (cholesterolNumber >= 200) riskPoints += 15;
    if (cholesterolNumber >= 240) riskPoints += 20;

    if (weight === "Overweight") riskPoints += 15;
    if (weight === "Obese") riskPoints += 25;

    if (activity === "Poor") riskPoints += 15;
    if (familyHistory === "Yes") riskPoints += 15;

    const score = Math.max(0, 100 - riskPoints);

    let level = "Good Metabolic Health Pattern";
    let message =
      "Your answers suggest a generally healthier metabolic pattern. Continue physical activity, balanced nutrition, and regular preventive checkups.";

    if (score < 75 && score >= 45) {
      level = "Moderate Metabolic Risk";
      message =
        "Your answers suggest some metabolic risk factors. Consider monitoring blood sugar, cholesterol, weight, and lifestyle habits with professional guidance.";
    }

    if (score < 45) {
      level = "Higher Metabolic Risk";
      message =
        "Your answers suggest multiple metabolic risk factors. This tool does not diagnose disease, but medical evaluation is recommended.";
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
            {text("METABOLIC HEALTH ASSESSMENT", "تقييم صحة الأيض")}
          </p>
          <h1>{text("Metabolic Health Assessment", "تقييم صحة الأيض")}</h1>
          <p>
            {text(
              "Evaluate metabolic wellness factors including glucose, cholesterol, weight pattern, activity, and family history.",
              "قيّم عوامل الصحة الأيضية مثل السكر، الكوليسترول، نمط الوزن، النشاط، والتاريخ العائلي."
            )}
          </p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>{text("Fasting Glucose", "سكر الدم الصائم")}</label>
              <input
                type="number"
                placeholder={text("e.g. 95", "مثال: 95")}
                value={glucose}
                onChange={(event) => setGlucose(event.target.value)}
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
              <label>{text("Weight Pattern", "نمط الوزن")}</label>
              <select
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
              >
                <option value="Normal">{text("Normal", "طبيعي")}</option>
                <option value="Overweight">
                  {text("Overweight", "زيادة وزن")}
                </option>
                <option value="Obese">{text("Obese", "سمنة")}</option>
              </select>
            </div>

            <div className="formGroup">
              <label>{text("Physical Activity", "النشاط البدني")}</label>
              <select
                value={activity}
                onChange={(event) => setActivity(event.target.value)}
              >
                <option value="Good">{text("Good", "جيد")}</option>
                <option value="Moderate">{text("Moderate", "متوسط")}</option>
                <option value="Poor">{text("Poor", "ضعيف")}</option>
              </select>
            </div>

            <div className="formGroup">
              <label>
                {text(
                  "Family history of diabetes or metabolic disease?",
                  "هل يوجد تاريخ عائلي للسكري أو أمراض الأيض؟"
                )}
              </label>
              <select
                value={familyHistory}
                onChange={(event) => setFamilyHistory(event.target.value)}
              >
                <option value="No">{text("No", "لا")}</option>
                <option value="Yes">{text("Yes", "نعم")}</option>
              </select>
            </div>

            <button className="primaryBtn" onClick={calculateMetabolicScore}>
              {text("Calculate Metabolic Score", "احسب مؤشر الأيض")}
            </button>

            {saveMessage && <p>{saveMessage}</p>}
          </div>

          {result && (
            <div className="resultBox">
              <p className="sectionLabel">
                {text("Metabolic Health Score", "مؤشر صحة الأيض")}
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
