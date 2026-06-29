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
    <main className="ohPageShell" dir={isArabic ? "rtl" : "ltr"}>
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
              {text("Connect assessments to intelligence", "ربط التقييمات بالذكاء الصحي")}
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
                  "Each module is short, clear, and designed to create a useful starting point for your personal health intelligence.",
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
                  "After saving assessments, open your timeline, upload reports, and use Health Intelligence to connect the results into a clear follow-up direction.",
                  "بعد حفظ التقييمات، افتح مسار التقدم، ارفع التقارير، واستخدم مركز الذكاء الصحي لربط النتائج باتجاه متابعة واضح."
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

            <Link href="/intelligence" className="secondaryBtn">
              {text("Open Intelligence", "فتح مركز الذكاء")}
            </Link>

            <Link href="/health-plan" className="secondaryBtn">
              {text("Open Health Plan", "فتح الخطة الصحية")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
