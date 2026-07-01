"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Language = "en" | "ar";

function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";

  const saved =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("language") ||
    "";

  return saved.toLowerCase().startsWith("ar") ? "ar" : "en";
}

export default function AboutPage() {
  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

  function text(en: string, ar: string) {
    return isArabic ? ar : en;
  }

  useEffect(() => {
    function syncLanguage() {
      const current = getStoredLanguage();
      setLanguage(current);
      document.documentElement.lang = current;
      document.documentElement.dir = current === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();
    window.addEventListener("storage", syncLanguage);
    window.addEventListener("organheal-language-change", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("organheal-language-change", syncLanguage);
    };
  }, []);

  const systemCards = [
    {
      title: text("Health Assessments", "التقييمات الصحية"),
      body: text(
        "Focused educational assessments for heart, kidney, liver, lung, brain, and metabolic health.",
        "تقييمات تعليمية مركزة للقلب، الكلى، الكبد، الرئة، الدماغ، وصحة الأيض."
      ),
    },
    {
      title: text("Medical Reports", "التقارير الطبية"),
      body: text(
        "Upload lab reports, radiology reports, discharge summaries, and medical documents.",
        "رفع تقارير المختبر، الأشعة، ملخصات الخروج، والوثائق الطبية."
      ),
    },
    {
      title: text("Report Analysis", "تحليل التقارير"),
      body: text(
        "Turn medical text into clearer patient summaries and doctor-ready points.",
        "تحويل النصوص الطبية إلى ملخصات أوضح للمريض ونقاط جاهزة للطبيب."
      ),
    },
    {
      title: text("Follow-up Plan", "خطة المتابعة"),
      body: text(
        "Connect assessments, reports, check-ins, and history into practical follow-up steps.",
        "ربط التقييمات، التقارير، التحديثات اليومية، والتاريخ الصحي بخطوات متابعة عملية."
      ),
    },
  ];

  const modules = [
    text("Heart", "القلب"),
    text("Kidney", "الكلى"),
    text("Liver", "الكبد"),
    text("Lung", "الرئة"),
    text("Brain", "الدماغ"),
    text("Metabolic", "الأيض"),
    text("Reports", "التقارير"),
    text("Health Plan", "الخطة الصحية"),
  ];

  const steps = [
    {
      number: "01",
      title: text("Start with assessment", "ابدأ بالتقييم"),
      body: text(
        "Build your first health picture and identify priority areas.",
        "ابنِ أول صورة صحية وحدد مناطق الأولوية."
      ),
    },
    {
      number: "02",
      title: text("Upload medical reports", "ارفع التقارير الطبية"),
      body: text(
        "Add lab reports, radiology reports, prescriptions, or summaries.",
        "أضف تقارير المختبر، الأشعة، الوصفات، أو الملخصات."
      ),
    },
    {
      number: "03",
      title: text("Analyze reports", "حلّل التقارير"),
      body: text(
        "Generate patient-friendly and doctor-ready summaries.",
        "ولّد ملخصات واضحة للمريض وجاهزة للطبيب."
      ),
    },
    {
      number: "04",
      title: text("Prepare follow-up", "جهّز المتابعة"),
      body: text(
        "Use the Health Plan to organize next steps and questions.",
        "استخدم الخطة الصحية لتنظيم الخطوات والأسئلة القادمة."
      ),
    },
  ];

  return (
    <main className="aboutCleanPage" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        .aboutCleanPage,
        .aboutCleanPage * {
          box-sizing: border-box;
        }

        .aboutCleanPage {
          min-height: 100vh;
          background:
            radial-gradient(circle at 12% 5%, rgba(6, 182, 212, 0.22), transparent 28%),
            radial-gradient(circle at 88% 18%, rgba(15, 118, 110, 0.28), transparent 34%),
            linear-gradient(180deg, #dbeafe 0%, #e2e8f0 46%, #f8fafc 100%);
          color: #0f172a;
          padding: 30px 0 64px;
        }

        .aboutContainer {
          width: min(1180px, calc(100% - 28px));
          margin: 0 auto;
          display: grid;
          gap: 22px;
        }

        .aboutHero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(300px, 0.42fr);
          gap: 28px;
          align-items: stretch;
          padding: 42px;
          border-radius: 36px;
          background:
            radial-gradient(circle at 88% 10%, rgba(20, 184, 166, 0.46), transparent 36%),
            linear-gradient(135deg, #061826 0%, #0f172a 42%, #0f766e 100%);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 34px 90px rgba(15, 23, 42, 0.36);
        }

        .aboutEyebrow {
          display: inline-flex;
          width: fit-content;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(209, 250, 229, 0.16);
          color: #d1fae5;
          border: 1px solid rgba(209, 250, 229, 0.30);
          font-size: 0.72rem;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 18px;
        }

        .aboutTitle {
          margin: 0;
          color: #ffffff;
          font-size: clamp(2.6rem, 5vw, 4.7rem);
          line-height: 0.98;
          letter-spacing: -0.06em;
          max-width: 820px;
        }

        .aboutLead {
          margin: 20px 0 0;
          max-width: 780px;
          color: rgba(226, 232, 240, 0.94);
          font-weight: 760;
          line-height: 1.75;
          font-size: 1.04rem;
        }

        .aboutActions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 26px;
        }

        .aboutPrimary,
        .aboutSecondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 18px;
          border-radius: 999px;
          font-weight: 950;
          text-decoration: none;
        }

        .aboutPrimary {
          background: linear-gradient(135deg, #06b6d4, #14b8a6);
          color: #061826;
          box-shadow: 0 16px 40px rgba(6, 182, 212, 0.34);
        }

        .aboutSecondary {
          background: #ffffff;
          color: #0f766e;
          border: 1px solid rgba(15, 118, 110, 0.30);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
        }

        .aboutPreview {
          display: grid;
          gap: 16px;
          padding: 24px;
          border-radius: 30px;
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 30px 78px rgba(0, 0, 0, 0.24);
          border: 1px solid rgba(255, 255, 255, 0.24);
        }

        .previewTop {
          padding: 18px;
          border-radius: 22px;
          background: linear-gradient(135deg, #061826, #0f766e);
          color: #ffffff;
        }

        .previewTop small {
          display: block;
          color: #d1fae5;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .previewTop strong {
          display: block;
          color: #ffffff;
          font-size: 1.35rem;
          line-height: 1.25;
        }

        .previewBox {
          padding: 18px;
          border-radius: 20px;
          background: #f8fafc;
          border: 1px solid rgba(15, 23, 42, 0.10);
        }

        .previewBox strong {
          display: block;
          color: #0f172a;
          font-weight: 950;
          margin-bottom: 8px;
        }

        .previewBox p {
          margin: 0;
          color: #475569;
          font-weight: 760;
          line-height: 1.6;
        }

        .aboutPanel {
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.14);
          border-radius: 32px;
          padding: 26px;
          box-shadow: 0 22px 58px rgba(15, 23, 42, 0.13);
        }

        .panelLabel {
          color: #0f766e;
          font-size: 0.74rem;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .panelTitle {
          margin: 0;
          color: #0f172a;
          font-size: clamp(1.7rem, 3vw, 2.5rem);
          line-height: 1.14;
          letter-spacing: -0.035em;
        }

        .panelText {
          margin: 12px 0 0;
          color: #334155;
          font-weight: 740;
          line-height: 1.7;
          max-width: 860px;
        }

        .aboutGrid4 {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
          margin-top: 22px;
        }

        .aboutCard {
          min-height: 210px;
          padding: 22px;
          border-radius: 24px;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.12);
          border-top: 7px solid #0f766e;
          box-shadow: 0 16px 38px rgba(15, 23, 42, 0.10);
        }

        .aboutCard:nth-child(1) {
          border-top-color: #2563eb;
        }

        .aboutCard:nth-child(2) {
          border-top-color: #0f766e;
        }

        .aboutCard:nth-child(3) {
          border-top-color: #059669;
        }

        .aboutCard:nth-child(4) {
          border-top-color: #d97706;
        }

        .aboutIcon {
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          border-radius: 16px;
          background: #ecfeff;
          color: #0f766e;
          font-weight: 950;
          margin-bottom: 16px;
        }

        .aboutCard h3 {
          margin: 0;
          color: #0f172a;
          font-size: 1.2rem;
          line-height: 1.25;
          font-weight: 950;
        }

        .aboutCard p {
          margin: 10px 0 0;
          color: #475569;
          font-weight: 740;
          line-height: 1.65;
        }

        .aboutTwoCol {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 22px;
        }

        .stepList {
          display: grid;
          gap: 14px;
          margin-top: 20px;
        }

        .stepItem {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 14px;
          align-items: start;
          padding: 16px;
          border-radius: 20px;
          background: #f8fafc;
          border: 1px solid rgba(15, 23, 42, 0.10);
        }

        .stepNumber {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 999px;
          background: #0f766e;
          color: white;
          font-weight: 950;
        }

        .stepItem strong {
          display: block;
          color: #0f172a;
          font-weight: 950;
          margin-bottom: 4px;
        }

        .stepItem p {
          margin: 0;
          color: #475569;
          font-weight: 740;
          line-height: 1.55;
        }

        .moduleGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-top: 20px;
        }

        .moduleItem {
          min-height: 92px;
          padding: 16px;
          border-radius: 20px;
          background: linear-gradient(180deg, #ffffff, #f8fafc);
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-inline-start: 6px solid #0f766e;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.07);
        }

        .moduleItem strong {
          display: block;
          color: #0f172a;
          font-size: 1.05rem;
          font-weight: 950;
        }

        .moduleItem span {
          display: inline-flex;
          width: fit-content;
          margin-top: 8px;
          padding: 6px 10px;
          border-radius: 999px;
          background: #ecfeff;
          color: #0f766e;
          border: 1px solid rgba(15, 118, 110, 0.18);
          font-size: 0.74rem;
          font-weight: 950;
        }

        .safetyGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-top: 20px;
        }

        .safetyCard {
          min-height: 170px;
          padding: 18px;
          border-radius: 22px;
          background: #f8fafc;
          border: 1px solid rgba(15, 23, 42, 0.10);
        }

        .safetyCard strong {
          display: block;
          color: #0f172a;
          font-weight: 950;
          margin-bottom: 8px;
        }

        .safetyCard p {
          margin: 0;
          color: #475569;
          font-weight: 740;
          line-height: 1.6;
        }

        .aboutCTA {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 28px;
          border-radius: 32px;
          background: linear-gradient(135deg, #ecfeff, #ffffff);
          border: 1px solid rgba(15, 118, 110, 0.18);
          box-shadow: 0 22px 58px rgba(15, 23, 42, 0.10);
        }

        .aboutCTA h2 {
          margin: 0;
          color: #0f172a;
          font-size: clamp(1.5rem, 3vw, 2.2rem);
          line-height: 1.15;
        }

        .aboutCTA p {
          margin: 8px 0 0;
          color: #475569;
          font-weight: 740;
          line-height: 1.65;
        }

        @media (max-width: 980px) {
          .aboutHero,
          .aboutTwoCol {
            grid-template-columns: 1fr;
          }

          .aboutGrid4,
          .safetyGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .aboutGrid4,
          .safetyGrid,
          .moduleGrid {
            grid-template-columns: 1fr;
          }

          .aboutHero {
            padding: 28px;
          }

          .aboutCTA {
            display: grid;
          }
        }
      `}</style>

      <div className="aboutContainer">
        <section className="aboutHero">
          <div>
            <span className="aboutEyebrow">
              {text("About OrganHeal AI", "عن OrganHeal AI")}
            </span>

            <h1 className="aboutTitle">
              {text(
                "Personal Health Analysis for clearer understanding.",
                "تحليل صحي شخصي لفهم أوضح."
              )}
            </h1>

            <p className="aboutLead">
              {text(
                "OrganHeal AI is an educational and organizational health analysis platform that helps users understand assessments, medical reports, lab results, and follow-up patterns in a clear and structured way.",
                "OrganHeal AI منصة تعليمية وتنظيمية للتحليل الصحي تساعد المستخدم على فهم التقييمات، التقارير الطبية، نتائج المختبر، وأنماط المتابعة بطريقة واضحة ومنظمة."
              )}
            </p>

            <div className="aboutActions">
              <Link href="/assessment" className="aboutPrimary">
                {text("Start Assessment", "ابدأ التقييم")}
              </Link>

              <Link href="/lab-upload" className="aboutPrimary">
                {text("Upload Report", "رفع تقرير")}
              </Link>

              <Link href="/medical-disclaimer" className="aboutSecondary">
                {text("Medical Disclaimer", "إخلاء طبي")}
              </Link>
            </div>
          </div>

          <aside className="aboutPreview">
            <div className="previewTop">
              <small>{text("Health workspace", "مساحة صحية")}</small>
              <strong>
                {text(
                  "Assessments, reports, analysis, and follow-up in one place.",
                  "التقييمات، التقارير، التحليل، والمتابعة في مكان واحد."
                )}
              </strong>
            </div>

            <div className="previewBox">
              <strong>{text("Patient-friendly", "مناسب للمريض")}</strong>
              <p>
                {text(
                  "Clear summaries without overwhelming medical language.",
                  "ملخصات واضحة بدون لغة طبية مربكة."
                )}
              </p>
            </div>

            <div className="previewBox">
              <strong>{text("Doctor-ready", "جاهز للطبيب")}</strong>
              <p>
                {text(
                  "Structured points that support better clinical conversations.",
                  "نقاط منظمة تساعد في نقاش طبي أوضح."
                )}
              </p>
            </div>
          </aside>
        </section>

        <section className="aboutPanel">
          <div className="panelLabel">
            {text("What OrganHeal provides", "ماذا يقدم OrganHeal")}
          </div>

          <h2 className="panelTitle">
            {text(
              "One connected system for assessments, reports, analysis, and follow-up.",
              "نظام واحد يربط التقييمات، التقارير، التحليل، والمتابعة."
            )}
          </h2>

          <p className="panelText">
            {text(
              "The platform is designed to connect the main pieces of a personal health journey into a structured experience.",
              "تم تصميم المنصة لربط الأجزاء الرئيسية من الرحلة الصحية الشخصية داخل تجربة منظمة."
            )}
          </p>

          <div className="aboutGrid4">
            {systemCards.map((card, index) => (
              <article className="aboutCard" key={card.title}>
                <div className="aboutIcon">{index + 1}</div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="aboutTwoCol">
          <article className="aboutPanel">
            <div className="panelLabel">
              {text("Personal health analysis vision", "رؤية التحليل الصحي الشخصي")}
            </div>

            <h2 className="panelTitle">
              {text(
                "Beyond a single report reader.",
                "أبعد من مجرد قراءة تقرير واحد."
              )}
            </h2>

            <p className="panelText">
              {text(
                "OrganHeal is being built as a Personal Health Analysis Operating System: a place where assessments, reports, check-ins, history, doctor briefs, and follow-up plans work together.",
                "يتم بناء OrganHeal كنظام تشغيل للتحليل الصحي الشخصي، حيث تعمل التقييمات والتقارير والتحديثات اليومية والتاريخ الصحي وملخصات الطبيب وخطط المتابعة معًا."
              )}
            </p>

            <div className="stepList">
              {steps.map((step) => (
                <div className="stepItem" key={step.number}>
                  <span className="stepNumber">{step.number}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="aboutPanel">
            <div className="panelLabel">
              {text("Core modules", "الوحدات الأساسية")}
            </div>

            <h2 className="panelTitle">
              {text(
                "What OrganHeal AI includes",
                "ماذا يتضمن OrganHeal AI"
              )}
            </h2>

            <p className="panelText">
              {text(
                "The platform is organized around organ health, reports, analysis, and follow-up.",
                "المنصة منظمة حول صحة الأعضاء، التقارير، التحليل، والمتابعة."
              )}
            </p>

            <div className="moduleGrid">
              {modules.map((module) => (
                <div className="moduleItem" key={module}>
                  <strong>{module}</strong>
                  <span>{text("Connected module", "وحدة مرتبطة")}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="aboutPanel">
          <div className="panelLabel">
            {text("Trust & medical safety", "الثقة والسلامة الطبية")}
          </div>

          <h2 className="panelTitle">
            {text(
              "What OrganHeal does and does not do.",
              "ما الذي يفعله OrganHeal وما الذي لا يفعله."
            )}
          </h2>

          <p className="panelText">
            {text(
              "Safety is part of the product. OrganHeal is designed for education, organization, and preparation, not diagnosis or emergency care.",
              "السلامة جزء من المنتج. تم تصميم OrganHeal للتعليم والتنظيم والتحضير، وليس للتشخيص أو الرعاية الطارئة."
            )}
          </p>

          <div className="safetyGrid">
            <article className="safetyCard">
              <strong>{text("Educational guidance", "توجيه تعليمي")}</strong>
              <p>
                {text(
                  "Supports understanding and preparation.",
                  "يدعم الفهم والتحضير."
                )}
              </p>
            </article>

            <article className="safetyCard">
              <strong>{text("No diagnosis", "لا يقدم تشخيصًا")}</strong>
              <p>
                {text(
                  "Does not diagnose, prescribe, or replace care.",
                  "لا يشخص ولا يصف العلاج ولا يستبدل الرعاية."
                )}
              </p>
            </article>

            <article className="safetyCard">
              <strong>{text("Clinician review", "مراجعة الطبيب")}</strong>
              <p>
                {text(
                  "Important findings should be reviewed with licensed professionals.",
                  "يجب مراجعة النتائج المهمة مع مختصين مرخصين."
                )}
              </p>
            </article>

            <article className="safetyCard">
              <strong>{text("Emergency symptoms", "الأعراض الطارئة")}</strong>
              <p>
                {text(
                  "Severe symptoms require urgent medical care.",
                  "الأعراض الشديدة تحتاج رعاية طبية عاجلة."
                )}
              </p>
            </article>
          </div>
        </section>

        <section className="aboutCTA">
          <div>
            <div className="panelLabel">{text("Get started", "ابدأ الآن")}</div>
            <h2>
              {text(
                "Start with an assessment or upload a medical report.",
                "ابدأ بتقييم صحي أو ارفع تقريرًا طبيًا."
              )}
            </h2>
            <p>
              {text(
                "The best way to use OrganHeal is to begin with a health assessment, upload medical reports, then open Reports for structured analysis.",
                "أفضل طريقة لاستخدام OrganHeal هي البدء بتقييم صحي، رفع التقارير الطبية، ثم فتح التقارير للتحليل المنظم."
              )}
            </p>
          </div>

          <div className="aboutActions" style={{ marginTop: 0 }}>
            <Link href="/assessment" className="aboutPrimary">
              {text("Start Assessment", "ابدأ التقييم")}
            </Link>

            <Link href="/lab-upload" className="aboutSecondary">
              {text("Upload Report", "رفع تقرير")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}