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
        "ذكاء المختبر والتقارير",
        "خطة صحية ومتابعة مستقبلية",
      ]
    : [
        "Heart Intelligence",
        "Lung Intelligence",
        "Kidney Intelligence",
        "Liver Intelligence",
        "Brain Intelligence",
        "Metabolic Intelligence",
        "Lab & Report Intelligence",
        "Health Plan & Follow-Up",
      ];

  return (
    <main className="assistantPage" dir={isArabic ? "rtl" : "ltr"}>
      <div className="assistantContainer">
        <section className="assistantHeader">
          <p className="assistantBadge">
            {isArabic ? "عن OrganHeal AI" : "ABOUT ORGANHEAL AI"}
          </p>

          <h1>
            {isArabic
              ? "ذكاء صحي شخصي يساعدك على فهم صحتك بوضوح"
              : "Personal Health Intelligence for Clearer Health Understanding"}
          </h1>

          <p>
            {isArabic
              ? "OrganHeal AI منصة صحية تعليمية وتنظيمية تساعد المستخدمين على فهم التقييمات الصحية، التقارير الطبية، نتائج المختبر، وأنماط المتابعة بطريقة واضحة ومنظمة."
              : "OrganHeal AI is an educational and organizational health intelligence platform that helps users understand health assessments, medical reports, lab results, and follow-up patterns in a clear and structured way."}
          </p>

          <div className="buttons">
            <Link href="/assessment">
              <button className="primaryBtn">
                {isArabic ? "ابدأ التقييم الصحي" : "Start Assessment"}
              </button>
            </Link>

            <Link href="/medical-disclaimer">
              <button className="secondaryBtn">
                {isArabic ? "إخلاء المسؤولية الطبية" : "Medical Disclaimer"}
              </button>
            </Link>
          </div>
        </section>

        <section className="resultBox">
          <p className="sectionLabel">
            {isArabic ? "المهمة" : "OUR MISSION"}
          </p>

          <h2>
            {isArabic
              ? "تحويل البيانات الصحية إلى فهم عملي"
              : "Turning health data into practical understanding"}
          </h2>

          <p>
            {isArabic
              ? "هدف OrganHeal AI هو مساعدة المستخدم على تنظيم معلوماته الصحية، فهم المؤشرات المهمة، تجهيز أسئلة أفضل للطبيب، ومتابعة التغيرات الصحية مع الوقت دون تقديم تشخيص أو علاج."
              : "OrganHeal AI helps users organize health information, understand important signals, prepare better questions for doctors, and track health changes over time without providing diagnosis or treatment."}
          </p>
        </section>

        <section className="resultBox">
          <p className="sectionLabel">
            {isArabic ? "ماذا يقدم؟" : "WHAT IT PROVIDES"}
          </p>

          <h2>
            {isArabic
              ? "نظام واحد لفهم التقييمات والتقارير والمتابعة"
              : "One system for assessments, reports, and follow-up"}
          </h2>

          <div className="aboutGrid">
            <div className="aboutCard">
              <h3>{isArabic ? "تقييمات صحية" : "Health Assessments"}</h3>
              <p>
                {isArabic
                  ? "تقييمات منظمة لصحة الأعضاء مثل القلب، الرئة، الكلى، الكبد، الدماغ، والصحة الأيضية."
                  : "Structured assessments for organ systems such as heart, lung, kidney, liver, brain, and metabolic health."}
              </p>
            </div>

            <div className="aboutCard">
              <h3>{isArabic ? "تحليل التقارير" : "Report Intelligence"}</h3>
              <p>
                {isArabic
                  ? "تنظيم وشرح التقارير الطبية ونتائج المختبر بطريقة مبسطة تساعد المستخدم على الفهم والتحضير للزيارة الطبية."
                  : "Organizes and explains medical reports and lab results in a simple way to support understanding and clinical visit preparation."}
              </p>
            </div>

            <div className="aboutCard">
              <h3>{isArabic ? "متابعة يومية" : "Daily Tracking"}</h3>
              <p>
                {isArabic
                  ? "متابعة الحالة اليومية، الأنماط الصحية، وتغيرات الصحة العامة داخل حساب المستخدم."
                  : "Tracks daily wellness status, health patterns, and changes in the user's account."}
              </p>
            </div>

            <div className="aboutCard">
              <h3>{isArabic ? "ملخص للطبيب" : "Doctor-Ready Brief"}</h3>
              <p>
                {isArabic
                  ? "يساعد على تجهيز ملخص منظم يمكن استخدامه للتحضير للنقاش مع الطبيب أو مقدم الرعاية الصحية."
                  : "Helps generate structured summaries that can support discussions with doctors or healthcare providers."}
              </p>
            </div>
          </div>
        </section>

        <section className="resultBox">
          <p className="sectionLabel">
            {isArabic ? "الوحدات الأساسية" : "CORE MODULES"}
          </p>

          <h2>
            {isArabic
              ? "ماذا يتضمن OrganHeal AI؟"
              : "What OrganHeal AI includes"}
          </h2>

          <div className="aboutModuleGrid">
            {modules.map((module) => (
              <div key={module} className="aboutModuleCard">
                {module}
              </div>
            ))}
          </div>
        </section>

        <section className="resultBox">
          <p className="sectionLabel">
            {isArabic ? "الثقة والسلامة الطبية" : "TRUST & MEDICAL SAFETY"}
          </p>

          <h2>
            {isArabic
              ? "ما الذي يفعله OrganHeal وما الذي لا يفعله؟"
              : "What OrganHeal does and does not do"}
          </h2>

          <div className="aboutGrid">
            <div className="aboutCard">
              <h3>{isArabic ? "يقدم معلومات تعليمية" : "Educational Guidance"}</h3>
              <p>
                {isArabic
                  ? "OrganHeal يقدم معلومات صحية تعليمية وتنظيمية تساعد على الفهم والتحضير، وليس لاتخاذ قرارات علاجية مستقلة."
                  : "OrganHeal provides educational and organizational health information to support understanding and preparation, not independent treatment decisions."}
              </p>
            </div>

            <div className="aboutCard">
              <h3>{isArabic ? "لا يشخص ولا يعالج" : "No Diagnosis or Treatment"}</h3>
              <p>
                {isArabic
                  ? "لا يقدم OrganHeal تشخيصًا طبيًا، علاجًا، وصفات دوائية، أو نصيحة طبية طارئة."
                  : "OrganHeal does not provide medical diagnosis, treatment, prescriptions, or emergency medical advice."}
              </p>
            </div>

            <div className="aboutCard">
              <h3>{isArabic ? "خصوصية البيانات" : "Data Privacy"}</h3>
              <p>
                {isArabic
                  ? "يتم التعامل مع المعلومات الصحية بحذر، ويجب على المستخدم رفع المعلومات التي يرغب فقط في تنظيمها داخل حسابه."
                  : "Health information should be handled carefully, and users should only upload information they want organized inside their account."}
              </p>
            </div>

            <div className="aboutCard">
              <h3>{isArabic ? "الأعراض الطارئة" : "Emergency Symptoms"}</h3>
              <p>
                {isArabic
                  ? "في حال وجود ألم صدر شديد، ضيق نفس شديد، إغماء، تشوش، نزيف شديد، أو أعراض طارئة، يجب طلب الرعاية الطبية فورًا."
                  : "For severe chest pain, severe shortness of breath, fainting, confusion, severe bleeding, or urgent symptoms, seek medical care immediately."}
              </p>
            </div>
          </div>
        </section>

        <section className="resultBox">
          <p className="sectionLabel">
            {isArabic ? "ابدأ الآن" : "GET STARTED"}
          </p>

          <h2>
            {isArabic
              ? "ابدأ بتقييم صحي أو ارفع تقريرًا طبيًا"
              : "Start with an assessment or upload a medical report"}
          </h2>

          <p>
            {isArabic
              ? "أفضل طريقة لاستخدام OrganHeal هي البدء بتقييم صحي، ثم رفع التقارير الطبية أو نتائج المختبر، وبعدها فتح مركز الذكاء الصحي للحصول على ملخص منظم."
              : "The best way to use OrganHeal is to start with a health assessment, upload medical reports or lab results, then open the Health Intelligence Center for a structured summary."}
          </p>

          <div className="buttons">
            <Link href="/assessment">
              <button className="primaryBtn">
                {isArabic ? "ابدأ التقييم" : "Start Assessment"}
              </button>
            </Link>

            <Link href="/lab-upload">
              <button className="secondaryBtn">
                {isArabic ? "ارفع تقريرًا طبيًا" : "Upload Medical Report"}
              </button>
            </Link>

            <Link href="/privacy">
              <button className="secondaryBtn">
                {isArabic ? "سياسة الخصوصية" : "Privacy Policy"}
              </button>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
