"use client";

import PageBackActions from "../components/PageBackActions";
import { type CSSProperties, useEffect, useState } from "react";
import Link from "next/link";
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

  function getToneFromLevel(level: string) {
    if (level === "Good Metabolic Health Pattern") return "good";
    if (level === "Moderate Metabolic Risk") return "moderate";
    if (level === "Higher Metabolic Risk") return "risk";
    return "neutral";
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

  const glucoseNumber = Number(glucose);
  const cholesterolNumber = Number(cholesterol);

  const metabolicSignalCount = [
    glucoseNumber >= 100,
    cholesterolNumber >= 200,
    weight === "Overweight" || weight === "Obese",
    activity === "Poor",
    familyHistory === "Yes",
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
                {text("Metabolic Assessment Experience", "تجربة تقييم صحة الأيض")}
              </p>

              <h1 className="ohTitle">
                {text("Metabolic Health Assessment", "تقييم صحة الأيض")}
              </h1>

              <p className="ohLead">
                {text(
                  "Evaluate metabolic wellness factors including fasting glucose, total cholesterol, weight pattern, activity level, and family history of diabetes or metabolic disease.",
                  "قيّم عوامل الصحة الأيضية مثل سكر الدم الصائم، الكوليسترول الكلي، نمط الوزن، مستوى النشاط، والتاريخ العائلي للسكري أو أمراض الأيض."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <a href="#metabolic-assessment-form" className="primaryBtn">
                  {text("Start Metabolic Assessment", "ابدأ تقييم الأيض")}
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
                    {text("Metabolic pattern score", "مؤشر النمط الأيضي")}
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
                    {text("metabolic signals", "إشارات أيضية")}
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
              {text("Fasting Glucose", "سكر الدم الصائم")}
            </span>
            <span className="ohMetricValue">{glucose || "—"}</span>
            <span className="ohMetricHint">
              {glucoseNumber >= 100
                ? text("Higher glucose signal", "إشارة سكر أعلى")
                : text("Enter latest value", "أدخل أحدث قيمة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Total Cholesterol", "الكوليسترول الكلي")}
            </span>
            <span className="ohMetricValue">{cholesterol || "—"}</span>
            <span className="ohMetricHint">
              {cholesterolNumber >= 200
                ? text("Higher cholesterol signal", "إشارة كوليسترول أعلى")
                : text("Enter latest value", "أدخل أحدث قيمة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Risk Signals", "إشارات الخطورة")}
            </span>
            <span className="ohMetricValue">{metabolicSignalCount}</span>
            <span className="ohMetricHint">
              {text("currently selected", "محددة حاليًا")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Metabolic Score", "مؤشر الأيض")}
            </span>
            <span className="ohMetricValue">{result ? result.score : "—"}</span>
            <span className="ohMetricHint">
              {result
                ? `${localizeLevel(result.level)} · ${result.score}/100`
                : text("Calculate to view result", "احسب لعرض النتيجة")}
            </span>
          </article>
        </section>

        <section className="ohGrid cols2" id="metabolic-assessment-form">
          <article className="ohCard">
            <div className="ohCardHeader">
              <div>
                <p className="ohMetricLabel">
                  {text("Assessment Form", "نموذج التقييم")}
                </p>

                <h2 className="ohCardTitle">
                  {text("Enter your metabolic inputs", "أدخل بيانات الأيض الأساسية")}
                </h2>

                <p className="ohCardText">
                  {text(
                    "Use recent fasting glucose and cholesterol values when available. Select the lifestyle and family-history factors that apply to you.",
                    "استخدم أحدث قيم سكر الدم الصائم والكوليسترول عند توفرها. اختر عوامل نمط الحياة والتاريخ العائلي التي تنطبق عليك."
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
              </div>

              <div className="ohButtonRow">
                <button className="primaryBtn" onClick={calculateMetabolicScore}>
                  {text("Calculate Metabolic Score", "احسب مؤشر الأيض")}
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
                  <span>{text("metabolic", "الأيض")}</span>
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
                  "Your result will appear here as a clear score, metabolic risk pattern, and educational next step.",
                  "ستظهر نتيجتك هنا كمؤشر واضح، نمط خطورة أيضية، وخطوة تعليمية تالية."
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
                {text("Metabolic scoring made clear", "حساب الأيض بوضوح")}
              </h2>

              <p className="ohCardText">
                {text(
                  "The tool subtracts risk points based on fasting glucose, total cholesterol, weight pattern, physical activity, and family history. A higher score means a healthier educational pattern.",
                  "تقوم الأداة بخصم نقاط خطورة بناءً على سكر الدم الصائم، الكوليسترول الكلي، نمط الوزن، النشاط البدني، والتاريخ العائلي. كلما كان المؤشر أعلى كان النمط التعليمي أكثر صحة."
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
                {text("Nutrition and activity balance", "توازن التغذية والنشاط")}
              </span>
            </div>

            <div className="ohMetricCard">
              <span className="ohMetricLabel">
                {text("Moderate Risk Pattern", "نمط خطورة متوسطة")}
              </span>
              <span className="ohMetricValue">45-74</span>
              <span className="ohMetricHint">
                {text("Review metabolic factors", "راجع عوامل الأيض")}
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
              "This metabolic assessment is educational only. It does not diagnose diabetes, high cholesterol, or metabolic disease. Seek medical care for very high glucose readings, severe weakness, confusion, chest pain, shortness of breath, or worsening symptoms.",
              "تقييم الأيض هذا تعليمي فقط. لا يشخّص السكري أو ارتفاع الكوليسترول أو أمراض الأيض. اطلب رعاية طبية عند وجود قراءات سكر عالية جدًا، ضعف شديد، تشوش، ألم صدر، ضيق نفس، أو تدهور الأعراض."
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
                  "After saving your metabolic assessment, continue to your timeline, upload reports, or open Health Intelligence for a broader view.",
                  "بعد حفظ تقييم الأيض، تابع إلى مسار التقدم، ارفع التقارير، أو افتح مركز الذكاء الصحي للحصول على رؤية أوسع."
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
