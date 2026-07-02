"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { blogPosts } from "@/lib/blogData";

type Language = "en" | "ar";
type BlogPost = (typeof blogPosts)[number];

type LearningRoute = {
  code: string;
  title: string;
  titleAr: string;
  promise: string;
  promiseAr: string;
  examples: string[];
  examplesAr: string[];
};

const learningRoutes: LearningRoute[] = [
  {
    code: "LAB",
    title: "Understand Lab Markers",
    titleAr: "افهم مؤشرات المختبر",
    promise:
      "Learn what common values may mean and what questions they raise for your clinician.",
    promiseAr:
      "تعلّم ما قد تعنيه القيم الشائعة وما الأسئلة التي يمكن أن تطرحها على الطبيب.",
    examples: ["LDL / HDL", "HbA1c", "Creatinine", "eGFR"],
    examplesAr: ["LDL / HDL", "HbA1c", "الكرياتينين", "eGFR"],
  },
  {
    code: "ORG",
    title: "Learn by Body System",
    titleAr: "تعلّم حسب أجهزة الجسم",
    promise:
      "Explore heart, kidney, liver, brain, and metabolic health through clear articles.",
    promiseAr:
      "استكشف صحة القلب والكلى والكبد والدماغ والصحة الأيضية من خلال مقالات واضحة.",
    examples: ["Heart", "Kidney", "Liver", "Brain"],
    examplesAr: ["القلب", "الكلى", "الكبد", "الدماغ"],
  },
  {
    code: "REP",
    title: "Read Reports Better",
    titleAr: "اقرأ التقارير بشكل أفضل",
    promise:
      "Build confidence with report language, reference ranges, abnormal flags, and trends.",
    promiseAr:
      "ابنِ ثقة أكبر في فهم لغة التقارير والقيم المرجعية والعلامات والاتجاهات.",
    examples: ["Ranges", "Flags", "Trends", "Summary"],
    examplesAr: ["القيم", "العلامات", "الاتجاهات", "الملخص"],
  },
  {
    code: "VIS",
    title: "Prepare for Doctor Visits",
    titleAr: "حضّر زيارة الطبيب",
    promise:
      "Use learning content to organize concerns and prepare better questions.",
    promiseAr:
      "استخدم المحتوى التعليمي لتنظيم مخاوفك وتحضير أسئلة أفضل.",
    examples: ["Questions", "Symptoms", "Medication list", "Follow-up"],
    examplesAr: ["الأسئلة", "الأعراض", "الأدوية", "المتابعة"],
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

function RouteCode({ label }: { label: string }) {
  return (
    <span className="learningRouteCode" aria-hidden="true">
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

  function getTitle(post: BlogPost) {
    return isArabic ? post.titleAr : post.title;
  }

  function getExcerpt(post: BlogPost) {
    return isArabic ? post.excerptAr : post.excerpt;
  }

  function getCategory(post: BlogPost) {
    return isArabic ? post.categoryAr : post.category;
  }

  function getReadTime(post: BlogPost) {
    return isArabic ? post.readTimeAr : post.readTime;
  }

  const featuredArticles = useMemo(() => {
    return blogPosts.slice(0, 3);
  }, []);

  const categoryCount = useMemo(() => {
    const categories = new Set(blogPosts.map((post) => post.category));
    return categories.size;
  }, []);

  const markerCount = useMemo(() => {
    const markers = new Set(blogPosts.flatMap((post) => post.labMarkers));
    return markers.size;
  }, []);

  const primaryMarkers = useMemo(() => {
    return Array.from(new Set(blogPosts.flatMap((post) => post.labMarkers))).slice(0, 8);
  }, []);

  return (
    <main
      className="ohPageShell healthLearningHubPage"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <style>{`
        .healthLearningHubPage,
        .healthLearningHubPage * {
          box-sizing: border-box;
        }

        .healthLearningHubPage a {
          color: inherit;
          text-decoration: none;
        }

        .healthLearningHubPage .learningHero {
          position: relative;
          overflow: hidden;
          padding: 38px;
        }

        .healthLearningHubPage .learningHero::before {
          content: "";
          position: absolute;
          inset: -120px auto auto -120px;
          width: 320px;
          height: 320px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(20, 184, 166, 0.18), transparent 68%);
          pointer-events: none;
        }

        [dir="rtl"] .healthLearningHubPage .learningHero::before {
          inset: -120px -120px auto auto;
        }

        .healthLearningHubPage .learningHero .ohHeroGrid {
          position: relative;
          z-index: 1;
          grid-template-columns: minmax(0, 1.05fr) minmax(330px, 0.78fr);
          align-items: center;
        }

        .healthLearningHubPage .learningHero .ohTitle {
          max-width: 820px;
          font-size: clamp(2.35rem, 4.4vw, 4.35rem);
          line-height: 0.98;
        }

        .healthLearningHubPage .learningHero .ohLead {
          max-width: 760px;
        }

        .healthLearningHubPage .hubFinderCard {
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(15, 118, 110, 0.92));
          color: white;
          padding: 24px;
          box-shadow: 0 24px 64px rgba(15, 23, 42, 0.14);
        }

        .healthLearningHubPage .hubFinderCard::after {
          content: "";
          position: absolute;
          width: 230px;
          height: 230px;
          right: -82px;
          bottom: -96px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(20, 184, 166, 0.48), transparent 66%);
          pointer-events: none;
        }

        [dir="rtl"] .healthLearningHubPage .hubFinderCard::after {
          right: auto;
          left: -82px;
        }

        .healthLearningHubPage .hubFinderCard * {
          position: relative;
          z-index: 1;
        }

        .healthLearningHubPage .hubFinderLabel {
          margin: 0;
          color: rgba(209, 250, 229, 0.9);
          font-size: 0.78rem;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .healthLearningHubPage .hubFinderTitle {
          margin: 10px 0 0;
          color: white;
          font-size: 1.55rem;
          font-weight: 950;
          letter-spacing: -0.045em;
          line-height: 1.08;
        }

        .healthLearningHubPage .hubFinderText {
          margin: 14px 0 0;
          color: rgba(226, 232, 240, 0.9);
          line-height: 1.7;
          font-weight: 650;
        }

        .healthLearningHubPage .hubFinderStats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 18px;
        }

        .healthLearningHubPage .hubFinderStat {
          padding: 12px;
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.09);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .healthLearningHubPage .hubFinderStat strong {
          display: block;
          color: white;
          font-size: 1.6rem;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.06em;
        }

        .healthLearningHubPage .hubFinderStat span {
          display: block;
          margin-top: 6px;
          color: rgba(226, 232, 240, 0.82);
          font-size: 0.78rem;
          font-weight: 850;
        }

        .healthLearningHubPage .featuredSection {
          border-radius: 30px;
          border: 1px solid rgba(15, 118, 110, 0.18);
          background:
            radial-gradient(circle at 12% 22%, rgba(20, 184, 166, 0.14), transparent 28%),
            linear-gradient(135deg, rgba(240, 253, 250, 0.96), rgba(255, 255, 255, 0.96));
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
          padding: 24px;
        }

        .healthLearningHubPage .featuredHeader {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .healthLearningHubPage .featuredTitle {
          margin: 0;
          color: var(--oh-text);
          font-size: 1.45rem;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .healthLearningHubPage .featuredText {
          margin: 8px 0 0;
          color: var(--oh-muted);
          line-height: 1.7;
        }

        .healthLearningHubPage .featuredGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .healthLearningHubPage .featuredCard {
          display: flex;
          flex-direction: column;
          gap: 13px;
          min-height: 100%;
          border-top: 5px solid #14b8a6;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .healthLearningHubPage .featuredCard:hover {
          transform: translateY(-4px);
          border-color: rgba(20, 184, 166, 0.48);
          box-shadow: 0 22px 48px rgba(15, 23, 42, 0.1);
        }

        .healthLearningHubPage .featuredCategory {
          width: fit-content;
          margin: 0;
          padding: 8px 11px;
          border-radius: 999px;
          background: rgba(15, 118, 110, 0.12);
          color: #0f766e;
          font-size: 0.76rem;
          font-weight: 950;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .healthLearningHubPage .featuredFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: auto;
          padding-top: 13px;
          border-top: 1px solid rgba(148, 163, 184, 0.2);
        }

        .healthLearningHubPage .featuredRead {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          padding: 0 14px;
          border-radius: 999px;
          background: #0f766e;
          color: white;
          font-size: 0.9rem;
          font-weight: 950;
          box-shadow: 0 12px 24px rgba(15, 118, 110, 0.16);
        }

        .healthLearningHubPage .routeGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .healthLearningHubPage .routeCard {
          display: flex;
          flex-direction: column;
          gap: 13px;
          min-height: 100%;
          border-top: 5px solid rgba(37, 99, 235, 0.72);
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .healthLearningHubPage .routeCard:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
        }

        .healthLearningHubPage .learningRouteCode {
          display: inline-flex;
          width: 50px;
          height: 50px;
          align-items: center;
          justify-content: center;
          border-radius: 17px;
          background: linear-gradient(135deg, rgba(20, 184, 166, 0.14), rgba(37, 99, 235, 0.1));
          border: 1px solid rgba(20, 184, 166, 0.22);
          color: var(--oh-primary);
          font-weight: 950;
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
          background: rgba(255, 255, 255, 0.78);
          color: var(--oh-muted);
          font-size: 0.82rem;
          font-weight: 850;
        }

        .healthLearningHubPage .markerIndexPanel {
          display: grid;
          grid-template-columns: minmax(0, 0.65fr) minmax(0, 1fr);
          gap: 18px;
          align-items: center;
          border-radius: 28px;
          padding: 24px;
          background: linear-gradient(135deg, rgba(239, 246, 255, 0.9), rgba(240, 253, 250, 0.94));
          border: 1px solid rgba(37, 99, 235, 0.14);
        }

        .healthLearningHubPage .markerCloud {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .healthLearningHubPage .markerChip {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 8px 11px;
          border-radius: 999px;
          background: white;
          border: 1px solid rgba(15, 118, 110, 0.18);
          color: #0f766e;
          font-size: 0.84rem;
          font-weight: 900;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
        }

        .healthLearningHubPage .hubSafetyStrip {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 20px;
          border: 1px solid rgba(37, 99, 235, 0.16);
          border-inline-start: 5px solid #2563eb;
          background: rgba(239, 246, 255, 0.78);
          color: var(--oh-muted);
          line-height: 1.65;
        }

        .healthLearningHubPage .hubSafetyStrip strong {
          color: var(--oh-text);
        }

        .healthLearningHubPage .hubSafetyMark {
          display: inline-flex;
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.12);
          color: #1d4ed8;
          font-weight: 950;
        }

        @media (max-width: 1100px) {
          .healthLearningHubPage .routeGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .healthLearningHubPage .markerIndexPanel {
            grid-template-columns: 1fr;
          }
        }


        .healthLearningHubPage .learningIntentGrid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
        }

        .healthLearningHubPage .learningIntentCard {
          padding: 20px;
          border-radius: 24px;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.14);
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.10);
        }

        .healthLearningHubPage .learningIntentCode {
          display: inline-flex;
          margin-bottom: 14px;
          width: 42px;
          height: 42px;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          background: #0f766e;
          color: #ffffff;
          font-weight: 950;
        }

        .healthLearningHubPage .learningIntentTitle {
          margin: 0;
          color: #0f172a;
          font-size: 1rem;
          font-weight: 950;
          line-height: 1.25;
        }

        .healthLearningHubPage .learningIntentText {
          margin: 10px 0 0;
          color: #475569;
          font-size: 0.9rem;
          font-weight: 750;
          line-height: 1.6;
        }

        @media (max-width: 1100px) {
          .healthLearningHubPage .learningIntentGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .healthLearningHubPage .learningIntentGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 980px) {
          .healthLearningHubPage .learningHero .ohHeroGrid {
            grid-template-columns: 1fr;
          }

          .healthLearningHubPage .featuredGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .healthLearningHubPage .learningHero {
            padding: 28px;
          }

          .healthLearningHubPage .learningHero .ohTitle {
            font-size: clamp(2.1rem, 11vw, 3rem);
          }

          .healthLearningHubPage .hubFinderStats,
          .healthLearningHubPage .routeGrid {
            grid-template-columns: 1fr;
          }

          .healthLearningHubPage .featuredHeader {
            align-items: flex-start;
            flex-direction: column;
          }

          .healthLearningHubPage .featuredFooter {
            align-items: flex-start;
            flex-direction: column;
          }

          .healthLearningHubPage .featuredRead {
            width: 100%;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero learningHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Health Learning Hub", "مركز التعلّم الصحي")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Learn about your health, one clear topic at a time.",
                  "اعثر على محتوى صحي حسب الموضوع أو المؤشر أو التقرير."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "OrganHeal helps you understand lab markers, organs, reports, and next steps through short, focused learning modules.",
                  "يساعدك OrganHeal على فهم مؤشرات المختبر، الأعضاء، التقارير، والخطوات التالية من خلال وحدات تعليمية قصيرة وواضحة."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/blog" className="primaryBtn">
                  {text("Find Learning Modules", "ابحث عن وحدات تعليمية")}
                </Link>

                <a href="#featured-guides" className="secondaryBtn">
                  {text("Browse Featured Guides", "تصفح الأدلة المختارة")}
                </a>
              </div>
            </div>

            <aside className="hubFinderCard">
              <p className="hubFinderLabel">
                {text("What you can do here", "ماذا يمكنك أن تفعل هنا")}
              </p>

              <h2 className="hubFinderTitle">
                {text(
                  "Search, choose a route, then read the right guide.",
                  "ابحث، اختر مسارك، ثم اقرأ الدليل المناسب."
                )}
              </h2>

              <p className="hubFinderText">
                {text(
                  "This hub leads to live health articles. It keeps learning focused without sending you into unrelated tools.",
                  "هذا المركز يقودك إلى مقالات صحية متاحة. يبقي التعلّم مركزًا بدون نقلك إلى أدوات غير مرتبطة."
                )}
              </p>

              <div className="hubFinderStats">
                <div className="hubFinderStat">
                  <strong>{blogPosts.length}</strong>
                  <span>{text("Articles", "مقالات")}</span>
                </div>

                <div className="hubFinderStat">
                  <strong>{categoryCount}</strong>
                  <span>{text("Health areas", "مجالات")}</span>
                </div>

                <div className="hubFinderStat">
                  <strong>{markerCount}</strong>
                  <span>{text("Markers", "مؤشرات")}</span>
                </div>
              </div>
            </aside>
          </div>
        </section>


        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Learning paths", "مسارات التعلّم")}
              </p>

              <h2 className="ohCardTitle">
                {text("What would you like to learn today?", "ماذا تريد أن تتعلم اليوم؟")}
              </h2>

              <p className="ohCardText">
                {text(
                  "Choose the easiest starting point. Each path will later connect to short learning modules based on your health context.",
                  "اختر نقطة البداية الأسهل. لاحقًا سيرتبط كل مسار بوحدات تعليمية قصيرة حسب سياقك الصحي."
                )}
              </p>
            </div>
          </div>

          <div className="learningIntentGrid">
            <article className="learningIntentCard">
              <span className="learningIntentCode">01</span>
              <h3 className="learningIntentTitle">{text("Understand a Lab Result", "فهم نتيجة مختبر")}</h3>
              <p className="learningIntentText">{text("LDL, HbA1c, Vitamin D, kidney and liver markers.", "LDL، HbA1c، فيتامين D، ومؤشرات الكلى والكبد.")}</p>
            </article>

            <article className="learningIntentCard">
              <span className="learningIntentCode">02</span>
              <h3 className="learningIntentTitle">{text("Learn by Organ", "التعلّم حسب العضو")}</h3>
              <p className="learningIntentText">{text("Heart, kidney, liver, lung, brain, and metabolic health.", "القلب، الكلى، الكبد، الرئة، الدماغ، والصحة الأيضية.")}</p>
            </article>

            <article className="learningIntentCard">
              <span className="learningIntentCode">03</span>
              <h3 className="learningIntentTitle">{text("Understand My Report", "فهم تقريري")}</h3>
              <p className="learningIntentText">{text("A future path for learning from uploaded reports.", "مسار لاحق للتعلّم من التقارير المرفوعة.")}</p>
            </article>

            <article className="learningIntentCard">
              <span className="learningIntentCode">04</span>
              <h3 className="learningIntentTitle">{text("Prepare for My Doctor", "التحضير للطبيب")}</h3>
              <p className="learningIntentText">{text("Questions, follow-up points, and what to bring.", "أسئلة، نقاط متابعة، وما يجب إحضاره.")}</p>
            </article>

            <article className="learningIntentCard">
              <span className="learningIntentCode">05</span>
              <h3 className="learningIntentTitle">{text("Improve My Lifestyle", "تحسين نمط الحياة")}</h3>
              <p className="learningIntentText">{text("Food, exercise, sleep, and simple daily actions.", "الغذاء، الرياضة، النوم، وخطوات يومية بسيطة.")}</p>
            </article>
          </div>
        </section>

        <section id="featured-guides" className="featuredSection">
          <div className="featuredHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Featured health guides", "أدلة صحية مختارة")}
              </p>

              <h2 className="featuredTitle">
                {text(
                  "Start with articles most users look for first.",
                  "ابدأ بالمقالات التي يبحث عنها معظم المستخدمين أولًا."
                )}
              </h2>

              <p className="featuredText">
                {text(
                  "These guides are available now and lead directly to readable health education.",
                  "هذه الأدلة متاحة الآن وتقود مباشرة إلى محتوى صحي قابل للقراءة."
                )}
              </p>
            </div>

            <Link href="/blog" className="primaryBtn">
              {text("Open Full Article Finder", "ابحث عن وحدات تعليمية الكامل")}
            </Link>
          </div>

          <div className="featuredGrid">
            {featuredArticles.map((post) => (
              <article className="ohCard featuredCard" key={post.slug}>
                <p className="featuredCategory">{getCategory(post)}</p>

                <h3 className="ohCardTitle" style={{ fontSize: "1.16rem" }}>
                  {getTitle(post)}
                </h3>

                <p className="ohCardText">
                  {getExcerpt(post)}
                </p>

                <div className="featuredFooter">
                  <span className="ohStatusBadge neutral">
                    {getReadTime(post)}
                  </span>

                  <Link href={`/blog/${post.slug}`} className="featuredRead">
                    {text("Read Guide", "قراءة الدليل")}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Choose your learning route", "اختر مسار التعلّم")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Different health questions need different learning paths.",
                  "الأسئلة الصحية المختلفة تحتاج مسارات تعلّم مختلفة."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Use these routes to decide where to begin, then open the article finder to search the full collection.",
                  "استخدم هذه المسارات لتحديد نقطة البداية، ثم اابحث عن وحدات تعليمية للبحث في المجموعة كاملة."
                )}
              </p>
            </div>
          </div>

          <div className="routeGrid">
            {learningRoutes.map((route) => (
              <article className="ohCard routeCard" key={route.code}>
                <RouteCode label={route.code} />

                <div>
                  <p className="ohMetricLabel">
                    {text("Learning route", "مسار تعلّم")}
                  </p>

                  <h3 className="ohCardTitle" style={{ fontSize: "1.12rem" }}>
                    {isArabic ? route.titleAr : route.title}
                  </h3>
                </div>

                <p className="ohCardText">
                  {isArabic ? route.promiseAr : route.promise}
                </p>

                <div className="topicRow">
                  {(isArabic ? route.examplesAr : route.examples).map((item) => (
                    <span className="topicChip" key={`${route.code}-${item}`}>
                      {item}
                    </span>
                  ))}
                </div>

                <Link href="/blog" className="secondaryBtn" style={{ justifyContent: "center" }}>
                  {text("Find Articles", "البحث عن مقالات")}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="markerIndexPanel">
          <div>
            <p className="ohMetricLabel">
              {text("Marker-based learning", "تعلّم حسب المؤشر")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Common lab markers are indexed for faster learning.",
                "مؤشرات المختبر الشائعة مفهرسة لتعلّم أسرع."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "Open the article finder and search directly by marker name, organ system, or health topic.",
                "اابحث عن وحدات تعليمية وابحث مباشرة باسم المؤشر أو العضو أو الموضوع الصحي."
              )}
            </p>

            <div className="ohButtonRow" style={{ marginTop: "18px" }}>
              <Link href="/blog" className="primaryBtn">
                {text("Search Articles", "البحث في المقالات")}
              </Link>
            </div>
          </div>

          <div className="markerCloud">
            {primaryMarkers.map((marker) => (
              <span className="markerChip" key={marker}>
                {marker}
              </span>
            ))}
          </div>
        </section>

        <section className="hubSafetyStrip">
          <span className="hubSafetyMark">OH</span>

          <div>
            <strong>
              {text("Learning content supports preparation, not diagnosis.", "المحتوى التعليمي يدعم التحضير، وليس التشخيص.")}
            </strong>
            <br />
            {text(
              "OrganHeal explains health information for learning and preparation only. Urgent symptoms, diagnosis, prescriptions, and treatment decisions must remain with licensed medical professionals.",
              "OrganHeal يشرح المعلومات الصحية للتعلّم والتحضير فقط. الأعراض العاجلة والتشخيص والوصفات وقرارات العلاج تبقى من مسؤولية المختصين الطبيين المرخصين."
            )}
          </div>
        </section>
      </div>
    </main>
  );
}


