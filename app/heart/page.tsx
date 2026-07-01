"use client";

import PageBackActions from "../components/PageBackActions";
import { type CSSProperties, useEffect, useState } from "react";
import Link from "next/link";
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

  function getToneFromScore(score: number) {
    if (score >= 70) return "good";
    if (score >= 40) return "moderate";
    return "risk";
  }

  function getToneFromLevel(level: string) {
    if (level === "Low Risk") return "good";
    if (level === "Moderate Risk") return "moderate";
    if (level === "High Risk") return "risk";
    return "neutral";
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

  const scoreRingStyle = {
    "--score": result ? Math.max(0, Math.min(100, result.score)) : 0,
  } as CSSProperties;

  const resultTone = result ? getToneFromLevel(result.level) : "neutral";

  return (
    <main className="ohPageShell" dir={isArabic ? "rtl" : "ltr"}>
      <div className="ohContainer ohStack large" style={{ padding: "28px 0 56px" }}>
        <PageBackActions />

        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Heart Assessment Experience", "تجربة تقييم القلب")}
              </p>

              <h1 className="ohTitle">
                {text("Heart Risk Assessment", "تقييم خطورة القلب")}
              </h1>

              <p className="ohLead">
                {text(
                  "Evaluate key cardiovascular risk factors including age, blood pressure, cholesterol, diabetes, and smoking exposure. The result is educational and helps guide your next step.",
                  "قيّم عوامل خطورة القلب الأساسية مثل العمر، ضغط الدم، الكوليسترول، السكري، والتدخين. النتيجة تعليمية وتساعدك على تحديد الخطوة التالية."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <a href="#heart-assessment-form" className="primaryBtn">
                  {text("Start Heart Assessment", "ابدأ تقييم القلب")}
                </a>

                <Link href="/assessment" className="secondaryBtn">
                  {text("All Assessments", "كل التقييمات")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Score Model", "نظام المؤشر")}
                  </p>
                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {text("Clear score from 0 to 100", "مؤشر واضح من 0 إلى 100")}
                  </h2>
                </div>

                <span className="ohStatusBadge neutral">
                  {text("Educational", "تعليمي")}
                </span>
              </div>

              <div className="ohMetricGrid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <article className="ohMetricCard">
                  <span className="ohMetricLabel">
                    {text("Inputs", "المدخلات")}
                  </span>
                  <span className="ohMetricValue">5</span>
                  <span className="ohMetricHint">
                    {text("risk factors", "عوامل خطورة")}
                  </span>
                </article>

                <article className="ohMetricCard">
                  <span className="ohMetricLabel">
                    {text("Result", "النتيجة")}
                  </span>
                  <span className="ohMetricValue">/100</span>
                  <span className="ohMetricHint">
                    {text("saved to history", "تُحفظ في التاريخ")}
                  </span>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="ohMetricGrid">
          <article className="ohMetricCard">
            <span className="ohMetricLabel">{text("Age", "العمر")}</span>
            <span className="ohMetricValue">{age || "—"}</span>
            <span className="ohMetricHint">
              {text("Risk rises with age", "تزداد الخطورة مع العمر")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Systolic BP", "الضغط الانقباضي")}
            </span>
            <span className="ohMetricValue">{bloodPressure || "—"}</span>
            <span className="ohMetricHint">
              {text("Higher pressure adds risk", "ارتفاع الضغط يزيد الخطورة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Cholesterol", "الكوليسترول")}
            </span>
            <span className="ohMetricValue">{cholesterol || "—"}</span>
            <span className="ohMetricHint">
              {text("Total cholesterol input", "قيمة الكوليسترول الكلي")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Lifestyle Risk", "خطورة نمط الحياة")}
            </span>
            <span className="ohMetricValue">
              {diabetes === "Yes" || smoking === "Yes" ? "!" : "✓"}
            </span>
            <span className="ohMetricHint">
              {text("Diabetes and smoking", "السكري والتدخين")}
            </span>
          </article>
        </section>

        <section className="ohGrid cols2" id="heart-assessment-form">
          <article className="ohCard">
            <div className="ohCardHeader">
              <div>
                <p className="ohMetricLabel">
                  {text("Assessment Form", "نموذج التقييم")}
                </p>

                <h2 className="ohCardTitle">
                  {text("Enter your cardiovascular inputs", "أدخل بيانات القلب الأساسية")}
                </h2>

                <p className="ohCardText">
                  {text(
                    "Use recent values when available. If you are unsure, enter the latest value you know.",
                    "استخدم أحدث القيم المتوفرة لديك. إذا لم تكن متأكدًا، أدخل آخر قيمة تعرفها."
                  )}
                </p>
              </div>
            </div>

            <div className="ohStack">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: "16px",
                }}
              >
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
              </div>

              <div className="ohButtonRow">
                <button className="primaryBtn" onClick={calculateRisk}>
                  {text("Calculate Heart Risk", "احسب خطورة القلب")}
                </button>

                <Link href="/history" className="secondaryBtn">
                  {text("View Progress Timeline", "عرض مسار التقدم")}
                </Link>
              </div>

              {saveMessage && (
                <div className="ohTrustNotice">
                  <span aria-hidden="true">ℹ️</span>
                  <div>{saveMessage}</div>
                </div>
              )}
            </div>
          </article>

          <article className="ohCard">
            <div className="ohCardHeader">
              <div>
                <p className="ohMetricLabel">
                  {text("Result Preview", "معاينة النتيجة")}
                </p>

                <h2 className="ohCardTitle">
                  {result
                    ? localizeRiskLevel(result.level)
                    : text("Complete the form to calculate", "أكمل النموذج لحساب النتيجة")}
                </h2>
              </div>

              <span className={`ohStatusBadge ${resultTone}`}>
                {result ? `${result.score}/100` : text("Pending", "بانتظار")}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                placeItems: "center",
                margin: "22px 0",
              }}
            >
              <div className="ohScoreRing" style={scoreRingStyle}>
                <div>
                  <strong>{result ? result.score : 0}</strong>
                  <span>{text("heart", "القلب")}</span>
                </div>
              </div>
            </div>

            {result ? (
              <div className="ohStack">
                <p className="ohCardText">
                  {localizeRiskMessage(result.level, result.message)}
                </p>

                <div className="ohButtonRow">
                  <Link href="/history" className="primaryBtn">
                    {text("View Progress Timeline", "عرض مسار التقدم")}
                  </Link>

                  <Link href="/health-plan" className="secondaryBtn">
                    {text("Open Health Plan", "فتح الخطة الصحية")}
                  </Link>
                </div>
              </div>
            ) : (
              <p className="ohCardText">
                {text(
                  "Your result will appear here as a clear score, risk category, and educational next step.",
                  "ستظهر نتيجتك هنا كمؤشر واضح، فئة خطورة، وخطوة تعليمية تالية."
                )}
              </p>
            )}
          </article>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("How this assessment works", "كيف يعمل هذا التقييم")}
              </p>

              <h2 className="ohCardTitle">
                {text("Simple scoring, clear interpretation", "حساب بسيط وتفسير واضح")}
              </h2>

              <p className="ohCardText">
                {text(
                  "The tool subtracts risk points based on age, blood pressure, cholesterol, diabetes, and smoking exposure. A higher score means a better educational pattern.",
                  "تقوم الأداة بخصم نقاط خطورة بناءً على العمر، ضغط الدم، الكوليسترول، السكري، والتدخين. كلما كان المؤشر أعلى كان النمط التعليمي أفضل."
                )}
              </p>
            </div>
          </div>

          <div className="ohGrid cols3">
            <div className="ohMetricCard">
              <span className="ohMetricLabel">
                {text("Lower Risk Pattern", "نمط خطورة أقل")}
              </span>
              <span className="ohMetricValue">70+</span>
              <span className="ohMetricHint">
                {text("Continue prevention and checkups", "استمر بالوقاية والفحوصات")}
              </span>
            </div>

            <div className="ohMetricCard">
              <span className="ohMetricLabel">
                {text("Moderate Risk Pattern", "نمط خطورة متوسطة")}
              </span>
              <span className="ohMetricValue">40-69</span>
              <span className="ohMetricHint">
                {text("Review risk factors", "راجع عوامل الخطورة")}
              </span>
            </div>

            <div className="ohMetricCard">
              <span className="ohMetricLabel">
                {text("Higher Risk Pattern", "نمط خطورة أعلى")}
              </span>
              <span className="ohMetricValue">&lt;40</span>
              <span className="ohMetricHint">
                {text("Seek professional advice", "اطلب نصيحة مختص")}
              </span>
            </div>
          </div>
        </section>

        <section className="ohTrustNotice">
          <span aria-hidden="true">🛡️</span>
          <div>
            <strong>
              {text("Medical safety reminder", "تذكير السلامة الطبية")}
            </strong>
            <br />
            {text(
              "This heart assessment is educational only. It does not diagnose heart disease, replace a clinician, or handle emergency symptoms such as chest pain, severe shortness of breath, fainting, or stroke signs.",
              "تقييم القلب هذا تعليمي فقط. لا يشخّص أمراض القلب ولا يستبدل الطبيب، ولا يتعامل مع الأعراض الطارئة مثل ألم الصدر، ضيق النفس الشديد، الإغماء، أو علامات الجلطة."
            )}
          </div>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Continue your journey", "تابع رحلتك")}
              </p>

              <h2 className="ohCardTitle">
                {text("Connect this result to your health plan", "اربط هذه النتيجة بخطتك الصحية")}
              </h2>

              <p className="ohCardText">
                {text(
                  "After saving your heart assessment, continue to your timeline, upload reports, or open Health Analysis for a broader view.",
                  "بعد حفظ تقييم القلب، تابع إلى مسار التقدم، ارفع التقارير، أو افتح مركز تحليل التقارير للحصول على رؤية أوسع."
                )}
              </p>
            </div>
          </div>

          <div className="ohButtonRow">
            <Link href="/assessment" className="secondaryBtn">
              {text("All Assessments", "كل التقييمات")}
            </Link>

            <Link href="/history" className="primaryBtn">
              {text("Progress Timeline", "مسار التقدم")}
            </Link>

            <Link href="/lab-upload" className="secondaryBtn">
              {text("Upload Report", "رفع تقرير")}
            </Link>

            <Link href="/reports" className="secondaryBtn">
              {text("Review Analysis", "فتح تحليل التقارير")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}


