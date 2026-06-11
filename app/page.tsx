"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("organheal-language") || "en";
    setLanguage(savedLanguage);

    const interval = setInterval(() => {
      setLanguage(localStorage.getItem("organheal-language") || "en");
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const isArabic = language === "ar";

  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: "OrganHeal AI",
    description:
      "AI-powered personal health intelligence platform for organ assessments, lab interpretation, wellness tracking, and professional health reports.",
    url: "https://organheal.com",
    publisher: {
      "@type": "Organization",
      name: "OrganHeal AI",
      url: "https://organheal.com",
    },
  };

  const intelligenceCards = [
    {
      icon: "🧠",
      title: isArabic ? "ذكاء صحي شخصي" : "Personal Health Intelligence",
      text: isArabic
        ? "حوّل التقييمات، المختبر، والتسجيل اليومي إلى ملف صحي واضح."
        : "Turn assessments, labs, and daily check-ins into a clear health profile.",
    },
    {
      icon: "📈",
      title: isArabic ? "اتجاهات وتوقعات" : "Trends & Forecasts",
      text: isArabic
        ? "تابع تطور صحتك، فرص التحسن، وتنبيهات التدهور."
        : "Track health trends, improvement opportunities, and escalation signals.",
    },
    {
      icon: "🩺",
      title: isArabic ? "ملخص جاهز للطبيب" : "Doctor-Ready Brief",
      text: isArabic
        ? "أنشئ ملخصًا احترافيًا يساعدك في مناقشة حالتك مع الطبيب."
        : "Generate a professional brief to support better doctor conversations.",
    },
  ];

  return (
    <main className="homepage">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="homeHeroModern">
        <div className="homeHeroContent">
          <p className="homeBadge">
            {isArabic
              ? "منصة ذكاء صحي شخصية"
              : "Personal Health Intelligence OS"}
          </p>

          <h1>
            {isArabic
              ? "افهم صحتك. اعرف خطوتك التالية."
              : "Understand your health. Know your next step."}
          </h1>

          <p className="homeHeroText">
            {isArabic
              ? "OrganHeal يحول بيانات التقييمات، المختبر، التسجيل اليومي، والتاريخ الصحي إلى ملف صحي ذكي، فرص تحسين، تنبيهات مخاطر، وتقرير احترافي للطبيب."
              : "OrganHeal turns assessments, labs, daily check-ins, and health history into a smart health profile, improvement opportunities, risk alerts, and doctor-ready reports."}
          </p>

          <div className="homeHeroActions">
            <Link href="/assessment" className="primaryBtn">
              {isArabic ? "ابدأ التقييم" : "Start Assessment"}
            </Link>

            <Link href="/login" className="secondaryBtn">
              {isArabic ? "تسجيل الدخول" : "Sign In"}
            </Link>

            <Link href="/dashboard" className="secondaryBtn">
              {isArabic ? "لوحة التحكم" : "Dashboard"}
            </Link>
          </div>
        </div>

        <div className="homeHeroPanel">
          <p>{isArabic ? "Health Intelligence" : "Health Intelligence"}</p>
          <h2>82/100</h2>
          <span>{isArabic ? "مثال توضيحي" : "Example preview"}</span>

          <div className="homeMiniStats">
            <div>
              <strong>{isArabic ? "الأولوية" : "Priority"}</strong>
              <p>Heart</p>
            </div>

            <div>
              <strong>{isArabic ? "الاتجاه" : "Trend"}</strong>
              <p>Improving</p>
            </div>

            <div>
              <strong>{isArabic ? "الفرصة" : "Opportunity"}</strong>
              <p>+8 pts</p>
            </div>
          </div>
        </div>
      </section>

      <section className="homeSection">
        <p className="sectionLabel">
          {isArabic ? "ماذا يقدم OrganHeal؟" : "What OrganHeal Does"}
        </p>

        <h2>
          {isArabic
            ? "منصة واحدة للقياس، الفهم، والتصرف"
            : "One platform to measure, understand, and act"}
        </h2>

        <div className="homeModernGrid">
          {intelligenceCards.map((card) => (
            <div className="homeModernCard" key={card.title}>
              <div className="homeCardIcon">{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="homeActionStrip">
        <div>
          <p className="sectionLabel">
            {isArabic ? "ابدأ الآن" : "Start Now"}
          </p>

          <h2>
            {isArabic
              ? "ابدأ ببناء ملفك الصحي الذكي"
              : "Start building your health intelligence profile"}
          </h2>

          <p>
            {isArabic
              ? "ابدأ بتقييم واحد فقط، ثم افتح لوحة التحكم لمتابعة الذكاء الصحي."
              : "Start with one assessment, then open your dashboard to follow your health intelligence."}
          </p>
        </div>

        <div className="homeHeroActions">
          <Link href="/assessment" className="primaryBtn">
            {isArabic ? "ابدأ التقييم" : "Start Assessment"}
          </Link>

          <Link href="/signup" className="secondaryBtn">
            {isArabic ? "إنشاء حساب" : "Create Account"}
          </Link>
        </div>
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
              ? "OrganHeal مصمم للتعليم، تتبع العافية، وزيادة الوعي الصحي. لا يشخص الأمراض ولا يستبدل الطبيب المرخص."
              : "OrganHeal is designed for education, wellness tracking, and health awareness. It does not diagnose disease or replace a licensed healthcare professional."}
          </p>
        </div>
      </section>
    </main>
  );
}