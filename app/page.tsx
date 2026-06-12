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
      <section className="homeHeroClean">
  <div className="homeHeroCleanInner">
    <div className="homeHeroCleanContent">
      <p className="homeBadge">
        {isArabic
          ? "نظام ذكاء صحي شخصي"
          : "Personal Health Intelligence System"}
      </p>

      <h1>
        {isArabic
          ? "افهم صحتك بوضوح. اعرف خطوتك التالية."
          : "Understand your health clearly. Know your next step."}
      </h1>

      <p className="homeHeroCleanText">
        {isArabic
          ? "حوّل التقييمات الصحية، نتائج المختبر، التسجيل اليومي، والتاريخ الصحي إلى ذكاء صحي واضح يساعدك على فهم المخاطر والفرص والخطوة التالية."
          : "Turn health assessments, lab results, daily wellness tracking, and health history into clear intelligence about risks, opportunities, and your next best action."}
      </p>

      <div className="homeHeroSearchBox">
        <input
          type="text"
          placeholder={
            isArabic
              ? "اسأل عن الكوليسترول، النوم، الكبد، القلب..."
              : "Ask about cholesterol, sleep, liver, heart health..."
          }
          disabled
        />

        <Link href="/assistant" className="primaryBtn">
          {isArabic ? "اسأل الذكاء الصحي" : "Ask AI"}
        </Link>

        <Link href="/lab-upload" className="secondaryBtn">
          {isArabic ? "رفع ملف" : "Upload File"}
        </Link>
      </div>

      <div className="homeHeroCleanActions">
        <Link href="/assessment" className="primaryBtn">
          {isArabic ? "ابدأ التقييم المجاني" : "Start Free Assessment"}
        </Link>

        <Link href="/intelligence" className="secondaryBtn">
          {isArabic ? "شاهد مركز الذكاء" : "View Intelligence Center"}
        </Link>

        <Link href="/login" className="secondaryBtn">
          {isArabic ? "تسجيل الدخول" : "Sign In"}
        </Link>
      </div>

      <p className="homeHeroDisclaimer">
        {isArabic
          ? "OrganHeal يقدم ذكاء صحي تعليمي ولا يستبدل الطبيب أو التشخيص الطبي."
          : "OrganHeal provides educational health intelligence and does not replace medical diagnosis or licensed care."}
      </p>
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