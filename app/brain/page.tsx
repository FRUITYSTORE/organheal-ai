"use client";

import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Language = "en" | "ar";

type BrainResult = {
  score: number;
  level: string;
  message: string;
};

export default function BrainPage() {
  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

  const [sleep, setSleep] = useState("Good");
  const [stress, setStress] = useState("Low");
  const [memory, setMemory] = useState("No");
  const [headache, setHeadache] = useState("No");
  const [activity, setActivity] = useState("Good");
  const [saveMessage, setSaveMessage] = useState("");

  const [result, setResult] = useState<null | BrainResult>(null);

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

    if (level === "Good Brain Health Pattern") return "نمط صحي جيد للدماغ";
    if (level === "Moderate Brain Wellness Risk") return "خطورة متوسطة لصحة الدماغ";
    if (level === "Higher Brain Wellness Risk") return "خطورة أعلى لصحة الدماغ";

    return level;
  }

  function localizeMessage(level: string, fallback: string) {
    if (!isArabic) return fallback;

    if (level === "Good Brain Health Pattern") {
      return "تشير إجاباتك إلى نمط صحي أفضل لصحة الدماغ بشكل عام. استمر بالنوم الجيد، التحكم بالتوتر، النشاط البدني، والمتابعة عند ظهور أعراض.";
    }

    if (level === "Moderate Brain Wellness Risk") {
      return "تشير إجاباتك إلى وجود بعض عوامل الخطورة المرتبطة بصحة الدماغ مثل النوم، التوتر، الصداع، أو التركيز والذاكرة. يُفضّل تحسين نمط الحياة وطلب نصيحة مختص إذا استمرت الأعراض.";
    }

    if (level === "Higher Brain Wellness Risk") {
      return "تشير إجاباتك إلى وجود عدة عوامل خطورة مرتبطة بصحة الدماغ. هذه الأداة لا تشخّص المرض، لكن يُنصح بالتقييم الطبي إذا كانت الأعراض مستمرة أو تزداد.";
    }

    return fallback;
  }

  async function saveAssessment(score: number, level: string, message: string) {
    setSaveMessage(text("Saving brain assessment...", "جاري حفظ تقييم الدماغ..."));

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
          organ_name: "Brain",
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
      module_name: "Brain",
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
      text("Brain assessment saved successfully.", "تم حفظ تقييم الدماغ بنجاح.")
    );
  }

  async function calculateBrainScore() {
    setSaveMessage("");

    let riskPoints = 0;

    if (sleep === "Poor") riskPoints += 20;
    if (stress === "Moderate") riskPoints += 15;
    if (stress === "High") riskPoints += 30;
    if (memory === "Yes") riskPoints += 20;
    if (headache === "Yes") riskPoints += 15;
    if (activity === "Poor") riskPoints += 15;

    const score = Math.max(0, 100 - riskPoints);

    let level = "Good Brain Health Pattern";
    let message =
      "Your answers suggest a generally healthier brain wellness pattern. Continue good sleep, stress control, physical activity, and regular checkups when symptoms appear.";

    if (score < 75 && score >= 45) {
      level = "Moderate Brain Wellness Risk";
      message =
        "Your answers suggest some brain wellness risk factors such as sleep, stress, headaches, or memory concerns. Consider lifestyle improvement and professional advice if symptoms continue.";
    }

    if (score < 45) {
      level = "Higher Brain Wellness Risk";
      message =
        "Your answers suggest multiple brain wellness risk factors. This tool does not diagnose disease, but medical evaluation is recommended if symptoms are persistent or worsening.";
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
            {text("BRAIN HEALTH ASSESSMENT", "تقييم صحة الدماغ")}
          </p>
          <h1>{text("Brain Health Assessment", "تقييم صحة الدماغ")}</h1>
          <p>
            {text(
              "Evaluate brain wellness factors including sleep, stress, memory, headaches, and activity level.",
              "قيّم عوامل صحة الدماغ مثل النوم، التوتر، الذاكرة، الصداع، ومستوى النشاط."
            )}
          </p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>{text("Sleep Quality", "جودة النوم")}</label>
              <select
                value={sleep}
                onChange={(event) => setSleep(event.target.value)}
              >
                <option value="Good">{text("Good", "جيد")}</option>
                <option value="Moderate">{text("Moderate", "متوسط")}</option>
                <option value="Poor">{text("Poor", "ضعيف")}</option>
              </select>
            </div>

            <div className="formGroup">
              <label>{text("Stress Level", "مستوى التوتر")}</label>
              <select
                value={stress}
                onChange={(event) => setStress(event.target.value)}
              >
                <option value="Low">{text("Low", "منخفض")}</option>
                <option value="Moderate">{text("Moderate", "متوسط")}</option>
                <option value="High">{text("High", "مرتفع")}</option>
              </select>
            </div>

            <div className="formGroup">
              <label>
                {text(
                  "Memory or concentration problems?",
                  "هل توجد مشاكل في الذاكرة أو التركيز؟"
                )}
              </label>
              <select
                value={memory}
                onChange={(event) => setMemory(event.target.value)}
              >
                <option value="No">{text("No", "لا")}</option>
                <option value="Yes">{text("Yes", "نعم")}</option>
              </select>
            </div>

            <div className="formGroup">
              <label>{text("Frequent headaches?", "هل يوجد صداع متكرر؟")}</label>
              <select
                value={headache}
                onChange={(event) => setHeadache(event.target.value)}
              >
                <option value="No">{text("No", "لا")}</option>
                <option value="Yes">{text("Yes", "نعم")}</option>
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

            <button className="primaryBtn" onClick={calculateBrainScore}>
              {text("Calculate Brain Score", "احسب مؤشر الدماغ")}
            </button>

            {saveMessage && <p>{saveMessage}</p>}
          </div>

          {result && (
            <div className="resultBox">
              <p className="sectionLabel">
                {text("Brain Health Score", "مؤشر صحة الدماغ")}
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
