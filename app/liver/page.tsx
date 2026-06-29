"use client";

import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Language = "en" | "ar";

type LiverResult = {
  score: number;
  level: string;
  message: string;
};

export default function LiverPage() {
  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

  const [alt, setAlt] = useState("");
  const [ast, setAst] = useState("");
  const [alcohol, setAlcohol] = useState("No");
  const [fattyLiver, setFattyLiver] = useState("No");
  const [obesity, setObesity] = useState("No");
  const [saveMessage, setSaveMessage] = useState("");

  const [result, setResult] = useState<null | LiverResult>(null);

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

    if (level === "Good Liver Health Pattern") return "نمط صحي جيد للكبد";
    if (level === "Moderate Liver Risk") return "خطورة كبدية متوسطة";
    if (level === "Higher Liver Risk") return "خطورة كبدية أعلى";

    return level;
  }

  function localizeMessage(level: string, fallback: string) {
    if (!isArabic) return fallback;

    if (level === "Good Liver Health Pattern") {
      return "تشير إجاباتك إلى نمط صحي أفضل للكبد بشكل عام. استمر بالتغذية الصحية، التحكم بالوزن، والفحوصات الوقائية الدورية.";
    }

    if (level === "Moderate Liver Risk") {
      return "تشير إجاباتك إلى وجود بعض عوامل الخطورة المرتبطة بالكبد. يُفضّل مناقشة إنزيمات الكبد، احتمالية الكبد الدهني، وعوامل نمط الحياة مع مختص صحي.";
    }

    if (level === "Higher Liver Risk") {
      return "تشير إجاباتك إلى وجود عدة عوامل خطورة مرتبطة بالكبد. هذه الأداة لا تشخّص المرض، لكن يُنصح بالتقييم الطبي.";
    }

    return fallback;
  }

  async function saveAssessment(score: number, level: string, message: string) {
    setSaveMessage(text("Saving liver assessment...", "جاري حفظ تقييم الكبد..."));

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
          organ_name: "Liver",
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
      module_name: "Liver",
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
      text("Liver assessment saved successfully.", "تم حفظ تقييم الكبد بنجاح.")
    );
  }

  async function calculateLiverScore() {
    setSaveMessage("");

    if (!alt || !ast) {
      setSaveMessage(
        text(
          "Please complete all required fields.",
          "يرجى تعبئة جميع الحقول المطلوبة."
        )
      );
      return;
    }

    const altNumber = Number(alt);
    const astNumber = Number(ast);

    if (altNumber <= 0 || astNumber <= 0) {
      setSaveMessage(
        text("Please enter valid numbers.", "يرجى إدخال أرقام صحيحة.")
      );
      return;
    }

    let riskPoints = 0;

    if (altNumber > 40) riskPoints += 20;
    if (altNumber > 80) riskPoints += 20;
    if (astNumber > 40) riskPoints += 20;
    if (astNumber > 80) riskPoints += 20;
    if (alcohol === "Yes") riskPoints += 15;
    if (fattyLiver === "Yes") riskPoints += 15;
    if (obesity === "Yes") riskPoints += 10;

    const score = Math.max(0, 100 - riskPoints);

    let level = "Good Liver Health Pattern";
    let message =
      "Your answers suggest a generally healthier liver risk pattern. Continue healthy nutrition, weight control, and regular preventive checkups.";

    if (score < 75 && score >= 45) {
      level = "Moderate Liver Risk";
      message =
        "Your answers suggest some liver-related risk factors. Consider discussing liver enzymes, fatty liver risk, and lifestyle factors with a healthcare professional.";
    }

    if (score < 45) {
      level = "Higher Liver Risk";
      message =
        "Your answers suggest multiple liver-related risk factors. This tool does not diagnose disease, but medical evaluation is recommended.";
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
            {text("LIVER HEALTH ASSESSMENT", "تقييم صحة الكبد")}
          </p>
          <h1>{text("Liver Health Assessment", "تقييم صحة الكبد")}</h1>
          <p>
            {text(
              "Evaluate liver-related risk factors including liver enzymes, fatty liver history, alcohol exposure, and obesity.",
              "قيّم عوامل الخطورة المرتبطة بالكبد مثل إنزيمات الكبد، تاريخ الكبد الدهني، التعرض للكحول، والسمنة."
            )}
          </p>
        </div>

        <div className="chatWindow">
          <div className="assessmentForm">
            <div className="formGroup">
              <label>ALT</label>
              <input
                type="number"
                placeholder={text("e.g. 35", "مثال: 35")}
                value={alt}
                onChange={(event) => setAlt(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>AST</label>
              <input
                type="number"
                placeholder={text("e.g. 30", "مثال: 30")}
                value={ast}
                onChange={(event) => setAst(event.target.value)}
              />
            </div>

            <div className="formGroup">
              <label>{text("Alcohol exposure?", "هل يوجد تعرض للكحول؟")}</label>
              <select
                value={alcohol}
                onChange={(event) => setAlcohol(event.target.value)}
              >
                <option value="No">{text("No", "لا")}</option>
                <option value="Yes">{text("Yes", "نعم")}</option>
              </select>
            </div>

            <div className="formGroup">
              <label>{text("Known fatty liver?", "هل لديك كبد دهني معروف؟")}</label>
              <select
                value={fattyLiver}
                onChange={(event) => setFattyLiver(event.target.value)}
              >
                <option value="No">{text("No", "لا")}</option>
                <option value="Yes">{text("Yes", "نعم")}</option>
              </select>
            </div>

            <div className="formGroup">
              <label>{text("Obesity or overweight?", "هل يوجد سمنة أو زيادة وزن؟")}</label>
              <select
                value={obesity}
                onChange={(event) => setObesity(event.target.value)}
              >
                <option value="No">{text("No", "لا")}</option>
                <option value="Yes">{text("Yes", "نعم")}</option>
              </select>
            </div>

            <button className="primaryBtn" onClick={calculateLiverScore}>
              {text("Calculate Liver Score", "احسب مؤشر الكبد")}
            </button>

            {saveMessage && <p>{saveMessage}</p>}
          </div>

          {result && (
            <div className="resultBox">
              <p className="sectionLabel">
                {text("Liver Health Score", "مؤشر صحة الكبد")}
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
