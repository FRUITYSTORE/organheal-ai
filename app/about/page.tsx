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
  <Link href="/">
    <button className="secondaryBtn">
      {isArabic ? "العودة إلى الصفحة الرئيسية" : "← Back to Home"}
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
              {isArabic ? "الثقة والسلامة الطبية" : "TRUST & MEDICAL SAFETY"}
            </p>

            <h2>
              {isArabic
                ? "ماذا يفعل OrganHeal — وماذا لا يفعل"
                : "What OrganHeal does — and does not do"}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "16px",
                marginTop: "18px",
              }}
            >
              <div className="aboutCard">
                <h3>
                  {isArabic ? "ما يقدمه OrganHeal" : "What OrganHeal provides"}
                </h3>

                <p>
                  {isArabic
                    ? "يساعد OrganHeal المستخدمين على تنظيم معلوماتهم الصحية، فهم نتائج المختبر والتقارير الطبية، متابعة صحة الأعضاء، والتحضير بشكل أفضل للنقاش مع الطبيب."
                    : "OrganHeal helps users organize health information, understand lab results and medical reports, track organ health patterns, and prepare better questions for clinical visits."}
                </p>
              </div>

              <div className="aboutCard">
                <h3>
                  {isArabic
                    ? "ما لا يقدمه OrganHeal"
                    : "What OrganHeal does not provide"}
                </h3>

                <p>
                  {isArabic
                    ? "لا يقدم OrganHeal تشخيصًا طبيًا، علاجًا، وصفات دوائية، أو نصيحة طبية طارئة، ولا يستبدل الطبيب أو الرعاية الطبية المرخصة."
                    : "OrganHeal does not provide medical diagnosis, treatment, prescriptions, emergency advice, or replace licensed medical care."}
                </p>
              </div>

              <div className="aboutCard">
                <h3>{isArabic ? "خصوصية البيانات" : "Data privacy"}</h3>

                <p>
                  {isArabic
                    ? "يجب التعامل مع البيانات الصحية بحذر واحترام. هدف OrganHeal هو تنظيم وفهم المعلومات الصحية بطريقة آمنة وواضحة للمستخدم."
                    : "Health data should be handled carefully and respectfully. OrganHeal’s goal is to organize and explain health information in a clear and privacy-conscious way."}
                </p>
              </div>

              <div className="aboutCard">
                <h3>{isArabic ? "الأعراض العاجلة" : "Urgent symptoms"}</h3>

                <p>
                  {isArabic
                    ? "في حال وجود ألم صدر شديد، ضيق نفس شديد، إغماء، تشوش، أو أعراض طارئة، يجب طلب الرعاية الطبية فورًا."
                    : "For severe chest pain, severe shortness of breath, fainting, confusion, or emergency symptoms, seek medical care immediately."}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}