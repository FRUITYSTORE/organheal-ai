"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { blogPosts } from "@/lib/blogData";

type Language = "en" | "ar";

type LearningPathway = {
  code: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  topics: string[];
  topicsAr: string[];
};

const learningPathways: LearningPathway[] = [
  {
    code: "LAB",
    title: "Lab Marker Learning",
    titleAr: "تعلّم مؤشرات المختبر",
    description:
      "Understand common lab markers using simple educational explanations connected to real health topics.",
    descriptionAr:
      "افهم مؤشرات المختبر الشائعة من خلال شروحات تعليمية مبسطة مرتبطة بمواضيع صحية حقيقية.",
    topics: ["LDL / HDL", "HbA1c", "Creatinine", "eGFR", "ALT / AST"],
    topicsAr: ["LDL / HDL", "HbA1c", "الكرياتينين", "eGFR", "ALT / AST"],
  },
  {
    code: "ORG",
    title: "Organ Health Learning",
    titleAr: "تعلّم صحة الأعضاء",
    description:
      "Learn how major organ systems connect with symptoms, habits, lab markers, and medical reports.",
    descriptionAr:
      "تعلّم كيف ترتبط أجهزة الجسم الرئيسية بالأعراض والعادات ومؤشرات المختبر والتقارير الطبية.",
    topics: ["Heart", "Kidney", "Liver", "Brain", "Metabolic health"],
    topicsAr: ["القلب", "الكلى", "الكبد", "الدماغ", "الصحة الأيضية"],
  },
  {
    code: "REP",
    title: "Report Understanding",
    titleAr: "فهم التقارير الطبية",
    description:
      "Build confidence reading report language, reference ranges, abnormal flags, and trend comments.",
    descriptionAr:
      "ابنِ ثقة أكبر في قراءة لغة التقارير والقيم المرجعية والعلامات غير الطبيعية وملاحظات الاتجاهات.",
    topics: ["Reference ranges", "Flags", "Trends", "Summary language"],
    topicsAr: ["القيم المرجعية", "العلامات", "الاتجاهات", "لغة الملخص"],
  },
  {
    code: "VIS",
    title: "Doctor Visit Preparation",
    titleAr: "التحضير لزيارة الطبيب",
    description:
      "Prepare better questions, organize concerns, and understand what to review with a clinician.",
    descriptionAr:
      "حضّر أسئلة أفضل، نظّم مخاوفك، وافهم ما يجب مراجعته مع الطبيب.",
    topics: ["Questions", "Symptoms", "Medication list", "Follow-up"],
    topicsAr: ["الأسئلة", "الأعراض", "قائمة الأدوية", "المتابعة"],
  },
  {
    code: "LIF",
    title: "Lifestyle & Prevention",
    titleAr: "نمط الحياة والوقاية",
    description:
      "Learn practical basics about sleep, movement, nutrition, hydration, stress, and prevention.",
    descriptionAr:
      "تعلّم أساسيات عملية عن النوم والحركة والتغذية وشرب الماء والتوتر والوقاية.",
    topics: ["Sleep", "Activity", "Nutrition", "Stress", "Hydration"],
    topicsAr: ["النوم", "النشاط", "التغذية", "التوتر", "شرب الماء"],
  },
  {
    code: "SAF",
    title: "Safety Awareness",
    titleAr: "الوعي بالسلامة الصحية",
    description:
      "Understand general warning signs and why urgent symptoms need licensed medical care.",
    descriptionAr:
      "افهم العلامات التحذيرية العامة ولماذا تحتاج الأعراض العاجلة إلى رعاية طبية مرخصة.",
    topics: ["Chest pain", "Breathlessness", "Confusion", "Emergency signs"],
    topicsAr: ["ألم الصدر", "ضيق النفس", "التشوش", "علامات الطوارئ"],
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

function CodeMark({ label }: { label: string }) {
  return (
    <span className="learningCodeMark" aria-hidden="true">
      {label}
    </span>
  );
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

  const categoryCount = useMemo(() => {
    const categories = new Set(blogPosts.map((post) => post.category));
    return categories.size;
  }, []);

  const markerCount = useMemo(() => {
    const markers = new Set(blogPosts.flatMap((post) => post.labMarkers));
    return markers.size;
  }, []);

  return (
    <main
      className="ohPageShell healthLearningHubPage"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <style>{`
        .healthLearningHubPage a {
          color: inherit;
          text-decoration: none;
        }

        .healthLearningHubPage,
        .healthLearningHubPage * {
          box-sizing: border-box;
        }

        .healthLearningHubPage .learningPathwayGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .healthLearningHubPage .learningPathwayCard {
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-height: 100%;
        }

        .healthLearningHubPage .learningCodeMark {
          display: inline-flex;
          width: 48px;
          height: 48px;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(20, 184, 166, 0.14), rgba(37, 99, 235, 0.1));
          border: 1px solid rgba(20, 184, 166, 0.22);
          color: var(--oh-primary);
          font-weight: 900;
          font-size: 0.78rem;
          letter-spacing: 0.04em;
        }

        .healthLearningHubPage .topicRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: auto;
          padding-top: 8px;
        }

        .healthLearningHubPage .topicChip {
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.72);
          color: var(--oh-muted);
          font-size: 0.82rem;
          font-weight: 800;
        }

        .healthLearningHubPage .learningAccessCard {
          position: relative;
          overflow: hidden;
        }

        .healthLearningHubPage .learningAccessCard::before {
          content: "";
          position: absolute;
          inset: -90px -90px auto auto;
          width: 220px;
          height: 220px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(20, 184, 166, 0.16), transparent 68%);
          pointer-events: none;
        }

        @media (max-width: 980px) {
          .healthLearningHubPage .learningPathwayGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .healthLearningHubPage .learningPathwayGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("OrganHeal Health Learning Hub", "مركز OrganHeal للتعلّم الصحي")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Structured health learning for clearer medical decisions.",
                  "تعلّم صحي منظم لقرارات طبية أوضح."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "Explore patient-friendly articles about lab markers, organ health, report understanding, doctor preparation, prevention, and safety.",
                  "استكشف مقالات مبسطة للمريض حول مؤشرات المختبر، صحة الأعضاء، فهم التقارير، التحضير للطبيب، الوقاية، والسلامة."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/blog" className="primaryBtn">
                  {text("Read Health Articles", "قراءة المقالات الصحية")}
                </Link>
              </div>
            </div>

            <aside className="ohCard learningAccessCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Learning access", "مدخل التعلّم")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {text(
                      "Available educational content, organized for real use.",
                      "محتوى تعليمي متاح ومنظم للاستخدام الفعلي."
                    )}
                  </h2>
                </div>

                <span className="ohStatusBadge good">
                  {text("Live content", "محتوى متاح")}
                </span>
              </div>

              <p className="ohCardText">
                {text(
                  "You can reach this hub from the main navigation under Learning Hub. The current live path is health articles, with topics structured for safer understanding and better doctor questions.",
                  "يمكن الوصول إلى هذا المركز من القائمة الرئيسية عبر مركز التعلّم. المسار المتاح الآن هو المقالات الصحية، بمواضيع منظمة لفهم أكثر أمانًا وأسئلة أفضل للطبيب."
                )}
              </p>
            </aside>
          </div>
        </section>

        <section className="ohMetricGrid">
          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Health articles", "مقالات صحية")}
            </span>
            <span className="ohMetricValue">{blogPosts.length}</span>
            <span className="ohMetricHint">
              {text("Available learning items", "مواد تعليمية متاحة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Health areas", "مجالات صحية")}
            </span>
            <span className="ohMetricValue">{categoryCount}</span>
            <span className="ohMetricHint">
              {text("Organized article categories", "تصنيفات مقالات منظمة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Lab markers", "مؤشرات مختبر")}
            </span>
            <span className="ohMetricValue">{markerCount}</span>
            <span className="ohMetricHint">
              {text("Connected to article topics", "مرتبطة بمواضيع المقالات")}
            </span>
          </article>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Learning pathways", "مسارات التعلّم")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "A clear structure for health understanding.",
                  "بنية واضحة للفهم الصحي."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Each pathway supports a specific learning need without sending users into unrelated tools.",
                  "كل مسار يدعم احتياجًا تعليميًا محددًا بدون إرسال المستخدم إلى أدوات غير مرتبطة."
                )}
              </p>
            </div>
          </div>

          <div className="learningPathwayGrid">
            {learningPathways.map((pathway) => (
              <article className="ohCard learningPathwayCard" key={pathway.code}>
                <CodeMark label={pathway.code} />

                <div>
                  <p className="ohMetricLabel">
                    {text("Learning pathway", "مسار تعلّم")}
                  </p>

                  <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                    {isArabic ? pathway.titleAr : pathway.title}
                  </h3>
                </div>

                <p className="ohCardText">
                  {isArabic ? pathway.descriptionAr : pathway.description}
                </p>

                <div className="topicRow">
                  {(isArabic ? pathway.topicsAr : pathway.topics).map((topic) => (
                    <span className="topicChip" key={topic}>
                      {topic}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ohGrid cols2">
          <article className="ohActionPanel">
            <p className="ohMetricLabel">
              {text("Content boundary", "حدود المحتوى")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "The hub teaches. Private tools stay in their own pages.",
                "المركز يعلّم. والأدوات الخاصة تبقى في صفحاتها."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "Assessment, report upload, assistant, dashboard, and intelligence pages remain separate so the learning experience stays focused and professional.",
                "صفحات التقييم ورفع التقارير والمساعد ولوحة التحكم والذكاء الصحي تبقى منفصلة حتى تبقى تجربة التعلّم مركزة واحترافية."
              )}
            </p>
          </article>

          <article className="ohActionPanel">
            <p className="ohMetricLabel">
              {text("Clinical safety", "السلامة السريرية")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Learning content supports preparation, not diagnosis.",
                "المحتوى التعليمي يدعم التحضير، وليس التشخيص."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "OrganHeal explains information for learning and preparation only. Urgent symptoms, diagnosis, prescriptions, and treatment decisions must remain with licensed medical professionals.",
                "OrganHeal يشرح المعلومات للتعلّم والتحضير فقط. الأعراض العاجلة والتشخيص والوصفات وقرارات العلاج تبقى من مسؤولية المختصين الطبيين المرخصين."
              )}
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
