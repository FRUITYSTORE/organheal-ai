"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("organheal-language") || "en";
    setLanguage(savedLanguage);

    function handleStorageChange() {
      setLanguage(localStorage.getItem("organheal-language") || "en");
    }

    window.addEventListener("storage", handleStorageChange);

    const interval = setInterval(() => {
      setLanguage(localStorage.getItem("organheal-language") || "en");
    }, 300);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const isArabic = language === "ar";

  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: "OrganHeal AI",
    description:
      "AI-powered health intelligence platform for organ health assessment, laboratory interpretation, and personalized health insights.",
    url: "https://organheal.com",
    publisher: {
      "@type": "Organization",
      name: "OrganHeal AI",
      url: "https://organheal.com",
    },
  };

  return (
    <main className="homepage">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema),
        }}
      />

      <section className="hero">
        <div className="badge">
          {isArabic
            ? "منصة ذكاء صحي مدعومة بالذكاء الاصطناعي"
            : "AI-Powered Health Intelligence Platform"}
        </div>

        <h1 className="heroTitle">OrganHeal</h1>

        <p className="heroTagline">
          {isArabic
            ? "حوّل بياناتك الصحية إلى فهم واضح وخطوات عملية."
            : "Turn health data into clear, actionable insight."}
        </p>

        <p className="heroDescription">
          {isArabic
            ? "يساعدك OrganHeal على متابعة صحة الأعضاء، فهم نتائج المختبر، مراقبة نمط الصحة اليومي، إنشاء تقارير احترافية، واتباع خطط تحسين شخصية."
            : "OrganHeal helps you track organ wellness, understand lab results, monitor daily health patterns, generate professional reports, and follow personalized improvement plans."}
        </p>

        <div className="buttons">
          <Link href="/assessment" className="primaryBtn">
            {isArabic ? "ابدأ التقييم المجاني" : "Start Free Assessment"}
          </Link>

          <Link href="/dashboard" className="secondaryBtn">
            {isArabic ? "افتح لوحة التحكم" : "Open Dashboard"}
          </Link>

          <Link href="/checkin" className="secondaryBtn">
            {isArabic ? "التسجيل الصحي اليومي" : "Daily Check-In"}
          </Link>
        </div>
      </section>

      <section className="features">
        <div className="sectionHeader">
          <p className="sectionLabel">
            {isArabic ? "لماذا OrganHeal" : "Why OrganHeal"}
          </p>

          <h2>
            {isArabic
              ? "منصة واحدة للوعي الصحي، تتبع الاتجاهات، واتخاذ القرار"
              : "One platform for health awareness, trends, and action"}
          </h2>
        </div>

        <div className="featureGrid">
          <div className="featureCard">
            <div className="iconBox">📊</div>
            <h3>
              {isArabic
                ? "لوحة ذكاء صحي"
                : "Health Intelligence Dashboard"}
            </h3>
            <p>
              {isArabic
                ? "شاهد درجتك الصحية العامة، منطقة الأولوية، الصحة اليومية، المهمة الصحية، والتوجيهات الشخصية في مكان واحد."
                : "See your overall health score, priority area, daily wellness, health mission, and personalized guidance in one focused view."}
            </p>
          </div>

          <div className="featureCard">
            <div className="iconBox">🧪</div>
            <h3>{isArabic ? "تتبع المختبر والصحة" : "Lab & Wellness Tracking"}</h3>
            <p>
              {isArabic
                ? "تابع نتائج المختبر، التسجيلات اليومية، تقييمات الأعضاء، والتاريخ الصحي مع مرور الوقت."
                : "Track lab scores, daily check-ins, organ assessments, and health history over time."}
            </p>
          </div>

          <div className="featureCard">
            <div className="iconBox">🎯</div>
            <h3>{isArabic ? "خطة صحية شخصية" : "Personalized Health Plan"}</h3>
            <p>
              {isArabic
                ? "اتبع خطة تحسين لمدة 4 أسابيع بناءً على منطقة الأولوية، الأهداف الصحية، وأنماط العافية لديك."
                : "Follow a 4-week improvement plan based on your current priority area, health goals, and wellness patterns."}
            </p>
          </div>
        </div>
      </section>

      <section className="reportGrid">
        <Link href="/dashboard" className="reportCard clickableCard">
          <h3>📊 {isArabic ? "لوحة التحكم" : "Dashboard"}</h3>
          <span>{isArabic ? "مباشر" : "Live"}</span>
          <p>
            {isArabic
              ? "راجع الدرجة الصحية، المهمة اليومية، التسجيل الصحي، وتوجيهات الذكاء الصحي."
              : "View your health score, mission, check-in, and AI guidance."}
          </p>
        </Link>

        <Link href="/health-plan" className="reportCard clickableCard">
          <h3>🎯 {isArabic ? "الخطة الصحية" : "Health Plan"}</h3>
          <span>{isArabic ? "4 أسابيع" : "4 Weeks"}</span>
          <p>
            {isArabic
              ? "اتبع خارطة تحسين شخصية بناءً على نتائجك."
              : "Follow a personalized improvement roadmap based on your results."}
          </p>
        </Link>

        <Link href="/history" className="reportCard clickableCard">
          <h3>📈 {isArabic ? "السجل الصحي" : "Health History"}</h3>
          <span>{isArabic ? "اتجاهات" : "Trends"}</span>
          <p>
            {isArabic
              ? "راجع المخططات، التوقعات، الإنجازات، والأهداف الصحية."
              : "Review progress charts, forecasts, milestones, and goals."}
          </p>
        </Link>

        <Link href="/organ-report" className="reportCard clickableCard">
          <h3>📄 {isArabic ? "تقرير احترافي" : "Professional Report"}</h3>
          <span>PDF</span>
          <p>
            {isArabic
              ? "أنشئ تقرير ذكاء صحي احترافي قابل للتحميل."
              : "Generate a professional health intelligence report."}
          </p>
        </Link>

        <Link href="/lab-analyzer" className="reportCard clickableCard">
          <h3>🧪 {isArabic ? "تحليل المختبر" : "Lab Analyzer"}</h3>
          <span>{isArabic ? "درجة" : "Score"}</span>
          <p>
            {isArabic
              ? "حلل القيم المخبرية الأساسية واحصل على توضيحات تعليمية."
              : "Analyze key lab values and receive educational insights."}
          </p>
        </Link>

        <Link href="/assistant" className="reportCard clickableCard">
          <h3>🤖 {isArabic ? "المساعد الذكي" : "AI Assistant"}</h3>
          <span>{isArabic ? "دليل" : "Guide"}</span>
          <p>
            {isArabic
              ? "اسأل أسئلة صحية تعليمية واحصل على دعم موجه."
              : "Ask educational health questions and receive guided support."}
          </p>
        </Link>
      </section>

      <section className="trustSection">
        <div className="trustBox">
          <p className="sectionLabel">
            {isArabic ? "تنبيه طبي مهم" : "Important Medical Disclaimer"}
          </p>

          <h2>
            {isArabic
              ? "ذكاء صحي تعليمي وليس تشخيصًا طبيًا"
              : "Educational health intelligence, not diagnosis"}
          </h2>

          <p>
            {isArabic
              ? "تم تصميم OrganHeal للتعليم، تتبع العافية، وزيادة الوعي الصحي. لا يشخص الأمراض، ولا يستبدل الطبيب المرخص، ولا يقدم نصائح طبية طارئة."
              : "OrganHeal is designed for education, wellness tracking, and health awareness. It does not diagnose disease, replace a licensed healthcare professional, or provide emergency medical advice."}
          </p>
        </div>
      </section>

      <section className="homeCTA">
        <h2>
          {isArabic
            ? "ابدأ بناء ملفك الصحي الذكي"
            : "Start building your health intelligence profile"}
        </h2>

        <p>
          {isArabic
            ? "أكمل أول تقييم، تابع صحتك اليومية، وافتح لوحة التحكم الشخصية."
            : "Complete your first assessment, track your daily wellness, and unlock your personalized dashboard."}
        </p>

        <div className="buttons">
          <Link href="/assessment" className="primaryBtn">
            {isArabic ? "ابدأ التقييم" : "Start Assessment"}
          </Link>

          <Link href="/dashboard" className="secondaryBtn">
            {isArabic ? "عرض لوحة التحكم" : "View Dashboard"}
          </Link>
        </div>
      </section>
    </main>
  );
}