"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Language = "en" | "ar";

type VideoTrack = {
  code: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  examples: string[];
  examplesAr: string[];
};

const videoTracks: VideoTrack[] = [
  {
    code: "LAB",
    title: "Lab Marker Explainers",
    titleAr: "شرح مؤشرات المختبر",
    description:
      "Short videos that explain common lab markers in simple patient-friendly language.",
    descriptionAr:
      "فيديوهات قصيرة تشرح مؤشرات المختبر الشائعة بلغة بسيطة للمريض.",
    examples: ["LDL vs HDL", "HbA1c basics", "Creatinine and eGFR", "ALT and AST"],
    examplesAr: ["LDL و HDL", "أساسيات HbA1c", "الكرياتينين و eGFR", "ALT و AST"],
  },
  {
    code: "REP",
    title: "Medical Report Literacy",
    titleAr: "فهم التقارير الطبية",
    description:
      "Visual explainers that help users understand report sections, abnormal flags, and reference ranges.",
    descriptionAr:
      "شرح بصري يساعد المستخدم على فهم أقسام التقرير والعلامات غير الطبيعية والقيم المرجعية.",
    examples: ["Reference ranges", "Abnormal flags", "Trends over time", "Doctor questions"],
    examplesAr: ["القيم المرجعية", "العلامات غير الطبيعية", "الاتجاهات مع الوقت", "أسئلة الطبيب"],
  },
  {
    code: "ORG",
    title: "Organ Health Basics",
    titleAr: "أساسيات صحة الأعضاء",
    description:
      "Simple organ-focused videos that connect symptoms, habits, reports, and prevention.",
    descriptionAr:
      "فيديوهات مبسطة حسب العضو تربط الأعراض والعادات والتقارير والوقاية.",
    examples: ["Heart health", "Kidney health", "Liver health", "Brain health"],
    examplesAr: ["صحة القلب", "صحة الكلى", "صحة الكبد", "صحة الدماغ"],
  },
  {
    code: "VIS",
    title: "Doctor Visit Preparation",
    titleAr: "التحضير لزيارة الطبيب",
    description:
      "Videos that teach users how to prepare focused concerns, questions, and report summaries.",
    descriptionAr:
      "فيديوهات تساعد المستخدم على تجهيز المخاوف والأسئلة وملخصات التقارير قبل زيارة الطبيب.",
    examples: ["Prepare questions", "Organize symptoms", "Medication list", "Follow-up plan"],
    examplesAr: ["تحضير الأسئلة", "تنظيم الأعراض", "قائمة الأدوية", "خطة المتابعة"],
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
    <span className="videoCodeMark" aria-hidden="true">
      {label}
    </span>
  );
}

export default function VideoEducationPage() {
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
      className="ohPageShell videoRoadmapPage"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <style>{`
        .videoRoadmapPage a {
          color: inherit;
          text-decoration: none;
        }

        .videoRoadmapPage .videoTrackGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .videoRoadmapPage .videoTrackCard {
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-height: 100%;
        }

        .videoRoadmapPage .videoCodeMark {
          display: inline-flex;
          width: 52px;
          height: 52px;
          align-items: center;
          justify-content: center;
          border-radius: 17px;
          background: linear-gradient(135deg, rgba(20, 184, 166, 0.14), rgba(37, 99, 235, 0.1));
          border: 1px solid rgba(20, 184, 166, 0.22);
          color: var(--oh-primary);
          font-weight: 900;
          font-size: 0.78rem;
          letter-spacing: 0.04em;
        }

        .videoRoadmapPage .videoExampleRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: auto;
          padding-top: 8px;
        }

        .videoRoadmapPage .videoExampleChip {
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.72);
          color: var(--oh-muted);
          font-size: 0.82rem;
          font-weight: 800;
        }

        .videoRoadmapPage .videoPreviewFrame {
          position: relative;
          overflow: hidden;
          min-height: 240px;
          border-radius: 26px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background:
            radial-gradient(circle at 20% 22%, rgba(20, 184, 166, 0.16), transparent 28%),
            radial-gradient(circle at 82% 26%, rgba(37, 99, 235, 0.13), transparent 30%),
            linear-gradient(135deg, rgba(255,255,255,0.96), rgba(240,253,250,0.9));
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
          padding: 20px;
        }

        .videoRoadmapPage .videoPlayCircle {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 96px;
          height: 96px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(20, 184, 166, 0.24);
          box-shadow: 0 22px 60px rgba(15, 23, 42, 0.12);
        }

        .videoRoadmapPage .videoPlayCircle span {
          width: 0;
          height: 0;
          margin-left: 6px;
          border-top: 16px solid transparent;
          border-bottom: 16px solid transparent;
          border-left: 24px solid var(--oh-primary);
        }

        .videoRoadmapPage .videoFloatingLabel {
          position: absolute;
          padding: 10px 12px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(148, 163, 184, 0.18);
          color: var(--oh-text);
          font-weight: 900;
          font-size: 0.86rem;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08);
        }

        .videoRoadmapPage .videoFloatingLabel.one {
          left: 18px;
          top: 18px;
        }

        .videoRoadmapPage .videoFloatingLabel.two {
          right: 18px;
          bottom: 18px;
        }

        @media (max-width: 760px) {
          .videoRoadmapPage .videoTrackGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("OrganHeal Video Education", "التثقيف بالفيديو من OrganHeal")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "A future video layer for simple health understanding.",
                  "طبقة فيديو مستقبلية لفهم صحي أبسط."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "This page defines the video education direction before production starts: short, safe, patient-friendly explainers connected to articles, lab markers, reports, and doctor preparation.",
                  "هذه الصفحة تحدد اتجاه التثقيف بالفيديو قبل بدء الإنتاج: شروحات قصيرة وآمنة ومبسطة للمريض ومرتبطة بالمقالات ومؤشرات المختبر والتقارير والتحضير للطبيب."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/library" className="primaryBtn">
                  {text("Back to Education Library", "العودة إلى مكتبة التثقيف")}
                </Link>

                <Link href="/blog" className="secondaryBtn">
                  {text("Open Articles", "فتح المقالات")}
                </Link>
              </div>
            </div>

            <aside className="videoPreviewFrame" aria-hidden="true">
              <span className="videoFloatingLabel one">
                {text("Lab marker video", "فيديو مؤشر مختبر")}
              </span>

              <div className="videoPlayCircle">
                <span />
              </div>

              <span className="videoFloatingLabel two">
                {text("Doctor questions", "أسئلة للطبيب")}
              </span>
            </aside>
          </div>
        </section>

        <section className="ohMetricGrid">
          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Video tracks", "مسارات الفيديو")}
            </span>
            <span className="ohMetricValue">{videoTracks.length}</span>
            <span className="ohMetricHint">
              {text("Planned education areas", "مجالات تثقيف مخططة")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Current status", "الحالة الحالية")}
            </span>
            <span className="ohMetricValue">0</span>
            <span className="ohMetricHint">
              {text("Published videos yet", "فيديوهات منشورة حاليًا")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Publishing rule", "قاعدة النشر")}
            </span>
            <span className="ohMetricValue">Safe</span>
            <span className="ohMetricHint">
              {text("Education only, no diagnosis", "تثقيف فقط بدون تشخيص")}
            </span>
          </article>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Planned video tracks", "مسارات الفيديو المخططة")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Every video should have a clear educational job.",
                  "كل فيديو يجب أن يكون له هدف تثقيفي واضح."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "The video layer should make health topics easier to understand without replacing articles, reports, or clinician care.",
                  "طبقة الفيديو يجب أن تجعل المواضيع الصحية أسهل للفهم دون استبدال المقالات أو التقارير أو الرعاية الطبية."
                )}
              </p>
            </div>
          </div>

          <div className="videoTrackGrid">
            {videoTracks.map((track) => (
              <article className="ohCard videoTrackCard" key={track.code}>
                <CodeMark label={track.code} />

                <div>
                  <p className="ohMetricLabel">
                    {text("Video track", "مسار فيديو")}
                  </p>

                  <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                    {isArabic ? track.titleAr : track.title}
                  </h3>
                </div>

                <p className="ohCardText">
                  {isArabic ? track.descriptionAr : track.description}
                </p>

                <div className="videoExampleRow">
                  {(isArabic ? track.examplesAr : track.examples).map((item) => (
                    <span className="videoExampleChip" key={`${track.code}-${item}`}>
                      {item}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ohTrustNotice">
          <span aria-hidden="true">OH</span>
          <div>
            <strong>
              {text("Video safety standard", "معيار السلامة للفيديو")}
            </strong>
            <br />
            {text(
              "OrganHeal videos should explain health topics for education and preparation only. Urgent symptoms, diagnosis, and treatment decisions must remain with licensed medical professionals.",
              "فيديوهات OrganHeal يجب أن تشرح المواضيع الصحية للتثقيف والتحضير فقط. الأعراض العاجلة والتشخيص وقرارات العلاج تبقى من مسؤولية المختصين الطبيين المرخصين."
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
