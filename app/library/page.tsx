"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Language = "en" | "ar";

type EducationSection = {
  icon: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  topics: string[];
  topicsAr: string[];
  href: string;
};

const educationSections: EducationSection[] = [
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
    href: "/blog",
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
    href: "/assessment",
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
    href: "/lab-upload",
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
    href: "/doctor-portal",
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
    href: "/checkin",
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
    href: "/medical-disclaimer",
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
    titleAr: "كيف تتحضّر لزيارة الطبيب؟",
    href: "/blog",
  },
  {
    title: "Why kidney markers matter",
    titleAr: "لماذا مؤشرات الكلى مهمة؟",
    href: "/blog",
  },
];

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";

  const savedLanguage =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("organheal_language") ||
    localStorage.getItem("language") ||
    "";

  return savedLanguage.toLowerCase().startsWith("ar") ? "ar" : "en";
}

export default function LibraryPage() {
  const [language, setLanguage] = useState<Language>("en");

  const isArabic = language === "ar";

  useEffect(() => {
    function syncLanguage() {
      const selectedLanguage = getStoredLanguage();

      setLanguage(selectedLanguage);
      document.documentElement.lang = selectedLanguage;
      document.documentElement.dir = selectedLanguage === "ar" ? "rtl" : "ltr";
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

  return (
    <main
      className="ohPageShell libraryCommandPage"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <style>{`
        .libraryCommandPage a {
          color: inherit;
          text-decoration: none;
        }

        .libraryCommandPage .libraryGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .libraryCommandPage .libraryCard {
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-height: 100%;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .libraryCommandPage .libraryCard:hover {
          transform: translateY(-3px);
          border-color: rgba(20, 184, 166, 0.34);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
        }

        .libraryCommandPage .libraryIcon {
          width: 46px;
          height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: rgba(20, 184, 166, 0.1);
          font-size: 1.45rem;
        }

        .libraryCommandPage .topicRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: auto;
          padding-top: 8px;
        }

        .libraryCommandPage .topicChip {
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.72);
          color: var(--oh-muted);
          font-size: 0.82rem;
          font-weight: 800;
        }

        .libraryCommandPage .starterGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }

        @media (max-width: 980px) {
          .libraryCommandPage .libraryGrid,
          .libraryCommandPage .starterGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .libraryCommandPage .libraryGrid,
          .libraryCommandPage .starterGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("OrganHeal Education Library", "مكتبة OrganHeal التعليمية")}
              </p>

              <h1 className="ohTitle">
                {text("Health Education Hub", "مركز التثقيف الصحي")}
              </h1>

              <p className="ohLead">
                {text(
                  "Learn about organ health, lab results, medical reports, doctor visit preparation, and prevention in a simple, organized way.",
                  "تعلّم عن صحة الأعضاء، نتائج المختبر، التقارير الطبية، التحضير للطبيب، والوقاية بطريقة بسيطة ومنظمة."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/blog" className="primaryBtn">
                  {text("Read Articles", "قراءة المقالات")}
                </Link>

                <Link href="/assistant" className="secondaryBtn">
                  {text("Ask Assistant", "اسأل المساعد")}
                </Link>

                <Link href="/assessment" className="secondaryBtn">
                  {text("Start Assessment", "ابدأ التقييم")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Library purpose", "هدف المكتبة")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {text(
                      "Organized health education, not diagnosis.",
                      "تثقيف صحي منظم، وليس تشخيصًا."
                    )}
                  </h2>
                </div>

                <span className="ohStatusBadge good">
                  {text("Educational", "تعليمي")}
                </span>
              </div>

              <p className="ohCardText">
                {text(
                  "This library helps you understand health terms and medical signals more clearly, so you can better track your health and discuss your results with a licensed clinician.",
                  "هذه المكتبة تساعدك على فهم المصطلحات الصحية والمؤشرات الطبية بشكل أوضح، حتى تكون أكثر استعدادًا لمتابعة صحتك ومناقشة نتائجك مع مختص صحي مرخص."
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="ohMetricGrid">
          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Education Topics", "مواضيع تعليمية")}
            </span>
            <span className="ohMetricValue">{educationSections.length}</span>
            <span className="ohMetricHint">
              {text("Core learning areas", "مجالات تعليمية أساسية")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Main Focus", "التركيز الأساسي")}
            </span>
            <span className="ohMetricValue">AI</span>
            <span className="ohMetricHint">
              {text("Health intelligence education", "تثقيف الذكاء الصحي")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Medical Role", "الدور الطبي")}
            </span>
            <span className="ohMetricValue">0</span>
            <span className="ohMetricHint">
              {text("No diagnosis or treatment", "لا تشخيص ولا علاج")}
            </span>
          </article>
        </section>

        <section className="ohTrustNotice">
          <span aria-hidden="true">🩺</span>
          <div>
            <strong>
              {text("Educational content only", "محتوى تعليمي فقط")}
            </strong>
            <br />
            {text(
              "OrganHeal provides educational and organizational health information only. It does not diagnose, treat, prescribe, or replace licensed medical care.",
              "OrganHeal يقدم معلومات صحية تعليمية وتنظيمية فقط. لا يشخّص ولا يعالج ولا يصف علاجًا ولا يستبدل الرعاية الطبية المرخصة."
            )}
          </div>
        </section>

        <section className="libraryGrid">
          {educationSections.map((section) => (
            <Link href={section.href} className="ohCard libraryCard" key={section.title}>
              <span className="libraryIcon" aria-hidden="true">
                {section.icon}
              </span>

              <div>
                <p className="ohMetricLabel">
                  {text("Learning area", "مجال تعليمي")}
                </p>

                <h2 className="ohCardTitle">
                  {isArabic ? section.titleAr : section.title}
                </h2>
              </div>

              <p className="ohCardText">
                {isArabic ? section.descriptionAr : section.description}
              </p>

              <div className="topicRow">
                {(isArabic ? section.topicsAr : section.topics).map((topic) => (
                  <span className="topicChip" key={topic}>
                    {topic}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </section>

        <section className="ohActionPanel">
          <div className="ohCardHeader" style={{ marginBottom: 0 }}>
            <div>
              <p className="ohMetricLabel">
                {text("Educational articles", "مقالات تعليمية")}
              </p>

              <h2 className="ohCardTitle" style={{ fontSize: "1.7rem" }}>
                {text(
                  "Read short articles from the OrganHeal Blog.",
                  "اقرأ مقالات قصيرة من مدونة OrganHeal."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "The library organizes learning areas, while the blog provides short readable articles on specific health subjects.",
                  "المكتبة تنظّم المجالات التعليمية، بينما تقدم المدونة مقالات قصيرة وسهلة القراءة حول مواضيع صحية محددة."
                )}
              </p>
            </div>

            <Link href="/blog" className="primaryBtn">
              {text("Open Blog", "فتح المدونة")}
            </Link>
          </div>

          <div className="starterGrid">
            {starterArticles.map((article) => (
              <Link href={article.href} className="ohCard" key={article.title}>
                <p className="ohMetricLabel">
                  {text("Starter article", "مقال مقترح")}
                </p>

                <h3 className="ohCardTitle">
                  {isArabic ? article.titleAr : article.title}
                </h3>

                <p className="ohCardText">
                  {text(
                    "Open the blog to read educational articles.",
                    "افتح المدونة لقراءة المقالات التعليمية."
                  )}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="ohGrid cols2">
          <article className="ohActionPanel">
            <p className="ohMetricLabel">
              {text("From education to personal insight", "من التثقيف إلى الفهم الشخصي")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Use your own data after learning the basics.",
                "استخدم بياناتك الخاصة بعد فهم الأساسيات."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "Start with education, then use assessments, reports, and Health Intelligence to organize your own journey.",
                "ابدأ بالتثقيف، ثم استخدم التقييمات والتقارير والذكاء الصحي لتنظيم رحلتك الخاصة."
              )}
            </p>

            <div className="ohButtonRow">
              <Link href="/assessment" className="primaryBtn">
                {text("Assessment", "التقييم")}
              </Link>

              <Link href="/lab-upload" className="secondaryBtn">
                {text("Upload Report", "رفع تقرير")}
              </Link>
            </div>
          </article>

          <article className="ohActionPanel">
            <p className="ohMetricLabel">
              {text("Ask OrganHeal AI", "اسأل OrganHeal AI")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Turn confusing health terms into clear questions.",
                "حوّل المصطلحات الصحية المربكة إلى أسئلة واضحة."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "Use the assistant for educational explanations and doctor-visit preparation.",
                "استخدم المساعد للشرح التعليمي والتحضير لزيارة الطبيب."
              )}
            </p>

            <div className="ohButtonRow">
              <Link href="/assistant" className="primaryBtn">
                {text("Open Assistant", "فتح المساعد")}
              </Link>

              <Link href="/medical-disclaimer" className="secondaryBtn">
                {text("Medical Disclaimer", "إخلاء المسؤولية")}
              </Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
