"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Language = "en" | "ar";

export default function AboutPage() {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const savedLanguage =
      (localStorage.getItem("organheal-language") as Language) || "en";

    setLanguage(savedLanguage);

    const interval = setInterval(() => {
      const currentLanguage =
        (localStorage.getItem("organheal-language") as Language) || "en";

      setLanguage(currentLanguage);
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const isArabic = language === "ar";

  const modules = isArabic
    ? [
        "ذكاء القلب",
        "ذكاء الرئة",
        "ذكاء الكلى",
        "ذكاء الكبد",
        "ذكاء الدماغ",
        "الذكاء الأيضي",
        "ذكاء المختبر",
        "محرك التنبؤ الصحي",
      ]
    : [
        "Heart Intelligence",
        "Lung Intelligence",
        "Kidney Intelligence",
        "Liver Intelligence",
        "Brain Intelligence",
        "Metabolic Intelligence",
        "Lab Intelligence",
        "Health Forecast Engine",
      ];

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <section className="assistantHeader">
          <p className="assistantBadge">
            {isArabic ? "حول OrganHeal AI" : "ABOUT ORGANHEAL AI"}
          </p>

          <h1>
            {isArabic
              ? "ذكاء صحي مدعوم بالذكاء الاصطناعي"
              : "AI-Powered Health Intelligence"}
          </h1>

          <p>
            {isArabic
              ? "تم تصميم OrganHeal AI لمساعدة المستخدمين على فهم صحة الأعضاء، وتفسير المؤشرات الصحية، وتتبع الاتجاهات الصحية، والحصول على تعليم صحي منظم من خلال أدوات رقمية ذكية."
              : "OrganHeal AI is designed to help users understand organ health, interpret wellness signals, track health trends, and receive structured health education through intelligent digital tools."}
          </p>

          <div className="buttons">
            <Link href="/dashboard">
              <button className="primaryBtn">
                {isArabic ? "افتح لوحة التحكم" : "Open Dashboard"}
              </button>
            </Link>

            <Link href="/assessment">
              <button className="secondaryBtn">
                {isArabic ? "ابدأ التقييم" : "Start Assessment"}
              </button>
            </Link>
          </div>
        </section>

        <section className="chatWindow">
          <div className="resultBox">
            <p className="sectionLabel">
              {isArabic ? "مهمتنا" : "OUR MISSION"}
            </p>

            <h2>
              {isArabic
                ? "جعل البيانات الصحية أسهل للفهم"
                : "Making health data easier to understand"}
            </h2>

            <p>
              {isArabic
                ? "يقوم OrganHeal AI بتحويل المدخلات الصحية الشخصية إلى رؤى واضحة ومنظمة وتعليمية. تركز المنصة على صحة الأعضاء، والعافية اليومية، وتفسير المختبر، والتخطيط الصحي، والمتابعة طويلة المدى."
                : "OrganHeal AI transforms personal health inputs into clear, organized, and educational insights. The platform focuses on organ health, daily wellness, lab interpretation, health planning, and long-term tracking."}
            </p>
          </div>

          <div className="resultBox">
            <p className="sectionLabel">
              {isArabic ? "لماذا OrganHeal" : "WHY ORGANHEAL"}
            </p>

            <h2>
              {isArabic
                ? "مبني لذكاء صحي عملي"
                : "Built for practical health intelligence"}
            </h2>

            <div className="aboutGrid">
              <div className="aboutCard">
                <h3>
                  {isArabic ? "رؤى شخصية" : "Personalized Insights"}
                </h3>
                <p>
                  {isArabic
                    ? "يتم إنشاء الدرجات والتوصيات الصحية بناءً على التقييمات، والتسجيلات اليومية، والمختبر، والأهداف الصحية."
                    : "Health scores and recommendations are generated from user inputs across assessments, check-ins, labs, and health goals."}
                </p>
              </div>

              <div className="aboutCard">
                <h3>{isArabic ? "متابعة الأعضاء" : "Organ Monitoring"}</h3>
                <p>
                  {isArabic
                    ? "تتابع المنصة القلب، الرئة، الكلى، الكبد، الدماغ، والصحة الأيضية."
                    : "The platform tracks major organ systems including heart, lung, kidney, liver, brain, and metabolic health."}
                </p>
              </div>

              <div className="aboutCard">
                <h3>{isArabic ? "التثقيف الصحي" : "Health Education"}</h3>
                <p>
                  {isArabic
                    ? "يعرض OrganHeal المعلومات بطريقة مبسطة تساعد المستخدم على فهم الأنماط الصحية ومناطق الخطورة المحتملة."
                    : "OrganHeal presents information in a simple way to help users understand their health patterns and possible risk areas."}
                </p>
              </div>

              <div className="aboutCard">
                <h3>{isArabic ? "تفسير المختبر" : "Lab Interpretation"}</h3>
                <p>
                  {isArabic
                    ? "يمكن أن تساهم نتائج المختبر والتقارير المرفوعة في بناء ملف ذكاء صحي أكثر شمولًا."
                    : "Lab values and uploaded reports can support a broader health intelligence profile."}
                </p>
              </div>
            </div>
          </div>

          <div className="resultBox">
            <p className="sectionLabel">
              {isArabic ? "رؤيتنا" : "OUR VISION"}
            </p>

            <h2>
              {isArabic
                ? "من التقييم الصحي إلى الذكاء الصحي"
                : "From health assessment to health intelligence"}
            </h2>

            <p>
              {isArabic
                ? "يتم تطوير OrganHeal AI كمنصة ذكاء صحي متكاملة، وليس مجرد أداة تقييم. الهدف هو دمج تقييمات الأعضاء، والتسجيلات اليومية، وتحليل المختبر، والأهداف الصحية، والخطط الشخصية، والتقارير الاحترافية ضمن تجربة واحدة مترابطة."
                : "OrganHeal AI is being developed as a full health intelligence platform, not only an assessment tool."}
            </p>
          </div>

          <div className="resultBox">
            <p className="sectionLabel">
              {isArabic ? "الوحدات الأساسية" : "CORE MODULES"}
            </p>

            <h2>
              {isArabic
                ? "ماذا يتضمن OrganHeal AI"
                : "What OrganHeal AI includes"}
            </h2>

            <div className="aboutModuleGrid">
              {modules.map((module) => (
                <div key={module} className="aboutModuleCard">
                  {module}
                </div>
              ))}
            </div>
          </div>

          <div className="resultBox">
            <p className="sectionLabel">
              {isArabic ? "الثقة والخصوصية" : "TRUST & PRIVACY"}
            </p>

            <h2>
              {isArabic
                ? "مصمم لحماية المستخدم"
                : "Designed with user protection in mind"}
            </h2>

            <p>
              {isArabic
                ? "يدعم OrganHeal الوعي الصحي والتعليم الصحي ولا يستبدل التشخيص الطبي أو الرعاية الصحية المهنية."
                : "OrganHeal AI supports health awareness and education. It does not replace medical diagnosis or professional care."}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}