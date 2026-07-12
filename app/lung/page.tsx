"use client";

import PageBackActions from "../components/PageBackActions";
import { type CSSProperties, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { saveAssessmentFlow } from "@/lib/services/organs/assessment-flow.service";

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

  function getToneFromScore(score: number) {
    if (score >= 75) return "good";
    if (score >= 45) return "moderate";
    return "risk";
  }

  function getToneFromLevel(level: string) {
    if (level === "Good Lung Health Pattern") return "good";
    if (level === "Moderate Respiratory Risk") return "moderate";
    if (level === "Higher Respiratory Risk") return "risk";
    return "neutral";
  }

  async function saveAssessment(score: number, level: string, message: string) {
    setSaveMessage(text("Saving lung assessment...", "جاري حفظ تقييم الرئة..."));

   const result = await saveAssessmentFlow({
  organName: "Lung",
  score,
  riskLevel: level,
  notes: message,
});

if (result.status === "not-authenticated") {
  setSaveMessage(
    text(
      "Please login to save your assessment.",
      "يرجى تسجيل الدخول لحفظ التقييم."
    )
  );
  return;
}

if (result.status === "error") {
  setSaveMessage(
    text(
      `Could not save assessment: ${result.message}`,
      `تعذر حفظ التقييم: ${result.message}`
    )
  );
  return;
}

    setSaveMessage(
      text("Lung assessment saved successfully.", "تم حفظ تقييم الرئة بنجاح.")
    );
  }

  async function calculateLungScore() {
    setSaveMessage("");

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

  const symptomCount = [
    smoking,
    shortnessOfBreath,
    chronicCough,
    asthma,
  ].filter((value) => value === "Yes").length;

  const scoreRingStyle = {
    "--score": result ? Math.max(0, Math.min(100, result.score)) : 0,
  } as CSSProperties;

  const resultTone = result ? getToneFromLevel(result.level) : "neutral";

  return (
    <main className="ohPageShell assessmentForceV2" dir={isArabic ? "rtl" : "ltr"}>
      <div className="ohContainer ohStack large" style={{ padding: "28px 0 56px" }}>
        <PageBackActions />

        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Lung Assessment Experience", "تجربة تقييم الرئة")}
              </p>

              <h1 className="ohTitle">
                {text("Lung Health Assessment", "تقييم صحة الرئة")}
              </h1>

              <p className="ohLead">
                {text(
                  "Evaluate respiratory wellness factors including smoking exposure, shortness of breath, chronic cough, asthma or wheezing history, and activity level.",
                  "قيّم عوامل صحة الجهاز التنفسي مثل التعرض للتدخين، ضيق النفس، السعال المزمن، تاريخ الربو أو الصفير، ومستوى النشاط."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <a href="#lung-assessment-form" className="primaryBtn">
                  {text("Start Lung Assessment", "ابدأ تقييم الرئة")}
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
                    {text("Respiratory pattern score", "مؤشر النمط التنفسي")}
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
                    {text("respiratory factors", "عوامل تنفسية")}
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
              {text("Smoke Exposure", "التعرض للتدخين")}
            </span>
            <span className="ohMetricValue">{smoking === "Yes" ? "!" : "✓"}</span>
            <span className="ohMetricHint">
              {smoking === "Yes"
                ? text("Smoking risk selected", "تم تحديد خطورة التدخين")
                : text("No smoking selected", "لم يتم تحديد التدخين")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Breathing Symptoms", "أعراض التنفس")}
            </span>
            <span className="ohMetricValue">{symptomCount}</span>
            <span className="ohMetricHint">
              {text("selected risk factor(s)", "عوامل خطورة محددة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Activity Level", "مستوى النشاط")}
            </span>
            <span className="ohMetricValue">
              {activityLevel === "Good" ? "✓" : activityLevel === "Moderate" ? "~" : "!"}
            </span>
            <span className="ohMetricHint">
              {activityLevel === "Good"
                ? text("Good activity pattern", "نمط نشاط جيد")
                : activityLevel === "Moderate"
                ? text("Moderate activity pattern", "نمط نشاط متوسط")
                : text("Poor activity pattern", "نمط نشاط ضعيف")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Respiratory Score", "مؤشر الرئة")}
            </span>
            <span className="ohMetricValue">{result ? result.score : "—"}</span>
            <span className="ohMetricHint">
              {result
                ? `${localizeLevel(result.level)} · ${result.score}/100`
                : text("Calculate to view result", "احسب لعرض النتيجة")}
            </span>
          </article>
        </section>

        <section className="ohGrid cols2" id="lung-assessment-form">
          <article className="ohCard">
            <div className="ohCardHeader">
              <div>
                <p className="ohMetricLabel">
                  {text("Assessment Form", "نموذج التقييم")}
                </p>

                <h2 className="ohCardTitle">
                  {text("Enter your respiratory inputs", "أدخل بيانات الجهاز التنفسي")}
                </h2>

                <p className="ohCardText">
                  {text(
                    "Choose the answers that best describe your current respiratory symptoms and lifestyle pattern.",
                    "اختر الإجابات التي تصف بشكل أفضل أعراضك التنفسية الحالية ونمط حياتك."
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
              </div>

              <div className="ohButtonRow">
                <button className="primaryBtn" onClick={calculateLungScore}>
                  {text("Calculate Lung Score", "احسب مؤشر الرئة")}
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
                  <span>{text("lung", "الرئة")}</span>
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
                  "Your result will appear here as a clear score, respiratory risk category, and educational next step.",
                  "ستظهر نتيجتك هنا كمؤشر واضح، فئة خطورة تنفسية، وخطوة تعليمية تالية."
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
                {text("Respiratory scoring made clear", "حساب تنفسي واضح")}
              </h2>

              <p className="ohCardText">
                {text(
                  "The tool subtracts risk points based on smoking, breathing symptoms, chronic cough, asthma or wheezing history, and poor activity level. A higher score means a healthier educational pattern.",
                  "تقوم الأداة بخصم نقاط خطورة بناءً على التدخين، أعراض التنفس، السعال المزمن، تاريخ الربو أو الصفير، وضعف النشاط. كلما كان المؤشر أعلى كان النمط التعليمي أكثر صحة."
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
                {text("Avoid smoke and stay active", "تجنب الدخان وحافظ على النشاط")}
              </span>
            </div>

            <div className="ohMetricCard">
              <span className="ohMetricLabel">
                {text("Moderate Risk Pattern", "نمط خطورة متوسطة")}
              </span>
              <span className="ohMetricValue">45-74</span>
              <span className="ohMetricHint">
                {text("Review symptoms and triggers", "راجع الأعراض والمحفزات")}
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
              "This lung assessment is educational only. It does not diagnose respiratory disease or replace urgent care. Seek immediate medical help for severe shortness of breath, blue lips, chest pain, confusion, or worsening symptoms.",
              "تقييم الرئة هذا تعليمي فقط. لا يشخّص أمراض الجهاز التنفسي ولا يستبدل الرعاية العاجلة. اطلب مساعدة طبية فورية عند وجود ضيق نفس شديد، ازرقاق الشفاه، ألم صدر، تشوش، أو تدهور الأعراض."
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
                  "After saving your lung assessment, continue to your timeline, upload reports, or open Health Analysis for a broader view.",
                  "بعد حفظ تقييم الرئة، تابع إلى مسار التقدم، ارفع التقارير، أو افتح مركز تحليل التقارير للحصول على رؤية أوسع."
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
              {text("Open Reports", "فتح تحليل التقارير")}
            </Link>
          </div>
        </section>
      </div>
    
      <style>{`
        /* ORGANHEAL_ASSESSMENT_FORCE_V2 */

        .assessmentForceV2 {
          min-height: 100vh !important;
          background:
            radial-gradient(circle at 12% 5%, rgba(6, 182, 212, 0.26), transparent 28%),
            radial-gradient(circle at 88% 18%, rgba(15, 118, 110, 0.30), transparent 34%),
            linear-gradient(180deg, #dbeafe 0%, #cbd5e1 45%, #f8fafc 100%) !important;
        }

        .assessmentForceV2 .ohContainer {
          max-width: 1180px !important;
        }

        .assessmentForceV2 a[href="/dashboard"],
        .assessmentForceV2 a[href="/assessment"] {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: fit-content !important;
          min-height: 44px !important;
          padding: 0 18px !important;
          margin: 0 0 18px 0 !important;
          border-radius: 999px !important;
          background: #0f172a !important;
          color: #ffffff !important;
          border: 1px solid rgba(15, 23, 42, 0.25) !important;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.24) !important;
          font-weight: 950 !important;
          font-size: 0.9rem !important;
          text-decoration: none !important;
        }

        .assessmentForceV2 .ohHero,
        .assessmentForceV2 section:first-of-type {
          background:
            radial-gradient(circle at 86% 10%, rgba(20, 184, 166, 0.46), transparent 36%),
            linear-gradient(135deg, #061826 0%, #0f172a 42%, #0f766e 100%) !important;
          color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.16) !important;
          box-shadow: 0 34px 90px rgba(15, 23, 42, 0.36) !important;
        }

        .assessmentForceV2 .ohHero *,
        .assessmentForceV2 section:first-of-type h1,
        .assessmentForceV2 section:first-of-type h2,
        .assessmentForceV2 section:first-of-type h3,
        .assessmentForceV2 section:first-of-type p,
        .assessmentForceV2 section:first-of-type span,
        .assessmentForceV2 section:first-of-type strong {
          color: #ffffff !important;
        }

        .assessmentForceV2 .ohEyebrow {
          background: rgba(209, 250, 229, 0.18) !important;
          color: #d1fae5 !important;
          border: 1px solid rgba(209, 250, 229, 0.34) !important;
          font-weight: 950 !important;
        }

        .assessmentForceV2 .primaryBtn,
        .assessmentForceV2 button[type="submit"] {
          background: linear-gradient(135deg, #06b6d4, #14b8a6) !important;
          color: #061826 !important;
          border: 0 !important;
          font-weight: 950 !important;
          box-shadow: 0 16px 40px rgba(6, 182, 212, 0.35) !important;
        }

        .assessmentForceV2 .primaryBtn *,
        .assessmentForceV2 button[type="submit"] * {
          color: #061826 !important;
        }

        .assessmentForceV2 .secondaryBtn {
          background: #ffffff !important;
          color: #0f766e !important;
          border: 1px solid rgba(15, 118, 110, 0.34) !important;
          font-weight: 950 !important;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12) !important;
        }

        .assessmentForceV2 .ohMetricGrid > *,
        .assessmentForceV2 [class*="MetricCard"] {
          min-height: 145px !important;
          border: 0 !important;
          overflow: hidden !important;
          color: #ffffff !important;
          box-shadow: 0 24px 62px rgba(15, 23, 42, 0.24) !important;
        }

        .assessmentForceV2 .ohMetricGrid > *:nth-child(1) {
          background: linear-gradient(135deg, #1d4ed8, #0f766e) !important;
        }

        .assessmentForceV2 .ohMetricGrid > *:nth-child(2) {
          background: linear-gradient(135deg, #0f766e, #06b6d4) !important;
        }

        .assessmentForceV2 .ohMetricGrid > *:nth-child(3) {
          background: linear-gradient(135deg, #047857, #10b981) !important;
        }

        .assessmentForceV2 .ohMetricGrid > *:nth-child(4) {
          background: linear-gradient(135deg, #b45309, #f59e0b) !important;
        }

        .assessmentForceV2 .ohMetricGrid > * *,
        .assessmentForceV2 [class*="MetricCard"] * {
          color: #ffffff !important;
        }

        .assessmentForceV2 .ohCard,
        .assessmentForceV2 .ohActionPanel,
        .assessmentForceV2 article,
        .assessmentForceV2 form {
          background: #ffffff !important;
          border: 1px solid rgba(15, 23, 42, 0.16) !important;
          box-shadow: 0 22px 58px rgba(15, 23, 42, 0.14) !important;
        }

        .assessmentForceV2 .ohCardHeader {
          background: linear-gradient(135deg, #061826, #0f766e) !important;
          border-radius: 22px !important;
          padding: 16px !important;
          border: 0 !important;
          margin-bottom: 18px !important;
          box-shadow: 0 16px 38px rgba(15, 23, 42, 0.18) !important;
        }

        .assessmentForceV2 .ohCardHeader,
        .assessmentForceV2 .ohCardHeader * {
          color: #ffffff !important;
        }

        .assessmentForceV2 h2,
        .assessmentForceV2 h3,
        .assessmentForceV2 strong {
          color: #0f172a !important;
          font-weight: 950 !important;
        }

        .assessmentForceV2 p,
        .assessmentForceV2 small {
          color: #334155 !important;
          font-weight: 720 !important;
          line-height: 1.65 !important;
        }

        .assessmentForceV2 input,
        .assessmentForceV2 select,
        .assessmentForceV2 textarea {
          border: 1px solid rgba(15, 23, 42, 0.22) !important;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08) !important;
        }
      `}</style></main>
  );
}


