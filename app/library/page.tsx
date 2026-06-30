"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Language = "en" | "ar";

type EducationPathway = {
  code: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  topics: string[];
  topicsAr: string[];
  actionLabel: string;
  actionLabelAr: string;
  href: string;
};

type StarterResource = {
  code: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  href: string;
  status: "available" | "planned";
};

const educationPathways: EducationPathway[] = [
  {
    code: "LAB",
    title: "Lab Marker Education",
    titleAr: "تثقيف مؤشرات المختبر",
    description:
      "Understand common markers such as LDL, HDL, HbA1c, creatinine, eGFR, ALT, AST, vitamin D, and inflammation signals.",
    descriptionAr:
      "افهم مؤشرات شائعة مثل LDL، HDL، HbA1c، الكرياتينين، eGFR، ALT، AST، فيتامين D، ومؤشرات الالتهاب.",
    topics: ["LDL / HDL", "HbA1c", "Creatinine", "eGFR", "ALT / AST"],
    topicsAr: ["LDL / HDL", "HbA1c", "الكرياتينين", "eGFR", "ALT / AST"],
    actionLabel: "Read articles",
    actionLabelAr: "قراءة المقالات",
    href: "/blog",
  },
  {
    code: "ORG",
    title: "Organ Health Guides",
    titleAr: "أدلة صحة الأعضاء",
    description:
      "Learn how heart, kidney, liver, lung, brain, and metabolic health connect to daily habits and medical reports.",
    descriptionAr:
      "تعلّم كيف ترتبط صحة القلب، الكلى، الكبد، الرئة، الدماغ، والصحة الأيضية بالعادات اليومية والتقارير الطبية.",
    topics: ["Heart", "Kidney", "Liver", "Lung", "Metabolic"],
    topicsAr: ["القلب", "الكلى", "الكبد", "الرئة", "الأيض"],
    actionLabel: "Start assessment",
    actionLabelAr: "ابدأ التقييم",
    href: "/assessment",
  },
  {
    code: "REP",
    title: "Medical Report Understanding",
    titleAr: "فهم التقارير الطبية",
    description:
      "Learn how to read written reports, abnormal flags, reference ranges, trends, and what to clarify with your clinician.",
    descriptionAr:
      "تعلّم كيف تقرأ التقارير المكتوبة، العلامات غير الطبيعية، القيم المرجعية، الاتجاهات، وما يجب توضيحه مع الطبيب.",
    topics: ["Reference ranges", "Abnormal flags", "Trends", "Doctor brief"],
    topicsAr: ["القيم المرجعية", "العلامات غير الطبيعية", "الاتجاهات", "ملخص الطبيب"],
    actionLabel: "Upload report",
    actionLabelAr: "رفع تقرير",
    href: "/lab-upload",
  },
  {
    code: "VISIT",
    title: "Doctor Visit Preparation",
    titleAr: "التحضير لزيارة الطبيب",
    description:
      "Prepare questions, organize symptoms, review medications, and bring a clearer summary to your appointment.",
    descriptionAr:
      "حضّر الأسئلة، رتّب الأعراض، راجع الأدوية، وخذ ملخصًا أوضح إلى موعدك الطبي.",
    topics: ["Questions", "Symptoms", "Medication list", "Follow-up"],
    topicsAr: ["الأسئلة", "الأعراض", "قائمة الأدوية", "المتابعة"],
    actionLabel: "Open assistant",
    actionLabelAr: "فتح المساعد",
    href: "/assistant",
  },
  {
    code: "LIFE",
    title: "Lifestyle & Prevention",
    titleAr: "نمط الحياة والوقاية",
    description:
      "Learn practical basics about sleep, activity, nutrition, hydration, stress, and preventive habits.",
    descriptionAr:
      "تعلّم أساسيات عملية عن النوم، النشاط، التغذية، شرب الماء، التوتر، والعادات الوقائية.",
    topics: ["Sleep", "Activity", "Nutrition", "Stress", "Hydration"],
    topicsAr: ["النوم", "النشاط", "التغذية", "التوتر", "شرب الماء"],
    actionLabel: "Daily check-in",
    actionLabelAr: "التحديث اليومي",
    href: "/checkin",
  },
  {
    code: "SAFE",
    title: "When to Seek Medical Care",
    titleAr: "متى تطلب الرعاية الطبية",
    description:
      "Understand general warning signs and why urgent symptoms should always be assessed by licensed medical professionals.",
    descriptionAr:
      "افهم العلامات التحذيرية العامة ولماذا يجب تقييم الأعراض العاجلة دائمًا من قبل مختصين مرخصين.",
    topics: ["Chest pain", "Severe shortness of breath", "Confusion", "Emergency symptoms"],
    topicsAr: ["ألم الصدر", "ضيق النفس الشديد", "التشوش", "أعراض الطوارئ"],
    actionLabel: "Safety notice",
    actionLabelAr: "تنبيه السلامة",
    href: "/medical-disclaimer",
  },
];

const starterResources: StarterResource[] = [
  {
    code: "LDL",
    title: "What does high LDL cholesterol mean?",
    titleAr: "ماذا يعني ارتفاع LDL؟",
    description:
      "A simple explanation of cholesterol patterns and what to ask your clinician.",
    descriptionAr:
      "شرح مبسط لأنماط الكوليسترول وما يمكن مناقشته مع الطبيب.",
    href: "/blog",
    status: "available",
  },
  {
    code: "KID",
    title: "Why kidney markers matter",
    titleAr: "لماذا مؤشرات الكلى مهمة؟",
    description:
      "Learn why creatinine, eGFR, hydration, and blood pressure often connect.",
    descriptionAr:
      "تعلّم لماذا ترتبط مؤشرات الكرياتينين وeGFR وشرب الماء وضغط الدم.",
    href: "/blog",
    status: "available",
  },
  {
    code: "VIS",
    title: "How to prepare for a doctor visit",
    titleAr: "كيف تتحضّر لزيارة الطبيب؟",
    description:
      "Turn confusing health concerns into a short list of useful questions.",
    descriptionAr:
      "حوّل المخاوف الصحية المربكة إلى قائمة قصيرة من الأسئلة المفيدة.",
    href: "/blog",
    status: "available",
  },
  {
    code: "VID",
    title: "Video education library",
    titleAr: "مكتبة الفيديوهات التعليمية",
    description:
      "Future short videos will explain reports, lab markers, prevention, and doctor preparation.",
    descriptionAr:
      "لاحقًا سيتم إضافة فيديوهات قصيرة تشرح التقارير، مؤشرات المختبر، الوقاية، والتحضير للطبيب.",
    href: "/library",
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

function StatusBadge({
  status,
  isArabic,
}: {
  status: StarterResource["status"];
  isArabic: boolean;
}) {
  if (status === "available") {
    return (
      <span className="ohStatusBadge good">
        {isArabic ? "متاح" : "Available"}
      </span>
    );
  }

  return (
    <span className="ohStatusBadge neutral">
      {isArabic ? "قادم لاحقًا" : "Planned"}
    </span>
  );
}

function IconMark({ label }: { label: string }) {
  return (
    <span className="libraryIconMark" aria-hidden="true">
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

        .libraryCommandPage .libraryResourceGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .libraryCommandPage .libraryPathwayCard {
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-height: 100%;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .libraryCommandPage .libraryPathwayCard:hover {
          transform: translateY(-3px);
          border-color: rgba(20, 184, 166, 0.34);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
        }

        .libraryCommandPage .libraryIconMark {
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

        .libraryCommandPage .libraryRoadmap {
          display: grid;
          gap: 12px;
          margin-top: 18px;
        }

        .libraryCommandPage .libraryRoadmapItem {
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 12px;
          align-items: flex-start;
          padding: 14px;
          border-radius: 18px;
          background: rgba(248, 250, 252, 0.82);
          border: 1px solid rgba(148, 163, 184, 0.18);
        }

        @media (max-width: 1100px) {
          .libraryCommandPage .libraryResourceGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 980px) {
          .libraryCommandPage .libraryPathwayGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .libraryCommandPage .libraryPathwayGrid,
          .libraryCommandPage .libraryResourceGrid {
            grid-template-columns: 1fr;
          }

          .libraryCommandPage .libraryRoadmapItem {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("OrganHeal Content & Education Engine", "محرك OrganHeal للتثقيف الصحي")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Learn, understand, then act with clarity.",
                  "تعلّم، افهم، ثم تصرّف بوضوح."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "A structured education hub for lab markers, organ health, medical reports, doctor visit preparation, prevention, and future video learning.",
                  "مركز تثقيف منظم لمؤشرات المختبر، صحة الأعضاء، التقارير الطبية، التحضير للطبيب، الوقاية، والفيديوهات التعليمية لاحقًا."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/blog" className="primaryBtn">
                  {text("Read Articles", "قراءة المقالات")}
                </Link>

                <Link href="/assistant" className="secondaryBtn">
                  {text("Ask OrganHeal", "اسأل OrganHeal")}
                </Link>

                <Link href="/lab-upload" className="secondaryBtn">
                  {text("Upload Report", "رفع تقرير")}
                </Link>
              </div>
            </div>

            <aside className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Why this library matters", "لماذا هذه المكتبة مهمة؟")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {text(
                      "Education becomes personal when connected to your data.",
                      "التثقيف يصبح شخصيًا عندما يرتبط ببياناتك."
                    )}
                  </h2>
                </div>

                <span className="ohStatusBadge good">
                  {text("Education-first", "تثقيف أولًا")}
                </span>
              </div>

              <p className="ohCardText">
                {text(
                  "OrganHeal should not only generate reports. It should teach users what their health signals mean, what to ask next, and how to prepare for better care.",
                  "OrganHeal لا يجب أن يكتفي بتوليد التقارير. يجب أن يعلّم المستخدم معنى المؤشرات الصحية، ماذا يسأل بعد ذلك، وكيف يستعد لرعاية أفضل."
                )}
              </p>

              <div className="ohDivider" />

              <div className="ohTimeline">
                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">
                      {text("Learn the basics", "تعلّم الأساسيات")}
                    </p>
                    <p className="ohTimelineMeta">
                      {text("Articles and explainers.", "مقالات وشروحات مبسطة.")}
                    </p>
                  </div>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">
                      {text("Connect to your reports", "اربطها بتقاريرك")}
                    </p>
                    <p className="ohTimelineMeta">
                      {text("Reports and intelligence summaries.", "تقارير وملخصات ذكاء صحي.")}
                    </p>
                  </div>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">
                      {text("Prepare your next step", "حضّر خطوتك التالية")}
                    </p>
                    <p className="ohTimelineMeta">
                      {text("Doctor questions and follow-up actions.", "أسئلة للطبيب وخطوات متابعة.")}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="ohMetricGrid">
          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Learning pathways", "مسارات تعليمية")}
            </span>
            <span className="ohMetricValue">{educationPathways.length}</span>
            <span className="ohMetricHint">
              {text("Core education areas", "مجالات تثقيف أساسية")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Future video learning", "تعليم بالفيديو لاحقًا")}
            </span>
            <span className="ohMetricValue">V1</span>
            <span className="ohMetricHint">
              {text("Structure prepared now", "تم تجهيز الهيكل الآن")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("AI readiness", "جاهزية الذكاء")}
            </span>
            <span className="ohMetricValue">RAG</span>
            <span className="ohMetricHint">
              {text("Content can support future AI answers", "المحتوى سيدعم إجابات AI لاحقًا")}
            </span>
          </article>
        </section>

        <section className="ohTrustNotice">
          <span aria-hidden="true">!</span>
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

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Education pathways", "المسارات التعليمية")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Choose how you want to understand your health",
                  "اختر كيف تريد أن تفهم صحتك"
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Each pathway is designed to connect education with action: articles, reports, assessments, assistant support, and doctor preparation.",
                  "كل مسار مصمم لربط التثقيف بالفعل: مقالات، تقارير، تقييمات، دعم المساعد، والتحضير للطبيب."
                )}
              </p>
            </div>
          </div>

          <div className="libraryPathwayGrid">
            {educationPathways.map((section) => (
              <Link
                href={section.href}
                className="ohCard libraryPathwayCard"
                key={section.title}
              >
                <IconMark label={section.code} />

                <div>
                  <p className="ohMetricLabel">
                    {text("Learning area", "مجال تعليمي")}
                  </p>

                  <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                    {isArabic ? section.titleAr : section.title}
                  </h3>
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

                <span className="ohMetricHint" style={{ fontWeight: 900 }}>
                  {isArabic ? section.actionLabelAr : section.actionLabel} →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Starter resources", "موارد البداية")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Build the first content layer before AI personalization",
                  "ابنِ طبقة المحتوى الأولى قبل تخصيص الذكاء الاصطناعي"
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "These resources define the first content categories that will later support article recommendations, video education, and private medical chat.",
                  "هذه الموارد تحدد أول تصنيفات المحتوى التي ستدعم لاحقًا توصيات المقالات، الفيديوهات التعليمية، والدردشة الطبية الخاصة."
                )}
              </p>
            </div>

            <Link href="/blog" className="primaryBtn">
              {text("Open Blog", "فتح المدونة")}
            </Link>
          </div>

          <div className="libraryResourceGrid">
            {starterResources.map((resource) => (
              <Link href={resource.href} className="ohMetricCard" key={resource.title}>
                <div className="ohCardHeader" style={{ marginBottom: "8px" }}>
                  <IconMark label={resource.code} />
                  <StatusBadge status={resource.status} isArabic={isArabic} />
                </div>

                <span className="ohMetricLabel">
                  {isArabic ? resource.titleAr : resource.title}
                </span>

                <span className="ohMetricHint">
                  {isArabic ? resource.descriptionAr : resource.description}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="ohGrid cols2">
          <article className="ohActionPanel">
            <p className="ohMetricLabel">
              {text("Next content phase", "مرحلة المحتوى التالية")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Create dedicated article and video structures.",
                "إنشاء هيكل مستقل للمقالات والفيديوهات."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "The next build should separate articles, videos, categories, and future AI-ready metadata instead of keeping everything inside one page.",
                "المرحلة القادمة يجب أن تفصل المقالات، الفيديوهات، التصنيفات، وبيانات AI المستقبلية بدل وضع كل شيء داخل صفحة واحدة."
              )}
            </p>

            <div className="libraryRoadmap">
              <div className="libraryRoadmapItem">
                <IconMark label="01" />
                <div>
                  <p className="ohTimelineTitle">
                    {text("Article detail structure", "هيكل تفاصيل المقالات")}
                  </p>
                  <p className="ohTimelineMeta">
                    {text("Slug, category, organ, lab marker, difficulty, and safety note.", "Slug، تصنيف، عضو، مؤشر مختبر، مستوى صعوبة، وتنبيه سلامة.")}
                  </p>
                </div>
              </div>

              <div className="libraryRoadmapItem">
                <IconMark label="02" />
                <div>
                  <p className="ohTimelineTitle">
                    {text("Video education structure", "هيكل الفيديوهات التعليمية")}
                  </p>
                  <p className="ohTimelineMeta">
                    {text("Short educational videos grouped by organ, report type, and patient need.", "فيديوهات قصيرة مرتبة حسب العضو، نوع التقرير، واحتياج المريض.")}
                  </p>
                </div>
              </div>

              <div className="libraryRoadmapItem">
                <IconMark label="03" />
                <div>
                  <p className="ohTimelineTitle">
                    {text("AI recommendation readiness", "جاهزية توصيات AI")}
                  </p>
                  <p className="ohTimelineMeta">
                    {text("Later, AI can suggest education based on user reports and assessments.", "لاحقًا يمكن للذكاء الاصطناعي اقتراح محتوى بناءً على تقارير المستخدم وتقييماته.")}
                  </p>
                </div>
              </div>
            </div>
          </article>

          <article className="ohActionPanel">
            <p className="ohMetricLabel">
              {text("From learning to action", "من التعلم إلى الفعل")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Use education to prepare better health decisions.",
                "استخدم التثقيف لتحضير قرارات صحية أفضل."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "After learning the basics, users should move into assessment, report upload, intelligence generation, and doctor preparation.",
                "بعد فهم الأساسيات، يجب أن ينتقل المستخدم إلى التقييم، رفع التقرير، توليد الذكاء، والتحضير للطبيب."
              )}
            </p>

            <div className="ohButtonRow">
              <Link href="/assessment" className="primaryBtn">
                {text("Start Assessment", "ابدأ التقييم")}
              </Link>

              <Link href="/lab-upload" className="secondaryBtn">
                {text("Upload Report", "رفع تقرير")}
              </Link>

              <Link href="/assistant" className="secondaryBtn">
                {text("Ask Assistant", "اسأل المساعد")}
              </Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
