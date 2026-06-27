"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Language = "en" | "ar";

const educationSections = [
  {
    icon: "🧪",
    title: "Lab Results Explained",
    titleAr: "شرح نتائج المختبر",
    description:
      "Understand common lab markers such as cholesterol, glucose, kidney markers, liver enzymes, vitamin D, and inflammation signals.",
    descriptionAr:
      "افهم مؤشرات المختبر الشائعة مثل الكوليسترول، السكر، مؤشرات الكلى، إنزيمات الكبد، فيتامين د، ومؤشرات الالتهاب.",
    topics: ["Cholesterol", "Glucose", "Creatinine", "ALT / AST", "Vitamin D"],
    topicsAr: ["الكوليسترول", "السكر", "الكرياتينين", "ALT / AST", "فيتامين د"],
  },
  {
    icon: "🫀",
    title: "Organ Health Guides",
    titleAr: "أدلة صحة الأعضاء",
    description:
      "Learn the basics of heart, kidney, liver, lung, brain, and metabolic health in simple language.",
    descriptionAr:
      "تعلّم أساسيات صحة القلب، الكلى، الكبد، الرئة، الدماغ، والصحة الأيضية بلغة بسيطة.",
    topics: ["Heart", "Kidney", "Liver", "Lung", "Brain"],
    topicsAr: ["القلب", "الكلى", "الكبد", "الرئة", "الدماغ"],
  },
  {
    icon: "📄",
    title: "Medical Report Education",
    titleAr: "التثقيف حول التقارير الطبية",
    description:
      "Learn how to read medical reports, understand abnormal flags, and prepare better questions for your doctor.",
    descriptionAr:
      "تعلّم كيف تقرأ التقارير الطبية، تفهم العلامات غير الطبيعية، وتحضّر أسئلة أفضل للطبيب.",
    topics: ["Report flags", "Trends", "Reference ranges", "Doctor brief"],
    topicsAr: ["علامات التقرير", "الاتجاهات", "القيم المرجعية", "ملخص الطبيب"],
  },
  {
    icon: "🩺",
    title: "Doctor Visit Preparation",
    titleAr: "التحضير لزيارة الطبيب",
    description:
      "Use structured education to prepare for appointments, organize your concerns, and understand what to ask.",
    descriptionAr:
      "استخدم التثقيف المنظم للتحضير للمواعيد، ترتيب مخاوفك، وفهم الأسئلة المهمة للطبيب.",
    topics: ["Questions to ask", "Symptoms", "Medication list", "Follow-up"],
    topicsAr: ["أسئلة للطبيب", "الأعراض", "قائمة الأدوية", "المتابعة"],
  },
  {
    icon: "🌿",
    title: "Lifestyle & Prevention",
    titleAr: "نمط الحياة والوقاية",
    description:
      "Explore simple education about sleep, activity, nutrition, hydration, stress, and prevention habits.",
    descriptionAr:
      "استكشف معلومات مبسطة عن النوم، النشاط، التغذية، شرب الماء، التوتر، والعادات الوقائية.",
    topics: ["Sleep", "Activity", "Nutrition", "Stress", "Hydration"],
    topicsAr: ["النوم", "النشاط", "التغذية", "التوتر", "شرب الماء"],
  },
  {
    icon: "⚠️",
    title: "When to Seek Care",
    titleAr: "متى تطلب الرعاية الطبية",
    description:
      "Understand general warning signs and why urgent symptoms should always be assessed by licensed medical professionals.",
    descriptionAr:
      "افهم العلامات التحذيرية العامة ولماذا يجب تقييم الأعراض العاجلة دائمًا من قبل مختصين مرخصين.",
    topics: ["Chest pain", "Severe shortness of breath", "Confusion", "Emergency symptoms"],
    topicsAr: ["ألم الصدر", "ضيق النفس الشديد", "التشوش", "أعراض الطوارئ"],
  },
];

const starterArticles = [
  {
    title: "What does high LDL cholesterol mean?",
    titleAr: "ماذا يعني ارتفاع LDL؟",
    href: "/blog",
  },
  {
    title: "How to prepare for a doctor visit",
    titleAr: "كيف تتحضر لزيارة الطبيب؟",
    href: "/blog",
  },
  {
    title: "Why kidney markers matter",
    titleAr: "لماذا مؤشرات الكلى مهمة؟",
    href: "/blog",
  },
];

export default function LibraryPage() {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const savedLanguage =
      (localStorage.getItem("organheal-language") as Language) || "en";

    setLanguage(savedLanguage);

    const interval = setInterval(() => {
      const currentLanguage =
        (localStorage.getItem("organheal-language") as Language) || "en";

      setLanguage(currentLanguage);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const isArabic = language === "ar";

  return (
    <main className="assistantPage">
      <div className="assistantContainer">
        <section className="assistantHeader">
          <p className="assistantBadge">
            {isArabic ? "مكتبة OrganHeal التعليمية" : "ORGANHEAL EDUCATION LIBRARY"}
          </p>

          <h1>
            {isArabic
              ? "مركز التثقيف الصحي"
              : "Health Education Hub"}
          </h1>

          <p>
            {isArabic
              ? "تعلم عن صحة الأعضاء، نتائج المختبر، التقارير الطبية، والتحضير للطبيب بطريقة بسيطة ومنظمة."
              : "Learn about organ health, lab results, medical reports, and doctor visit preparation in a simple, organized way."}
          </p>
        </section>

        <section className="chatWindow">
          <div className="resultBox">
            <p className="sectionLabel">
              {isArabic ? "هدف المكتبة" : "LIBRARY PURPOSE"}
            </p>

            <h2>
              {isArabic
                ? "تعليم صحي منظم، وليس تشخيصًا"
                : "Organized health education, not diagnosis"}
            </h2>

            <p style={{ opacity: 0.82, lineHeight: 1.8 }}>
              {isArabic
                ? "هذه المكتبة تساعدك على فهم المصطلحات الصحية والمؤشرات الطبية بشكل أوضح، حتى تكون أكثر استعدادًا لمتابعة صحتك ومناقشة نتائجك مع الطبيب."
                : "This library helps you understand health terms and medical signals more clearly, so you can better track your health and discuss your results with a licensed clinician."}
            </p>
          </div>

          <div
            className="featureGrid"
            style={{
              marginTop: "22px",
            }}
          >
            {educationSections.map((section) => (
              <div key={section.title} className="featureCard">
                <div className="iconBox">{section.icon}</div>

                <h3>{isArabic ? section.titleAr : section.title}</h3>

                <p>{isArabic ? section.descriptionAr : section.description}</p>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginTop: "14px",
                  }}
                >
                  {(isArabic ? section.topicsAr : section.topics).map((topic) => (
                    <span
                      key={topic}
                      style={{
                        padding: "7px 10px",
                        borderRadius: "999px",
                        border: "1px solid rgba(148,163,184,0.28)",
                        fontSize: "0.82rem",
                        opacity: 0.86,
                      }}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="resultBox" style={{ marginTop: "24px" }}>
            <p className="sectionLabel">
              {isArabic ? "مقالات تعليمية" : "EDUCATIONAL ARTICLES"}
            </p>

            <h2>
              {isArabic
                ? "اقرأ مقالات قصيرة من مدونة OrganHeal"
                : "Read short articles from the OrganHeal Blog"}
            </h2>

            <p style={{ opacity: 0.82, lineHeight: 1.8 }}>
              {isArabic
                ? "المكتبة تنظم المواضيع، والمدونة تقدم مقالات قصيرة قابلة للقراءة حول مواضيع صحية محددة."
                : "The library organizes topics, while the blog provides short readable articles on specific health subjects."}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
                marginTop: "18px",
              }}
            >
              {starterArticles.map((article) => (
                <Link
                  key={article.title}
                  href={article.href}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div className="featureCard">
                    <h3>{isArabic ? article.titleAr : article.title}</h3>
                    <p>
                      {isArabic
                        ? "افتح المدونة لقراءة المقالات التعليمية."
                        : "Open the blog to read educational articles."}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="resultBox" style={{ marginTop: "24px" }}>
            <p className="sectionLabel">
              {isArabic ? "السلامة الطبية" : "MEDICAL SAFETY"}
            </p>

            <h2>
              {isArabic
                ? "معلومة مهمة"
                : "Important note"}
            </h2>

            <p style={{ opacity: 0.82, lineHeight: 1.8 }}>
              {isArabic
                ? "OrganHeal يقدم معلومات تعليمية وتنظيمية فقط. لا يقدم تشخيصًا أو علاجًا ولا يستبدل الطبيب أو الرعاية الطبية المرخصة. في حالات الطوارئ أو الأعراض الشديدة، اطلب الرعاية الطبية فورًا."
                : "OrganHeal provides educational and organizational health information only. It does not diagnose, treat, or replace licensed medical care. For emergencies or severe symptoms, seek medical care immediately."}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}