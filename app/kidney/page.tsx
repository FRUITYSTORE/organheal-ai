"use client";

import PageBackActions from "../components/PageBackActions";
import { type CSSProperties, useEffect, useState } from "react";
import Link from "next/link";
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

  function getToneFromScore(score: number) {
    if (score >= 75) return "good";
    if (score >= 45) return "moderate";
    return "risk";
  }

  function getToneFromLevel(level: string) {
    if (level === "Good Kidney Health Pattern") return "good";
    if (level === "Moderate Kidney Risk") return "moderate";
    if (level === "Higher Kidney Risk") return "risk";
    return "neutral";
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

  const creatinineNumber = Number(creatinine);
  const bloodPressureNumber = Number(bloodPressure);

  const kidneySignalCount = [
    creatinineNumber > 1.2,
    bloodPressureNumber >= 130,
    diabetes === "Yes",
    swelling === "Yes",
    hydration === "Poor",
  ].filter(Boolean).length;

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
                {text("Kidney Assessment Experience", "تجربة تقييم الكلى")}
              </p>

              <h1 className="ohTitle">
                {text("Kidney Health Assessment", "تقييم صحة الكلى")}
              </h1>

              <p className="ohLead">
                {text(
                  "Evaluate kidney-related risk factors including creatinine, systolic blood pressure, diabetes, swelling, and hydration pattern. The result is educational and saved to your health timeline.",
                  "قيّم عوامل الخطورة المرتبطة بالكلى مثل الكرياتينين، ضغط الدم الانقباضي، السكري، التورم، ونمط الترطيب. النتيجة تعليمية وتُحفظ في مسارك الصحي."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <a href="#kidney-assessment-form" className="primaryBtn">
                  {text("Start Kidney Assessment", "ابدأ تقييم الكلى")}
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
                    {text("Kidney pattern score", "مؤشر نمط الكلى")}
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
                    {text("kidney risk signals", "إشارات خطورة كلوية")}
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
            <span className="ohMetricLabel">
              {text("Creatinine", "الكرياتينين")}
            </span>
            <span className="ohMetricValue">{creatinine || "—"}</span>
            <span className="ohMetricHint">
              {creatinineNumber > 1.2
                ? text("Higher signal selected", "إشارة أعلى محددة")
                : text("Enter latest value", "أدخل أحدث قيمة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Systolic BP", "الضغط الانقباضي")}
            </span>
            <span className="ohMetricValue">{bloodPressure || "—"}</span>
            <span className="ohMetricHint">
              {bloodPressureNumber >= 130
                ? text("Pressure risk signal", "إشارة خطورة ضغط")
                : text("Blood pressure input", "قيمة ضغط الدم")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Risk Signals", "إشارات الخطورة")}
            </span>
            <span className="ohMetricValue">{kidneySignalCount}</span>
            <span className="ohMetricHint">
              {text("currently selected", "محددة حاليًا")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Kidney Score", "مؤشر الكلى")}
            </span>
            <span className="ohMetricValue">{result ? result.score : "—"}</span>
            <span className="ohMetricHint">
              {result
                ? `${localizeLevel(result.level)} · ${result.score}/100`
                : text("Calculate to view result", "احسب لعرض النتيجة")}
            </span>
          </article>
        </section>

        <section className="ohGrid cols2" id="kidney-assessment-form">
          <article className="ohCard">
            <div className="ohCardHeader">
              <div>
                <p className="ohMetricLabel">
                  {text("Assessment Form", "نموذج التقييم")}
                </p>

                <h2 className="ohCardTitle">
                  {text("Enter your kidney-related inputs", "أدخل بيانات الكلى الأساسية")}
                </h2>

                <p className="ohCardText">
                  {text(
                    "Use your latest creatinine and blood pressure values when available. Select the symptoms or risk factors that apply to you.",
                    "استخدم أحدث قيمة للكرياتينين وضغط الدم عند توفرها. اختر الأعراض أو عوامل الخطورة التي تنطبق عليك."
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
                  <label>{text("Creatinine", "الكرياتينين")}</label>
                  <input
                    type="number"
                    step="0.1"
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
              </div>

              <div className="ohButtonRow">
                <button className="primaryBtn" onClick={calculateKidneyScore}>
                  {text("Calculate Kidney Score", "احسب مؤشر الكلى")}
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
                    ? localizeLevel(result.level)
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
                  <span>{text("kidney", "الكلى")}</span>
                </div>
              </div>
            </div>

            {result ? (
              <div className="ohStack">
                <p className="ohCardText">
                  {localizeMessage(result.level, result.message)}
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
                  "Your result will appear here as a clear score, kidney risk pattern, and educational next step.",
                  "ستظهر نتيجتك هنا كمؤشر واضح، نمط خطورة كلوية، وخطوة تعليمية تالية."
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
                {text("Kidney scoring made clear", "حساب كُلوي واضح")}
              </h2>

              <p className="ohCardText">
                {text(
                  "The tool subtracts risk points based on creatinine, blood pressure, diabetes, swelling, and hydration. A higher score means a healthier educational pattern.",
                  "تقوم الأداة بخصم نقاط خطورة بناءً على الكرياتينين، ضغط الدم، السكري، التورم، والترطيب. كلما كان المؤشر أعلى كان النمط التعليمي أكثر صحة."
                )}
              </p>
            </div>
          </div>

          <div className="ohGrid cols3">
            <div className="ohMetricCard">
              <span className="ohMetricLabel">
                {text("Healthier Pattern", "نمط صحي أفضل")}
              </span>
              <span className="ohMetricValue">75+</span>
              <span className="ohMetricHint">
                {text("Hydration and monitoring", "الترطيب والمراقبة")}
              </span>
            </div>

            <div className="ohMetricCard">
              <span className="ohMetricLabel">
                {text("Moderate Risk Pattern", "نمط خطورة متوسطة")}
              </span>
              <span className="ohMetricValue">45-74</span>
              <span className="ohMetricHint">
                {text("Review kidney risk factors", "راجع عوامل خطورة الكلى")}
              </span>
            </div>

            <div className="ohMetricCard">
              <span className="ohMetricLabel">
                {text("Higher Risk Pattern", "نمط خطورة أعلى")}
              </span>
              <span className="ohMetricValue">&lt;45</span>
              <span className="ohMetricHint">
                {text("Seek medical evaluation", "اطلب تقييمًا طبيًا")}
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
              "This kidney assessment is educational only. It does not diagnose kidney disease or replace a clinician. Seek urgent care for severe swelling, very low urine output, confusion, severe weakness, chest pain, or shortness of breath.",
              "تقييم الكلى هذا تعليمي فقط. لا يشخّص أمراض الكلى ولا يستبدل الطبيب. اطلب رعاية عاجلة عند وجود تورم شديد، قلة بول واضحة، تشوش، ضعف شديد، ألم صدر، أو ضيق نفس."
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
                  "After saving your kidney assessment, continue to your timeline, upload reports, or open Health Intelligence for a broader view.",
                  "بعد حفظ تقييم الكلى، تابع إلى مسار التقدم، ارفع التقارير، أو افتح مركز الذكاء الصحي للحصول على رؤية أوسع."
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

            <Link href="/intelligence" className="secondaryBtn">
              {text("Open Intelligence", "فتح مركز الذكاء")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
