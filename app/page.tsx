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

      <section className="homeHowItWorks">
  <div className="homeSectionHeader">
    <p className="sectionLabel">
      {isArabic ? "كيف يعمل OrganHeal؟" : "How OrganHeal Works"}
    </p>

    <h2>
      {isArabic
        ? "من بيانات بسيطة إلى ذكاء صحي واضح"
        : "From simple data to clear health intelligence"}
    </h2>

    <p>
      {isArabic
        ? "ابدأ بتقييم صحي، أضف نتائج المختبر أو التسجيل اليومي، ثم يحصل المستخدم على ملف صحي ذكي وخطوة تالية واضحة."
        : "Start with a health assessment, add labs or daily check-ins, and OrganHeal turns your data into a health profile, risk insights, and next best actions."}
    </p>
  </div>

  <div className="howStepsGrid">
    <Link href="/assessment" className="howStepCard">
      <span>01</span>
      <div className="howIcon">🫀</div>
      <h3>{isArabic ? "أكمل التقييم الصحي" : "Complete Assessment"}</h3>
      <p>
        {isArabic
          ? "أجب عن أسئلة موجهة حول صحة الأعضاء ونمط الحياة."
          : "Answer guided questions about organ health and lifestyle patterns."}
      </p>
    </Link>

    <Link href="/lab-upload" className="howStepCard">
      <span>02</span>
      <div className="howIcon">🧪</div>
      <h3>{isArabic ? "أضف نتائج المختبر" : "Add Lab Results"}</h3>
      <p>
        {isArabic
          ? "أدخل أو ارفع نتائج المختبر للحصول على فهم أعمق."
          : "Enter or upload lab information for deeper educational insights."}
      </p>
    </Link>

    <Link href="/checkin" className="howStepCard">
      <span>03</span>
      <div className="howIcon">☀️</div>
      <h3>{isArabic ? "تابع صحتك اليومية" : "Track Daily Wellness"}</h3>
      <p>
        {isArabic
          ? "سجل النوم، التوتر، المزاج، الترطيب، والنشاط."
          : "Log sleep, stress, mood, hydration, and physical activity."}
      </p>
    </Link>

    <Link href="/intelligence" className="howStepCard">
      <span>04</span>
      <div className="howIcon">🧠</div>
      <h3>{isArabic ? "احصل على الذكاء الصحي" : "Receive Intelligence"}</h3>
      <p>
        {isArabic
          ? "افتح الملف الصحي، نمط المخاطر، الفرص، التوقعات، وملخص الطبيب."
          : "Get your health profile, risk pattern, opportunities, forecast, and doctor brief."}
      </p>
    </Link>
  </div>
</section>
<section className="homeIntelligencePreview">
  <div className="homeSectionHeader">
    <p className="sectionLabel">
      {isArabic ? "معاينة الذكاء الصحي" : "Live Intelligence Preview"}
    </p>

    <h2>
      {isArabic
        ? "ليس مجرد رقم. بل فهم صحي قابل للتنفيذ."
        : "Not just a score. Actionable health intelligence."}
    </h2>

    <p>
      {isArabic
        ? "OrganHeal يحول البيانات الصحية إلى ملف ذكي يوضح الحالة، المخاطر، الفرص، والخطوة التالية."
        : "OrganHeal transforms health data into a smart profile showing status, risks, opportunities, and the next best action."}
    </p>
  </div>

  <div className="intelligencePreviewCard">
    <div className="previewMain">
      <p className="sectionLabel">
        {isArabic ? "الملف الصحي الذكي" : "Health Intelligence Profile"}
      </p>

      <h3>{isArabic ? "ملف صحي متوازن" : "Balanced Health Profile"}</h3>

      <p>
        {isArabic
          ? "يعرض هذا المثال كيف يحلل OrganHeal التقييمات، المختبر، والتسجيل اليومي لتكوين صورة صحية واضحة."
          : "This example shows how OrganHeal interprets assessments, labs, and daily tracking into a clear health picture."}
      </p>
    </div>

    <div className="previewMetricsGrid">
      <div>
        <span>{isArabic ? "الدرجة العامة" : "Overall Score"}</span>
        <strong>82/100</strong>
      </div>

      <div>
        <span>{isArabic ? "نمط المخاطر" : "Risk Pattern"}</span>
        <strong>{isArabic ? "متابعة وقائية" : "Preventive Monitoring"}</strong>
      </div>

      <div>
        <span>{isArabic ? "فرصة التحسن" : "Potential Gain"}</span>
        <strong>+8</strong>
      </div>

      <div>
        <span>{isArabic ? "الخطوة التالية" : "Next Best Action"}</span>
        <strong>{isArabic ? "تحسين النشاط" : "Improve activity"}</strong>
      </div>
    </div>

    <div className="previewDoctorBrief">
      <p className="sectionLabel">
        {isArabic ? "ملخص الطبيب" : "Doctor-Ready Brief"}
      </p>

      <p>
        {isArabic
          ? "المستخدم لديه مؤشرات صحية مستقرة مع فرصة واضحة لتحسين النشاط اليومي والمتابعة الوقائية."
          : "The user shows stable health indicators with a clear opportunity to improve daily activity and preventive tracking."}
      </p>
    </div>
  </div>
</section>
<section className="homeAIFeatures">
  <div className="homeSectionHeader">
    <p className="sectionLabel">
      {isArabic ? "ميزات الذكاء الاصطناعي" : "AI Health Features"}
    </p>

    <h2>
      {isArabic
        ? "ذكاء صحي يساعدك على الفهم وليس التخمين"
        : "Health AI that helps you understand, not guess"}
    </h2>

    <p>
      {isArabic
        ? "اسأل، حلل، تتبع، وشارك ملخصًا صحيًا احترافيًا مبنيًا على بياناتك."
        : "Ask, analyze, track, and share professional health summaries built around your data."}
    </p>
  </div>

  <div className="aiFeaturesGrid">
    <Link href="/assistant" className="aiFeatureCard">
      <div>🤖</div>
      <h3>{isArabic ? "البحث الصحي الذكي" : "AI Health Search"}</h3>
      <p>
        {isArabic
          ? "اسأل عن المؤشرات، الأعضاء، المختبر، والخطوة التالية."
          : "Ask about markers, organs, labs, and your next best action."}
      </p>
    </Link>

    <Link href="/lab-upload" className="aiFeatureCard">
      <div>🧪</div>
      <h3>{isArabic ? "تحليل ملفات المختبر" : "AI Lab Interpretation"}</h3>
      <p>
        {isArabic
          ? "ارفع ملفًا أو أدخل نتائج المختبر للحصول على فهم تعليمي."
          : "Upload or enter lab results for educational interpretation."}
      </p>
    </Link>

    <Link href="/intelligence" className="aiFeatureCard">
      <div>🎯</div>
      <h3>{isArabic ? "مدرب صحي ذكي" : "AI Health Coach"}</h3>
      <p>
        {isArabic
          ? "احصل على فرص التحسين والخطوة الصحية التالية."
          : "Get improvement opportunities and your next best health action."}
      </p>
    </Link>

    <Link href="/doctor-portal" className="aiFeatureCard">
      <div>🩺</div>
      <h3>{isArabic ? "ملخص الطبيب" : "Doctor Brief Generator"}</h3>
      <p>
        {isArabic
          ? "حوّل بياناتك إلى ملخص جاهز للمراجعة الطبية."
          : "Turn your data into a doctor-ready pre-visit brief."}
      </p>
    </Link>
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