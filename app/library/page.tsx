"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { blogPosts } from "@/lib/blogData";

type Language = "en" | "ar";

type EducationPathway = {
  code: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  topics: string[];
  topicsAr: string[];
};

type ContentLayer = {
  code: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  status: "ready" | "planned";
};

const educationPathways: EducationPathway[] = [
  {
    code: "LAB",
    title: "Lab Marker Education",
    titleAr: "تثقيف مؤشرات المختبر",
    description:
      "Understand common lab values and what they may mean in a general educational context.",
    descriptionAr:
      "فهم مؤشرات المختبر الشائعة وما قد تعنيه ضمن سياق تثقيفي عام.",
    topics: ["LDL / HDL", "HbA1c", "Creatinine", "eGFR", "ALT / AST"],
    topicsAr: ["LDL / HDL", "HbA1c", "الكرياتينين", "eGFR", "ALT / AST"],
  },
  {
    code: "ORG",
    title: "Organ Health Guides",
    titleAr: "أدلة صحة الأعضاء",
    description:
      "Learn how major organ systems connect with symptoms, habits, and medical reports.",
    descriptionAr:
      "تعلّم كيف ترتبط أجهزة الجسم الرئيسية بالأعراض والعادات والتقارير الطبية.",
    topics: ["Heart", "Kidney", "Liver", "Lung", "Brain"],
    topicsAr: ["القلب", "الكلى", "الكبد", "الرئة", "الدماغ"],
  },
  {
    code: "REP",
    title: "Medical Report Literacy",
    titleAr: "فهم التقارير الطبية",
    description:
      "Learn how to read report sections, reference ranges, abnormal flags, and trends.",
    descriptionAr:
      "تعلّم كيف تقرأ أقسام التقرير والقيم المرجعية والعلامات غير الطبيعية والاتجاهات.",
    topics: ["Reference ranges", "Flags", "Trends", "Summary"],
    topicsAr: ["القيم المرجعية", "العلامات", "الاتجاهات", "الملخص"],
  },
  {
    code: "VIS",
    title: "Doctor Visit Preparation",
    titleAr: "التحضير لزيارة الطبيب",
    description:
      "Learn how to organize concerns and prepare focused questions before a medical visit.",
    descriptionAr:
      "تعلّم كيف ترتب مخاوفك وتحضر أسئلة مركزة قبل زيارة الطبيب.",
    topics: ["Questions", "Symptoms", "Medication list", "Follow-up"],
    topicsAr: ["الأسئلة", "الأعراض", "قائمة الأدوية", "المتابعة"],
  },
  {
    code: "LIF",
    title: "Lifestyle & Prevention",
    titleAr: "نمط الحياة والوقاية",
    description:
      "Learn practical basics about sleep, movement, nutrition, hydration, and stress.",
    descriptionAr:
      "تعلّم أساسيات عملية عن النوم والحركة والتغذية وشرب الماء والتوتر.",
    topics: ["Sleep", "Activity", "Nutrition", "Stress", "Hydration"],
    topicsAr: ["النوم", "النشاط", "التغذية", "التوتر", "شرب الماء"],
  },
  {
    code: "SAF",
    title: "Safety & When to Seek Care",
    titleAr: "السلامة ومتى تطلب الرعاية",
    description:
      "Understand general warning signs and why urgent symptoms need licensed medical care.",
    descriptionAr:
      "افهم العلامات التحذيرية العامة ولماذا تحتاج الأعراض العاجلة إلى رعاية طبية مرخصة.",
    topics: ["Chest pain", "Severe breathlessness", "Confusion", "Emergency signs"],
    topicsAr: ["ألم الصدر", "ضيق النفس الشديد", "التشوش", "علامات الطوارئ"],
  },
];

const contentLayers: ContentLayer[] = [
  {
    code: "01",
    title: "Article Library",
    titleAr: "مكتبة المقالات",
    description:
      "Live educational articles grouped by organ system, lab marker, report topic, and patient learning need.",
    descriptionAr:
      "مقالات تعليمية جاهزة مرتبة حسب العضو، مؤشر المختبر، موضوع التقرير، واحتياج المستخدم التعليمي.",
    status: "ready",
  },
  {
    code: "02",
    title: "Video Education",
    titleAr: "التثقيف بالفيديو",
    description:
      "A future video layer for simple explanations of lab markers, reports, prevention, and doctor preparation.",
    descriptionAr:
      "طبقة فيديو مستقبلية لشرح مؤشرات المختبر والتقارير والوقاية والتحضير للطبيب.",
    status: "planned",
  },
  {
    code: "03",
    title: "AI-Ready Metadata",
    titleAr: "بيانات جاهزة للذكاء الاصطناعي",
    description:
      "Content is prepared to later connect with organ systems, markers, risk topics, language, and audience.",
    descriptionAr:
      "المحتوى مجهز لاحقًا للربط بالأعضاء، المؤشرات، مواضيع الخطورة، اللغة، والجمهور المستهدف.",
    status: "planned",
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
    <span className="libraryCodeMark" aria-hidden="true">
      {label}
    </span>
  );
}

function StatusBadge({
  status,
  isArabic,
}: {
  status: ContentLayer["status"];
  isArabic: boolean;
}) {
  return (
    <span className={`ohStatusBadge ${status === "ready" ? "good" : "neutral"}`}>
      {status === "ready"
        ? isArabic
          ? "جاهز"
          : "Ready"
        : isArabic
          ? "مخطط"
          : "Planned"}
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
      className="ohPageShell libraryCommandPage"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <style>{`
        .libraryCommandPage a {
          color: inherit;
          text-decoration: none;
        }

        .libraryCommandPage .libraryPathwayGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .libraryCommandPage .libraryLayerGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .libraryCommandPage .libraryCodeMark {
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

        .libraryCommandPage .libraryPathwayCard {
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-height: 100%;
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

        .libraryCommandPage .libraryPrincipleList {
          display: grid;
          gap: 12px;
          margin-top: 18px;
        }

        .libraryCommandPage .libraryPrincipleItem {
          display: grid;
          grid-template-columns: 48px 1fr;
          gap: 12px;
          padding: 14px;
          border-radius: 18px;
          background: rgba(248, 250, 252, 0.82);
          border: 1px solid rgba(148, 163, 184, 0.18);
        }

        @media (max-width: 980px) {
          .libraryCommandPage .libraryPathwayGrid,
          .libraryCommandPage .libraryLayerGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .libraryCommandPage .libraryPathwayGrid,
          .libraryCommandPage .libraryLayerGrid {
            grid-template-columns: 1fr;
          }

          .libraryCommandPage .libraryPrincipleItem {
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
                {text(
                  "A focused place to understand health information.",
                  "مكان مركز لفهم المعلومات الصحية."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "The library explains lab markers, organ health, medical reports, doctor preparation, prevention, and safety in simple language.",
                  "تشرح المكتبة مؤشرات المختبر، صحة الأعضاء، التقارير الطبية، التحضير للطبيب، الوقاية، والسلامة بلغة بسيطة."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/blog" className="primaryBtn">
                  {text("Open Articles", "فتح المقالات")}
                </Link>

                <Link href="/library/videos" className="secondaryBtn">
                  {text("Video Guides", "دليل الفيديو")}
                </Link>
              </div>
            </div>

            <aside className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Education gateway", "بوابة التثقيف")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {text(
                      "Learn first. Use private tools in their own pages.",
                      "تعلّم أولًا. واستخدم الأدوات الخاصة في صفحاتها."
                    )}
                  </h2>
                </div>

                <span className="ohStatusBadge good">
                  {text("Focused", "مركزة")}
                </span>
              </div>

              <p className="ohCardText">
                {text(
                  "You can reach this library from the main navigation under Education. Articles are available now, while the video education roadmap shows what will be produced later.",
                  "يمكن الوصول إلى هذه المكتبة من القائمة الرئيسية عبر Education. المقالات متاحة الآن، أما دليل الفيديو فتوضح ما سيتم إنتاجه لاحقًا."
                )}
              </p>
            </aside>
          </div>
        </section>

        <section className="ohMetricGrid">
          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Live articles", "مقالات جاهزة")}
            </span>
            <span className="ohMetricValue">{blogPosts.length}</span>
            <span className="ohMetricHint">
              {text("Structured education content", "محتوى تعليمي منظم")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Health areas", "مجالات صحية")}
            </span>
            <span className="ohMetricValue">{categoryCount}</span>
            <span className="ohMetricHint">
              {text("Connected article categories", "تصنيفات مقالات مرتبطة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Lab markers", "مؤشرات مختبر")}
            </span>
            <span className="ohMetricValue">{markerCount}</span>
            <span className="ohMetricHint">
              {text("Prepared for future recommendations", "جاهزة لتوصيات لاحقة")}
            </span>
          </article>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Education pathways", "المسارات التعليمية")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Each pathway has a unique learning role.",
                  "كل مسار له دور تعليمي مختلف."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "These pathways organize what OrganHeal teaches before future personalization and AI recommendations.",
                  "هذه المسارات تنظّم ما يعلّمه OrganHeal قبل التخصيص وتوصيات الذكاء الاصطناعي لاحقًا."
                )}
              </p>
            </div>
          </div>

          <div className="libraryPathwayGrid">
            {educationPathways.map((pathway) => (
              <article className="ohCard libraryPathwayCard" key={pathway.code}>
                <CodeMark label={pathway.code} />

                <div>
                  <p className="ohMetricLabel">
                    {text("Learning area", "مجال تعليمي")}
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

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Content engine layers", "طبقات محرك المحتوى")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Build content once, use it across education and future AI.",
                  "نبني المحتوى مرة واحدة ونستخدمه للتثقيف والذكاء لاحقًا."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Articles are already live. Videos and AI-ready recommendation logic remain planned layers.",
                  "المقالات جاهزة الآن. الفيديوهات ومنطق التوصيات الذكية تبقى طبقات مخططة لاحقًا."
                )}
              </p>
            </div>
          </div>

          <div className="libraryLayerGrid">
            {contentLayers.map((layer) => (
              <article className="ohMetricCard" key={layer.code}>
                <div className="ohCardHeader" style={{ marginBottom: "10px" }}>
                  <CodeMark label={layer.code} />
                  <StatusBadge status={layer.status} isArabic={isArabic} />
                </div>

                <span className="ohMetricLabel">
                  {isArabic ? layer.titleAr : layer.title}
                </span>

                <span className="ohMetricHint">
                  {isArabic ? layer.descriptionAr : layer.description}
                </span>

                {layer.code === "02" && (
                  <Link
                    href="/library/videos"
                    className="secondaryBtn"
                    style={{ marginTop: "14px", width: "100%", justifyContent: "center" }}
                  >
                    {text("View Video Guides", "عرض دليل الفيديو")}
                  </Link>
                )}
              </article>
            ))}
          </div>

          <div className="ohButtonRow" style={{ marginTop: "20px" }}>
            <Link href="/library/videos" className="secondaryBtn">
              {text("Explore Video Guides", "استكشاف دليل الفيديو")}
            </Link>
          </div>
        </section>

        <section className="ohGrid cols2">
          <article className="ohActionPanel">
            <p className="ohMetricLabel">
              {text("Execution rule", "قاعدة التنفيذ")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "The library owns education, not every user action.",
                "المكتبة مسؤولة عن التثقيف، وليس كل إجراءات المستخدم."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "Assessment, report upload, assistant, dashboard, and intelligence should remain in their own pages. This keeps the product clean and prevents repeated funnels.",
                "التقييم، رفع التقارير، المساعد، لوحة التحكم، والذكاء الصحي يجب أن تبقى في صفحاتها الخاصة. هذا يحافظ على نظافة المنتج ويمنع تكرار المسارات."
              )}
            </p>
          </article>

          <article className="ohActionPanel">
            <p className="ohMetricLabel">
              {text("Medical safety", "السلامة الطبية")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Educational content does not replace clinical care.",
                "المحتوى التعليمي لا يستبدل الرعاية الطبية."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "OrganHeal explains information for learning and preparation only. Urgent symptoms, diagnosis, and treatment decisions must be handled by licensed medical professionals.",
                "OrganHeal يشرح المعلومات للتعلم والتحضير فقط. الأعراض العاجلة والتشخيص وقرارات العلاج يجب أن تكون من خلال مختصين طبيين مرخصين."
              )}
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}



