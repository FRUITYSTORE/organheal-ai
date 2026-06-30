"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Language = "en" | "ar";

type VideoSeries = {
  code: string;
  title: string;
  titleAr: string;
  format: string;
  formatAr: string;
  description: string;
  descriptionAr: string;
  episodes: string[];
  episodesAr: string[];
};

const videoSeries: VideoSeries[] = [
  {
    code: "M01",
    title: "Marker Minutes",
    titleAr: "دقائق المؤشرات",
    format: "60–90 second explainers",
    formatAr: "شرح قصير من 60 إلى 90 ثانية",
    description:
      "Fast visual explanations for common lab markers, designed to help users understand the meaning before reading deeper articles.",
    descriptionAr:
      "شرح بصري سريع لمؤشرات المختبر الشائعة، يساعد المستخدم على فهم المعنى قبل قراءة التفاصيل.",
    episodes: ["LDL vs HDL", "HbA1c basics", "Creatinine and eGFR", "ALT and AST"],
    episodesAr: ["LDL و HDL", "أساسيات HbA1c", "الكرياتينين و eGFR", "ALT و AST"],
  },
  {
    code: "R02",
    title: "Report Walkthroughs",
    titleAr: "شرح التقارير خطوة بخطوة",
    format: "Guided report reading",
    formatAr: "قراءة موجهة للتقرير",
    description:
      "Screen-style videos that teach users how to read reference ranges, abnormal flags, summaries, and trend notes.",
    descriptionAr:
      "فيديوهات بأسلوب شرح الشاشة تساعد المستخدم على قراءة القيم المرجعية والعلامات والملخصات والاتجاهات.",
    episodes: ["Reference ranges", "Abnormal flags", "Trend language", "Questions to prepare"],
    episodesAr: ["القيم المرجعية", "العلامات غير الطبيعية", "لغة الاتجاهات", "أسئلة للتحضير"],
  },
  {
    code: "V03",
    title: "Visit Prep Clips",
    titleAr: "مقاطع التحضير للزيارة",
    format: "Doctor-visit preparation",
    formatAr: "تحضير لزيارة الطبيب",
    description:
      "Short preparation clips that help users organize symptoms, concerns, medications, and focused questions.",
    descriptionAr:
      "مقاطع قصيرة تساعد المستخدم على تنظيم الأعراض والمخاوف والأدوية والأسئلة المركزة.",
    episodes: ["Before appointment", "Symptom timeline", "Medication list", "Follow-up questions"],
    episodesAr: ["قبل الموعد", "تسلسل الأعراض", "قائمة الأدوية", "أسئلة المتابعة"],
  },
  {
    code: "P04",
    title: "Prevention Briefs",
    titleAr: "موجزات الوقاية",
    format: "Lifestyle and safety education",
    formatAr: "تثقيف حول نمط الحياة والسلامة",
    description:
      "Simple preventive education clips about sleep, movement, hydration, nutrition, and when symptoms need urgent care.",
    descriptionAr:
      "مقاطع تثقيفية مبسطة عن النوم والحركة وشرب الماء والتغذية ومتى تحتاج الأعراض إلى رعاية عاجلة.",
    episodes: ["Sleep basics", "Movement habits", "Hydration cues", "Urgent warning signs"],
    episodesAr: ["أساسيات النوم", "عادات الحركة", "إشارات الترطيب", "علامات تستدعي الرعاية"],
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

function SeriesCode({ label }: { label: string }) {
  return (
    <span className="videoSeriesCode" aria-hidden="true">
      {label}
    </span>
  );
}

export default function VideoGuidesPage() {
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
      className="ohPageShell videoGuidesPage"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <style>{`
        .videoGuidesPage a {
          color: inherit;
          text-decoration: none;
        }

        .videoGuidesPage,
        .videoGuidesPage * {
          box-sizing: border-box;
        }

        .videoGuidesPage .videoStudioStage {
          position: relative;
          min-height: 420px;
          overflow: hidden;
          border-radius: 32px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background:
            radial-gradient(circle at 18% 18%, rgba(20, 184, 166, 0.18), transparent 28%),
            radial-gradient(circle at 82% 20%, rgba(37, 99, 235, 0.16), transparent 32%),
            linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(240, 253, 250, 0.92));
          box-shadow: 0 28px 90px rgba(15, 23, 42, 0.1);
          padding: 22px;
        }

        .videoGuidesPage .videoPlayerMock {
          position: absolute;
          inset: 72px 34px 92px 34px;
          border-radius: 26px;
          overflow: hidden;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(15, 118, 110, 0.86)),
            radial-gradient(circle at 70% 30%, rgba(20, 184, 166, 0.35), transparent 32%);
          box-shadow: 0 28px 70px rgba(15, 23, 42, 0.2);
        }

        .videoGuidesPage .videoPlayerMock::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.16), transparent);
          transform: translateX(-100%);
          animation: videoScan 4.8s ease-in-out infinite;
        }

        .videoGuidesPage .videoPlayButton {
          position: absolute;
          left: 50%;
          top: 48%;
          transform: translate(-50%, -50%);
          width: 96px;
          height: 96px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(20, 184, 166, 0.28);
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
          animation: videoPulse 3s ease-in-out infinite;
        }

        .videoGuidesPage .videoPlayButton span {
          width: 0;
          height: 0;
          margin-left: 7px;
          border-top: 16px solid transparent;
          border-bottom: 16px solid transparent;
          border-left: 25px solid var(--oh-primary);
        }

        [dir="rtl"] .videoGuidesPage .videoPlayButton span {
          margin-left: 0;
          margin-right: 7px;
          border-left: 0;
          border-right: 25px solid var(--oh-primary);
        }

        .videoGuidesPage .videoTimeline {
          position: absolute;
          left: 26px;
          right: 26px;
          bottom: 22px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.24);
          overflow: hidden;
        }

        .videoGuidesPage .videoTimeline span {
          display: block;
          height: 100%;
          width: 62%;
          border-radius: inherit;
          background: linear-gradient(90deg, #14b8a6, #60a5fa);
          animation: videoProgress 5s ease-in-out infinite;
        }

        .videoGuidesPage .videoCaption {
          position: absolute;
          left: 24px;
          bottom: 48px;
          right: 24px;
          padding: 12px 14px;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.62);
          color: #ffffff;
          font-size: 0.9rem;
          font-weight: 850;
          backdrop-filter: blur(12px);
        }

        .videoGuidesPage .videoFloatingTag {
          position: absolute;
          z-index: 2;
          padding: 11px 13px;
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: var(--oh-text);
          font-weight: 900;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.1);
          backdrop-filter: blur(14px);
        }

        .videoGuidesPage .videoFloatingTag.one {
          left: 18px;
          top: 18px;
          animation: videoFloatOne 5s ease-in-out infinite;
        }

        .videoGuidesPage .videoFloatingTag.two {
          right: 18px;
          top: 42px;
          animation: videoFloatTwo 5.4s ease-in-out infinite;
        }

        .videoGuidesPage .videoFloatingTag.three {
          left: 34px;
          bottom: 22px;
          animation: videoFloatThree 5.8s ease-in-out infinite;
        }

        .videoGuidesPage .videoSeriesGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .videoGuidesPage .videoSeriesCard {
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-height: 100%;
        }

        .videoGuidesPage .videoSeriesCode {
          display: inline-flex;
          width: 54px;
          height: 54px;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(20, 184, 166, 0.14), rgba(37, 99, 235, 0.1));
          border: 1px solid rgba(20, 184, 166, 0.22);
          color: var(--oh-primary);
          font-weight: 900;
          font-size: 0.78rem;
          letter-spacing: 0.04em;
        }

        .videoGuidesPage .episodeRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: auto;
          padding-top: 8px;
        }

        .videoGuidesPage .episodeChip {
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.72);
          color: var(--oh-muted);
          font-size: 0.82rem;
          font-weight: 800;
        }

        .videoGuidesPage .productionGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        @keyframes videoScan {
          0%, 35% {
            transform: translateX(-120%);
          }
          65%, 100% {
            transform: translateX(120%);
          }
        }

        @keyframes videoPulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24), 0 0 0 0 rgba(20, 184, 166, 0.22);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.04);
            box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24), 0 0 0 18px rgba(20, 184, 166, 0);
          }
        }

        @keyframes videoProgress {
          0%, 100% {
            width: 42%;
          }
          50% {
            width: 78%;
          }
        }

        @keyframes videoFloatOne {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes videoFloatTwo {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(9px); }
        }

        @keyframes videoFloatThree {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .videoGuidesPage .videoPlayerMock::before,
          .videoGuidesPage .videoPlayButton,
          .videoGuidesPage .videoTimeline span,
          .videoGuidesPage .videoFloatingTag {
            animation: none;
          }
        }

        @media (max-width: 900px) {
          .videoGuidesPage .videoSeriesGrid,
          .videoGuidesPage .productionGrid {
            grid-template-columns: 1fr;
          }

          .videoGuidesPage .videoStudioStage {
            min-height: 380px;
          }
        }

        @media (max-width: 640px) {
          .videoGuidesPage .videoPlayerMock {
            inset: 92px 18px 96px 18px;
          }

          .videoGuidesPage .videoFloatingTag {
            font-size: 0.82rem;
          }

          .videoGuidesPage .videoFloatingTag.two {
            top: auto;
            bottom: 64px;
            right: 18px;
          }

          .videoGuidesPage .videoFloatingTag.three {
            display: none;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("OrganHeal Video Guides", "دليل OrganHeal بالفيديو")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Short visual guides for safer health understanding.",
                  "أدلة مرئية قصيرة لفهم صحي أكثر أمانًا."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "OrganHeal Video Guides are being prepared as concise, patient-friendly explainers for lab markers, medical reports, doctor visits, and prevention topics.",
                  "يتم تحضير دليل OrganHeal بالفيديو ليقدم شروحات قصيرة ومبسطة للمريض حول مؤشرات المختبر والتقارير الطبية وزيارات الطبيب والوقاية."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/library" className="primaryBtn">
                  {text("Back to Health Learning Hub", "العودة إلى مركز التعلّم الصحي")}
                </Link>
              </div>
            </div>

            <aside className="videoStudioStage" aria-label={text("Animated video guide preview", "معاينة متحركة للفيديو")}>
              <span className="videoFloatingTag one">
                {text("In production", "قيد التحضير")}
              </span>

              <span className="videoFloatingTag two">
                {text("Captions ready", "ترجمة توضيحية")}
              </span>

              <span className="videoFloatingTag three">
                {text("60–90 sec format", "صيغة 60–90 ثانية")}
              </span>

              <div className="videoPlayerMock">
                <div className="videoPlayButton">
                  <span />
                </div>

                <div className="videoCaption">
                  {text(
                    "Example caption: LDL and HDL are different signals, not one simple number.",
                    "مثال توضيحي: LDL و HDL مؤشرات مختلفة وليست رقمًا واحدًا بسيطًا."
                  )}
                </div>

                <div className="videoTimeline">
                  <span />
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="ohMetricGrid">
          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Publishing status", "حالة النشر")}
            </span>
            <span className="ohMetricValue">Soon</span>
            <span className="ohMetricHint">
              {text("Video guides are being prepared", "يتم تحضير أدلة الفيديو")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Guide series", "سلاسل الدليل")}
            </span>
            <span className="ohMetricValue">{videoSeries.length}</span>
            <span className="ohMetricHint">
              {text("Focused video formats", "صيغ فيديو مركزة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Clinical boundary", "الحد السريري")}
            </span>
            <span className="ohMetricValue">Edu</span>
            <span className="ohMetricHint">
              {text("Education only, no diagnosis", "تثقيف فقط بدون تشخيص")}
            </span>
          </article>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Video series", "سلاسل الفيديو")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Built as episodes, not repeated page sections.",
                  "مصممة كحلقات، وليست تكرارًا لعناوين الصفحات."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Each series has its own video format, episode style, and learning purpose. Articles may support the topic, but this section stays video-first.",
                  "كل سلسلة لها صيغة فيديو وأسلوب حلقات وهدف تعليمي خاص. يمكن للمقالات دعم الموضوع، لكن هذا القسم يبقى مخصصًا للفيديو أولًا."
                )}
              </p>
            </div>
          </div>

          <div className="videoSeriesGrid">
            {videoSeries.map((series) => (
              <article className="ohCard videoSeriesCard" key={series.code}>
                <div className="ohCardHeader" style={{ marginBottom: 0 }}>
                  <SeriesCode label={series.code} />
                  <span className="ohStatusBadge neutral">
                    {text("Queued", "قيد التحضير")}
                  </span>
                </div>

                <div>
                  <p className="ohMetricLabel">
                    {isArabic ? series.formatAr : series.format}
                  </p>

                  <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                    {isArabic ? series.titleAr : series.title}
                  </h3>
                </div>

                <p className="ohCardText">
                  {isArabic ? series.descriptionAr : series.description}
                </p>

                <div className="episodeRow">
                  {(isArabic ? series.episodesAr : series.episodes).map((episode) => (
                    <span className="episodeChip" key={`${series.code}-${episode}`}>
                      {episode}
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
                {text("Video production standard", "معيار إنتاج الفيديو")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Every guide must be short, captioned, safe, and clinically bounded.",
                  "كل دليل يجب أن يكون قصيرًا، مترجمًا، آمنًا، ومحددًا سريريًا."
                )}
              </h2>
            </div>
          </div>

          <div className="productionGrid">
            <article className="ohMetricCard">
              <span className="ohMetricLabel">
                {text("Episode length", "مدة الحلقة")}
              </span>
              <span className="ohMetricValue">60–90</span>
              <span className="ohMetricHint">
                {text("Seconds for quick understanding", "ثانية لفهم سريع")}
              </span>
            </article>

            <article className="ohMetricCard">
              <span className="ohMetricLabel">
                {text("Accessibility", "سهولة الوصول")}
              </span>
              <span className="ohMetricValue">CC</span>
              <span className="ohMetricHint">
                {text("Captions and plain language", "ترجمة ولغة مبسطة")}
              </span>
            </article>

            <article className="ohMetricCard">
              <span className="ohMetricLabel">
                {text("Safety rule", "قاعدة السلامة")}
              </span>
              <span className="ohMetricValue">No Dx</span>
              <span className="ohMetricHint">
                {text("No diagnosis or treatment claims", "بدون تشخيص أو ادعاءات علاجية")}
              </span>
            </article>
          </div>
        </section>

        <section className="ohTrustNotice">
          <span aria-hidden="true">OH</span>
          <div>
            <strong>
              {text("Video clinical boundary", "الحد السريري للفيديو")}
            </strong>
            <br />
            {text(
              "OrganHeal Video Guides are for education and preparation only. Urgent symptoms, diagnosis, prescriptions, and treatment decisions must remain with licensed medical professionals.",
              "دليل OrganHeal بالفيديو للتثقيف والتحضير فقط. الأعراض العاجلة والتشخيص والوصفات وقرارات العلاج تبقى من مسؤولية المختصين الطبيين المرخصين."
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
