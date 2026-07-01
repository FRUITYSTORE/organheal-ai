"use client";

import Link from "next/link";
import PageBackActions from "../components/PageBackActions";
import { useEffect, useState } from "react";

type Language = "en" | "ar";

type OrganModule = {
  href: string;
  icon: string;
  label: string;
  title: string;
  description: string;
  focus: string;
  time: string;
};

export default function AssessmentPage() {
  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

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

  const organModules: OrganModule[] = [
    {
      href: "/heart",
      icon: "❤️",
      label: text("Cardiovascular", "القلب والأوعية"),
      title: text("Heart Health", "صحة القلب"),
      description: text(
        "Blood pressure, cholesterol, activity level, and cardiovascular risk factors.",
        "ضغط الدم، الكوليسترول، مستوى النشاط، وعوامل خطورة القلب والأوعية الدموية."
      ),
      focus: text("Pressure · Cholesterol · Activity", "الضغط · الكوليسترول · النشاط"),
      time: text("3 min", "3 دقائق"),
    },
    {
      href: "/lung",
      icon: "🫁",
      label: text("Respiratory", "الجهاز التنفسي"),
      title: text("Lung Health", "صحة الرئة"),
      description: text(
        "Breathing symptoms, smoking exposure, cough, wheezing, and respiratory wellbeing.",
        "أعراض التنفس، التعرض للتدخين، السعال، الصفير، وصحة الجهاز التنفسي."
      ),
      focus: text("Breathing · Smoking · Cough", "التنفس · التدخين · السعال"),
      time: text("2 min", "دقيقتان"),
    },
    {
      href: "/kidney",
      icon: "🫘",
      label: text("Renal", "الكلى"),
      title: text("Kidney Health", "صحة الكلى"),
      description: text(
        "Creatinine, hydration, blood pressure, and kidney function indicators.",
        "الكرياتينين، الترطيب، ضغط الدم، ومؤشرات وظائف الكلى."
      ),
      focus: text("Creatinine · BP · Hydration", "الكرياتينين · الضغط · الترطيب"),
      time: text("3 min", "3 دقائق"),
    },
    {
      href: "/liver",
      icon: "🟤",
      label: text("Liver & Lifestyle", "الكبد ونمط الحياة"),
      title: text("Liver Health", "صحة الكبد"),
      description: text(
        "Liver enzymes, lifestyle factors, weight, alcohol exposure, and metabolic health insights.",
        "إنزيمات الكبد، عوامل نمط الحياة، الوزن، التعرض للكحول، ومؤشرات الصحة الأيضية."
      ),
      focus: text("Enzymes · Lifestyle · Weight", "الإنزيمات · نمط الحياة · الوزن"),
      time: text("3 min", "3 دقائق"),
    },
    {
      href: "/brain",
      icon: "🧠",
      label: text("Brain Wellness", "صحة الدماغ"),
      title: text("Brain Health", "صحة الدماغ"),
      description: text(
        "Sleep, stress, memory, concentration, headaches, and cognitive wellbeing.",
        "النوم، التوتر، الذاكرة، التركيز، الصداع، والصحة الذهنية."
      ),
      focus: text("Sleep · Stress · Memory", "النوم · التوتر · الذاكرة"),
      time: text("2 min", "دقيقتان"),
    },
    {
      href: "/metabolic",
      icon: "⚖️",
      label: text("Metabolic Balance", "التوازن الأيضي"),
      title: text("Metabolic Health", "صحة الأيض"),
      description: text(
        "Blood sugar, weight management, family history, and overall metabolic balance.",
        "سكر الدم، إدارة الوزن، التاريخ العائلي، والتوازن الأيضي العام."
      ),
      focus: text("Sugar · Weight · Balance", "السكر · الوزن · التوازن"),
      time: text("3 min", "3 دقائق"),
    },
  ];

  return (
    <main className="ohPageShell assessmentForceV2" dir={isArabic ? "rtl" : "ltr"}>
      <div className="ohContainer ohStack large" style={{ padding: "28px 0 56px" }}>
        <PageBackActions />

        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Organ Assessment Hub", "مركز تقييم الأعضاء")}
              </p>

              <h1 className="ohTitle">
                {text("Evaluate Your Organ Health", "قيّم صحة أعضائك")}
              </h1>

              <p className="ohLead">
                {text(
                  "Start with focused educational assessments for your heart, lungs, kidneys, liver, brain, and metabolic health. Each assessment creates a clear score and a next step for your health journey.",
                  "ابدأ بتقييمات تعليمية مركزة للقلب، الرئة، الكلى، الكبد، الدماغ، وصحة الأيض. كل تقييم يعطيك مؤشرًا واضحًا وخطوة تالية ضمن رحلتك الصحية."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/heart" className="primaryBtn">
                  {text("Start First Assessment", "ابدأ أول تقييم")}
                </Link>

                <Link href="/history" className="secondaryBtn">
                  {text("View Progress Timeline", "عرض مسار التقدم")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Assessment Readiness", "جاهزية التقييم")}
                  </p>
                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {text("Build your first health picture", "ابنِ أول صورة صحية لك")}
                  </h2>
                </div>

                <span className="ohStatusBadge neutral">
                  {text("Educational", "تعليمي")}
                </span>
              </div>

              <div className="ohGrid" style={{ gap: "12px" }}>
                <div className="ohMetricCard">
                  <span className="ohMetricLabel">
                    {text("Modules", "الوحدات")}
                  </span>
                  <span className="ohMetricValue">6</span>
                  <span className="ohMetricHint">
                    {text("Organ-focused assessments", "تقييمات مخصصة للأعضاء")}
                  </span>
                </div>

                <div className="ohMetricCard">
                  <span className="ohMetricLabel">
                    {text("Score Model", "نظام المؤشر")}
                  </span>
                  <span className="ohMetricValue">100</span>
                  <span className="ohMetricHint">
                    {text("Clear score for each module", "مؤشر واضح لكل وحدة")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ohMetricGrid">
          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Health Areas", "المجالات الصحية")}
            </span>
            <span className="ohMetricValue">6</span>
            <span className="ohMetricHint">
              {text("Heart, lung, kidney, liver, brain, metabolic", "القلب، الرئة، الكلى، الكبد، الدماغ، الأيض")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Result Format", "شكل النتيجة")}
            </span>
            <span className="ohMetricValue">/100</span>
            <span className="ohMetricHint">
              {text("Simple score with educational guidance", "مؤشر بسيط مع إرشاد تعليمي")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Saved Timeline", "المسار المحفوظ")}
            </span>
            <span className="ohMetricValue">✓</span>
            <span className="ohMetricHint">
              {text("Logged into your health history", "يُحفظ داخل التاريخ الصحي")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Next Step", "الخطوة التالية")}
            </span>
            <span className="ohMetricValue">AI</span>
            <span className="ohMetricHint">
              {text("Connect assessments to intelligence", "ربط التقييمات بالتحليل الصحي")}
            </span>
          </article>
        </section>

        <section className="ohActionPanel">
          <div className="ohCardHeader" style={{ marginBottom: 0 }}>
            <div>
              <p className="ohMetricLabel">
                {text("Recommended Start", "البداية المقترحة")}
              </p>

              <h2 className="ohCardTitle" style={{ fontSize: "1.55rem" }}>
                {text(
                  "Begin with the area you know most about",
                  "ابدأ بالمنطقة التي تعرف عنها أكثر"
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "If you are not sure where to start, begin with Heart Health or Metabolic Health because they connect strongly with long-term prevention and lifestyle patterns.",
                  "إذا لم تكن متأكدًا من أين تبدأ، ابدأ بصحة القلب أو صحة الأيض لأنهما مرتبطان بقوة بالوقاية طويلة المدى ونمط الحياة."
                )}
              </p>
            </div>

            <Link href="/heart" className="primaryBtn">
              {text("Start Heart Assessment", "ابدأ تقييم القلب")}
            </Link>
          </div>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Assessment Modules", "وحدات التقييم")}
              </p>
              <h2 className="ohCardTitle">
                {text(
                  "Choose one focused assessment",
                  "اختر تقييمًا واحدًا مركزًا"
                )}
              </h2>
              <p className="ohCardText">
                {text(
                  "Each module is short, clear, and designed to create a useful starting point for your personal health analysis.",
                  "كل وحدة قصيرة وواضحة ومصممة لإنشاء نقطة بداية مفيدة لذكائك الصحي الشخصي."
                )}
              </p>
            </div>
          </div>

          <div className="ohGrid cols3">
            {organModules.map((module) => (
              <Link
                href={module.href}
                className="ohCard"
                key={module.href}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "block",
                  minHeight: "100%",
                }}
              >
                <div className="ohCardHeader">
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "16px",
                      display: "grid",
                      placeItems: "center",
                      background: "var(--oh-primary-soft)",
                      fontSize: "1.65rem",
                    }}
                  >
                    {module.icon}
                  </div>

                  <span className="ohStatusBadge neutral">{module.time}</span>
                </div>

                <p className="ohMetricLabel">{module.label}</p>
                <h3 className="ohCardTitle" style={{ marginTop: "8px" }}>
                  {module.title}
                </h3>

                <p className="ohCardText">{module.description}</p>

                <div className="ohDivider" />

                <p className="ohCardText">
                  <strong>{text("Focus:", "التركيز:")}</strong> {module.focus}
                </p>

                <span
                  className="secondaryBtn"
                  style={{
                    display: "inline-flex",
                    marginTop: "16px",
                  }}
                >
                  {text("Open Assessment", "فتح التقييم")}
                </span>
              </Link>
            ))}
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
              "These assessments are educational screening tools. They do not diagnose disease or replace a licensed clinician, urgent care, or emergency medical services.",
              "هذه التقييمات أدوات تعليمية أولية. لا تشخّص المرض ولا تستبدل الطبيب المختص أو الرعاية العاجلة أو خدمات الطوارئ الطبية."
            )}
          </div>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Assessment Journey", "رحلة التقييم")}
              </p>
              <h2 className="ohCardTitle">
                {text(
                  "Continue after your assessment",
                  "تابع بعد إنهاء التقييم"
                )}
              </h2>
              <p className="ohCardText">
                {text(
                  "After saving assessments, open your timeline, upload reports, and use Health Analysis to connect the results into a clear follow-up direction.",
                  "بعد حفظ التقييمات، افتح مسار التقدم، ارفع التقارير، واستخدم مركز تحليل التقارير لربط النتائج باتجاه متابعة واضح."
                )}
              </p>
            </div>
          </div>

          <div className="ohButtonRow">
            <Link href="/history" className="primaryBtn">
              {text("View Progress Timeline", "عرض مسار التقدم")}
            </Link>

            <Link href="/lab-upload" className="secondaryBtn">
              {text("Upload Medical Report", "رفع تقرير طبي")}
            </Link>

            <Link href="/reports" className="secondaryBtn">
              {text("Open Reports", "فتح تحليل التقارير")}
            </Link>

            <Link href="/health-plan" className="secondaryBtn">
              {text("Open Health Plan", "فتح الخطة الصحية")}
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


