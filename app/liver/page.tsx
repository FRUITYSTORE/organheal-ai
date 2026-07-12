"use client";

import PageBackActions from "../components/PageBackActions";
import { type CSSProperties, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { saveOrganAssessmentResult } from "@/lib/services/organs/organ-assessment.service";

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

  function getToneFromLevel(level: string) {
    if (level === "Good Liver Health Pattern") return "good";
    if (level === "Moderate Liver Risk") return "moderate";
    if (level === "Higher Liver Risk") return "risk";
    return "neutral";
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

    try {
  await saveOrganAssessmentResult({
    userId: user.id,
    organName: "Liver",
    score,
    riskLevel: level,
    notes: message,
  });
} catch (error) {
  setSaveMessage(
    error instanceof Error
      ? text(
          `Could not save liver assessment: ${error.message}`,
          `تعذر حفظ تقييم الكبد: ${error.message}`
        )
      : text(
          "Could not save liver assessment.",
          "تعذر حفظ تقييم الكبد."
        )
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

  const altNumber = Number(alt);
  const astNumber = Number(ast);

  const liverSignalCount = [
    altNumber > 40,
    astNumber > 40,
    alcohol === "Yes",
    fattyLiver === "Yes",
    obesity === "Yes",
  ].filter(Boolean).length;

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
                {text("Liver Assessment Experience", "تجربة تقييم الكبد")}
              </p>

              <h1 className="ohTitle">
                {text("Liver Health Assessment", "تقييم صحة الكبد")}
              </h1>

              <p className="ohLead">
                {text(
                  "Evaluate liver-related risk factors including ALT, AST, fatty liver history, alcohol exposure, and obesity or overweight. The result is educational and saved to your health timeline.",
                  "قيّم عوامل الخطورة المرتبطة بالكبد مثل ALT و AST، تاريخ الكبد الدهني، التعرض للكحول، والسمنة أو زيادة الوزن. النتيجة تعليمية وتُحفظ في مسارك الصحي."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <a href="#liver-assessment-form" className="primaryBtn">
                  {text("Start Liver Assessment", "ابدأ تقييم الكبد")}
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
                    {text("Liver pattern score", "مؤشر نمط الكبد")}
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
                    {text("liver risk signals", "إشارات خطورة كبدية")}
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
            <span className="ohMetricLabel">ALT</span>
            <span className="ohMetricValue">{alt || "—"}</span>
            <span className="ohMetricHint">
              {altNumber > 40
                ? text("Higher enzyme signal", "إشارة إنزيم أعلى")
                : text("Enter latest value", "أدخل أحدث قيمة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">AST</span>
            <span className="ohMetricValue">{ast || "—"}</span>
            <span className="ohMetricHint">
              {astNumber > 40
                ? text("Higher enzyme signal", "إشارة إنزيم أعلى")
                : text("Enter latest value", "أدخل أحدث قيمة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Risk Signals", "إشارات الخطورة")}
            </span>
            <span className="ohMetricValue">{liverSignalCount}</span>
            <span className="ohMetricHint">
              {text("currently selected", "محددة حاليًا")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Liver Score", "مؤشر الكبد")}
            </span>
            <span className="ohMetricValue">{result ? result.score : "—"}</span>
            <span className="ohMetricHint">
              {result
                ? `${localizeLevel(result.level)} · ${result.score}/100`
                : text("Calculate to view result", "احسب لعرض النتيجة")}
            </span>
          </article>
        </section>

        <section className="ohGrid cols2" id="liver-assessment-form">
          <article className="ohCard">
            <div className="ohCardHeader">
              <div>
                <p className="ohMetricLabel">
                  {text("Assessment Form", "نموذج التقييم")}
                </p>

                <h2 className="ohCardTitle">
                  {text("Enter your liver-related inputs", "أدخل بيانات الكبد الأساسية")}
                </h2>

                <p className="ohCardText">
                  {text(
                    "Use recent ALT and AST values when available. Select any known lifestyle or history factors that apply to you.",
                    "استخدم أحدث قيم ALT و AST عند توفرها. اختر عوامل نمط الحياة أو التاريخ الصحي التي تنطبق عليك."
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
              </div>

              <div className="ohButtonRow">
                <button className="primaryBtn" onClick={calculateLiverScore}>
                  {text("Calculate Liver Score", "احسب مؤشر الكبد")}
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
                  <span>{text("liver", "الكبد")}</span>
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
                  "Your result will appear here as a clear score, liver risk pattern, and educational next step.",
                  "ستظهر نتيجتك هنا كمؤشر واضح، نمط خطورة كبدية، وخطوة تعليمية تالية."
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
                {text("Liver scoring made clear", "حساب كبدي واضح")}
              </h2>

              <p className="ohCardText">
                {text(
                  "The tool subtracts risk points based on ALT, AST, alcohol exposure, known fatty liver, and obesity or overweight. A higher score means a healthier educational pattern.",
                  "تقوم الأداة بخصم نقاط خطورة بناءً على ALT و AST، التعرض للكحول، الكبد الدهني المعروف، والسمنة أو زيادة الوزن. كلما كان المؤشر أعلى كان النمط التعليمي أكثر صحة."
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
                {text("Nutrition and prevention", "التغذية والوقاية")}
              </span>
            </div>

            <div className="ohMetricCard">
              <span className="ohMetricLabel">
                {text("Moderate Risk Pattern", "نمط خطورة متوسطة")}
              </span>
              <span className="ohMetricValue">45-74</span>
              <span className="ohMetricHint">
                {text("Review liver risk factors", "راجع عوامل خطورة الكبد")}
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
              "This liver assessment is educational only. It does not diagnose liver disease or replace a clinician. Seek urgent care for yellow eyes or skin, severe abdominal pain, vomiting blood, black stool, confusion, or severe weakness.",
              "تقييم الكبد هذا تعليمي فقط. لا يشخّص أمراض الكبد ولا يستبدل الطبيب. اطلب رعاية عاجلة عند اصفرار العين أو الجلد، ألم شديد بالبطن، قيء دم، براز أسود، تشوش، أو ضعف شديد."
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
                  "After saving your liver assessment, continue to your timeline, upload reports, or open Health Analysis for a broader view.",
                  "بعد حفظ تقييم الكبد، تابع إلى مسار التقدم، ارفع التقارير، أو افتح مركز تحليل التقارير للحصول على رؤية أوسع."
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


