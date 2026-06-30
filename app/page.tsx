"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Language = "en" | "ar";

type TrustCard = {
  label: string;
  title: string;
  description: string;
};

type StepCard = {
  number: string;
  title: string;
  description: string;
};

type InsightCard = {
  label: string;
  title: string;
  description: string;
};

type ComparisonRow = {
  feature: string;
  free: boolean;
  plus: boolean;
};

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

function CheckMark({ active }: { active: boolean }) {
  return (
    <span
      className={`homeCheckMark ${active ? "active" : "inactive"}`}
      aria-label={active ? "Included" : "Not included"}
    >
      {active ? "✓" : "—"}
    </span>
  );
}

function IconMark({ label }: { label: string }) {
  return (
    <span className="homeIconMark" aria-hidden="true">
      {label}
    </span>
  );
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");
  const [heroQuestion, setHeroQuestion] = useState("");
  const [heroAnswer, setHeroAnswer] = useState("");
  const [heroLoading, setHeroLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const isArabic = language === "ar";

  useEffect(() => {
    function syncLanguage() {
      const selectedLanguage = getStoredLanguage();

      setLanguage(selectedLanguage);
      document.documentElement.lang = selectedLanguage;
      document.documentElement.dir = selectedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();
    checkUser();

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

  async function checkUser() {
    const { data } = await supabase.auth.getUser();
    setIsLoggedIn(Boolean(data.user));
  }

  async function signOut() {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    window.location.href = "/";
  }

  async function askHeroAI() {
    if (!heroQuestion.trim() || heroLoading) return;

    setHeroLoading(true);
    setHeroAnswer("");

    try {
      const result = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: heroQuestion,
          language,
          healthContext: null,
        }),
      });

      const data = await result.json();

      setHeroAnswer(
        data.response ||
          text(
            "I could not generate an answer right now.",
            "لم أستطع إنشاء إجابة الآن."
          )
      );
    } catch {
      setHeroAnswer(
        text(
          "A temporary error occurred while connecting to the assistant.",
          "حدث خطأ مؤقت أثناء الاتصال بالمساعد."
        )
      );
    } finally {
      setHeroLoading(false);
    }
  }

  const trustCards: TrustCard[] = [
    {
      label: "AI",
      title: text("Health intelligence, not random advice", "ذكاء صحي وليس نصائح عشوائية"),
      description: text(
        "OrganHeal organizes health signals, explains them clearly, and prepares you for better medical conversations.",
        "OrganHeal ينظم المؤشرات الصحية، يشرحها بوضوح، ويحضرّك لنقاش طبي أفضل."
      ),
    },
    {
      label: "PT",
      title: text("Patient-friendly understanding", "فهم مبسط للمريض"),
      description: text(
        "Complex reports become simple explanations, next steps, and questions to ask your clinician.",
        "التقارير المعقدة تتحول إلى شرح مبسط، خطوات تالية، وأسئلة للطبيب."
      ),
    },
    {
      label: "DR",
      title: text("Doctor-ready summaries", "ملخصات جاهزة للطبيب"),
      description: text(
        "Structured briefs help make appointments more focused and useful.",
        "ملخصات منظمة تساعد أن تكون زيارة الطبيب أكثر وضوحًا وفائدة."
      ),
    },
    {
      label: "SC",
      title: text("Safety-first health platform", "منصة صحية مبنية على الأمان"),
      description: text(
        "Educational support only. OrganHeal does not diagnose, treat, or replace licensed medical care.",
        "دعم تثقيفي فقط. OrganHeal لا يشخص ولا يعالج ولا يستبدل الرعاية الطبية المرخصة."
      ),
    },
  ];

  const steps: StepCard[] = [
    {
      number: "01",
      title: text("Build your health profile", "ابنِ ملفك الصحي"),
      description: text(
        "Start with guided health information that helps OrganHeal understand your journey.",
        "ابدأ بمعلومات صحية موجهة تساعد OrganHeal على فهم رحلتك."
      ),
    },
    {
      number: "02",
      title: text("Add reports and signals", "أضف التقارير والمؤشرات"),
      description: text(
        "Connect lab reports, medical documents, check-ins, and health priorities.",
        "اربط تقارير المختبر، المستندات الطبية، التحديثات، والأولويات الصحية."
      ),
    },
    {
      number: "03",
      title: text("Generate intelligence", "ولّد الذكاء الصحي"),
      description: text(
        "Turn health data into summaries, risk signals, and doctor-ready preparation.",
        "حوّل البيانات الصحية إلى ملخصات، إشارات، وتحضير جاهز للطبيب."
      ),
    },
    {
      number: "04",
      title: text("Follow the next step", "تابع الخطوة التالية"),
      description: text(
        "Use your dashboard and plan to continue with more clarity over time.",
        "استخدم لوحة التحكم والخطة للمتابعة بوضوح أكبر مع الوقت."
      ),
    },
  ];

  const insightCards: InsightCard[] = [
    {
      label: "LAB",
      title: text("Lab marker explanation", "شرح مؤشرات المختبر"),
      description: text(
        "Understand common values such as LDL, HDL, HbA1c, creatinine, vitamin D, and liver enzymes.",
        "افهم مؤشرات مثل LDL، HDL، HbA1c، الكرياتينين، فيتامين D، وإنزيمات الكبد."
      ),
    },
    {
      label: "PLAN",
      title: text("Personal next steps", "خطوات شخصية تالية"),
      description: text(
        "OrganHeal turns health information into a practical direction you can review with your clinician.",
        "OrganHeal يحوّل معلوماتك الصحية إلى اتجاه عملي يمكنك مراجعته مع الطبيب."
      ),
    },
    {
      label: "EDU",
      title: text("Education linked to your profile", "تثقيف مرتبط بملفك"),
      description: text(
        "Education can be connected to organs, lab markers, and health priorities.",
        "التثقيف يمكن ربطه بالأعضاء، المؤشرات، والأولويات الصحية."
      ),
    },
  ];

  const comparisonRows: ComparisonRow[] = [
    {
      feature: text("Basic health profile and assessment", "ملف صحي وتقييم أساسي"),
      free: true,
      plus: true,
    },
    {
      feature: text("Educational health assistant", "مساعد صحي تثقيفي"),
      free: true,
      plus: true,
    },
    {
      feature: text("Medical report upload", "رفع التقارير الطبية"),
      free: true,
      plus: true,
    },
    {
      feature: text("Saved intelligence history", "حفظ تاريخ الذكاء الصحي"),
      free: false,
      plus: true,
    },
    {
      feature: text("Patient-friendly PDF summaries", "ملخصات PDF مبسطة للمريض"),
      free: false,
      plus: true,
    },
    {
      feature: text("Doctor-ready briefs", "ملخصات جاهزة للطبيب"),
      free: false,
      plus: true,
    },
    {
      feature: text("Trend and risk pattern tracking", "تتبع الاتجاهات وأنماط الخطورة"),
      free: false,
      plus: true,
    },
  ];

  return (
    <main
      className="ohPageShell publicHomePage"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <style>{`
        .publicHomePage,
        .publicHomePage * {
          box-sizing: border-box;
        }

        .publicHomePage a {
          color: inherit;
          text-decoration: none;
        }

        .publicHomePage .ohHero {
          position: relative;
          overflow: hidden;
        }

        .publicHomePage .ohHero::before {
          content: "";
          position: absolute;
          inset: -120px auto auto -120px;
          width: 300px;
          height: 300px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(20,184,166,0.16), transparent 68%);
          pointer-events: none;
        }

        .publicHomePage .ohHeroGrid {
          grid-template-columns: minmax(0, 1.1fr) minmax(360px, 0.9fr);
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .publicHomePage .homeHeroInput {
          width: 100%;
          max-width: 100%;
          min-height: 48px;
          border: 1px solid rgba(148, 163, 184, 0.34);
          border-radius: 14px;
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.95);
          color: var(--oh-text);
          font: inherit;
          outline: none;
          box-sizing: border-box;
        }

        .publicHomePage .homeHeroInput:focus {
          border-color: rgba(20, 184, 166, 0.65);
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.12);
        }

        .publicHomePage .homeHeroInput::placeholder {
          color: rgba(71, 85, 105, 0.72);
        }

        .publicHomePage .homeHeroShowcase {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          min-width: 0;
        }

        .publicHomePage .homeAskCard {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow: hidden;
        }

        .publicHomePage .homeMotionStage {
          position: relative;
          min-height: 270px;
          overflow: hidden;
          border-radius: 26px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background:
            radial-gradient(circle at 20% 20%, rgba(20, 184, 166, 0.16), transparent 28%),
            radial-gradient(circle at 82% 28%, rgba(37, 99, 235, 0.12), transparent 26%),
            linear-gradient(135deg, rgba(255,255,255,0.94), rgba(240,253,250,0.9));
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
          padding: 18px;
        }

        .publicHomePage .homeMotionOrbit {
          position: absolute;
          width: 180px;
          height: 180px;
          border-radius: 999px;
          border: 1px dashed rgba(20, 184, 166, 0.36);
          left: 50%;
          top: 52%;
          transform: translate(-50%, -50%);
          animation: homeOrbitSpin 18s linear infinite;
        }

        .publicHomePage .homeMotionOrbit::before,
        .publicHomePage .homeMotionOrbit::after {
          content: "";
          position: absolute;
          width: 13px;
          height: 13px;
          border-radius: 999px;
          background: #14b8a6;
          box-shadow: 0 0 0 8px rgba(20, 184, 166, 0.12);
        }

        .publicHomePage .homeMotionOrbit::before {
          top: -7px;
          left: 50%;
        }

        .publicHomePage .homeMotionOrbit::after {
          bottom: 12px;
          right: 8px;
          background: #2563eb;
          box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.12);
        }

        .publicHomePage .homePulseCore {
          position: absolute;
          left: 50%;
          top: 52%;
          transform: translate(-50%, -50%);
          width: 118px;
          height: 118px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at center, rgba(255,255,255,0.98) 54%, transparent 55%),
            conic-gradient(#14b8a6 0 74%, rgba(148, 163, 184, 0.2) 74% 100%);
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.1);
          animation: homeSoftPulse 3.8s ease-in-out infinite;
        }

        .publicHomePage .homePulseCore strong {
          font-size: 1.5rem;
          color: var(--oh-text);
          line-height: 1;
        }

        .publicHomePage .homePulseCore span {
          display: block;
          margin-top: 4px;
          color: var(--oh-muted);
          font-size: 0.68rem;
          font-weight: 900;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .publicHomePage .homeFloatingCard {
          position: absolute;
          width: min(210px, calc(100% - 36px));
          padding: 13px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(148, 163, 184, 0.2);
          box-shadow: 0 16px 38px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(14px);
        }

        .publicHomePage .homeFloatingCard.one {
          left: 16px;
          top: 18px;
          animation: homeFloatOne 5.2s ease-in-out infinite;
        }

        .publicHomePage .homeFloatingCard.two {
          right: 16px;
          top: 48px;
          animation: homeFloatTwo 5.6s ease-in-out infinite;
        }

        .publicHomePage .homeFloatingCard.three {
          left: 28px;
          bottom: 18px;
          animation: homeFloatThree 6s ease-in-out infinite;
        }

        .publicHomePage .homeFloatingCard p {
          margin: 0;
        }

        .publicHomePage .homeSignalLabel {
          font-size: 0.72rem;
          color: var(--oh-muted);
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .publicHomePage .homeSignalText {
          margin-top: 5px !important;
          color: var(--oh-text);
          font-weight: 900;
          font-size: 0.88rem;
          line-height: 1.35;
        }

        .publicHomePage .homeIconMark {
          display: inline-flex;
          width: 44px;
          height: 44px;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          background: linear-gradient(135deg, rgba(20, 184, 166, 0.16), rgba(37, 99, 235, 0.12));
          border: 1px solid rgba(20, 184, 166, 0.22);
          color: var(--oh-primary);
          font-weight: 900;
          letter-spacing: -0.04em;
        }

        .publicHomePage .homeProductPreview {
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background:
            linear-gradient(135deg, rgba(255,255,255,0.94), rgba(240,253,250,0.92));
          padding: 20px;
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
        }

        .publicHomePage .homePreviewBar {
          height: 10px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.22);
          overflow: hidden;
        }

        .publicHomePage .homePreviewBar span {
          display: block;
          height: 100%;
          width: 72%;
          border-radius: inherit;
          background: linear-gradient(90deg, #14b8a6, #2563eb);
        }

        .publicHomePage .homeComparisonTable {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 18px;
        }

        .publicHomePage .homeComparisonTable th,
        .publicHomePage .homeComparisonTable td {
          padding: 16px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.16);
          text-align: ${isArabic ? "right" : "left"};
        }

        .publicHomePage .homeComparisonTable th {
          background: rgba(248, 250, 252, 0.92);
          color: var(--oh-text);
          font-size: 0.88rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .publicHomePage .homeComparisonTable tr:last-child td {
          border-bottom: 0;
        }

        .publicHomePage .homeCheckMark {
          display: inline-flex;
          width: 28px;
          height: 28px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          font-weight: 900;
        }

        .publicHomePage .homeCheckMark.active {
          color: #047857;
          background: rgba(16, 185, 129, 0.12);
        }

        .publicHomePage .homeCheckMark.inactive {
          color: #94a3b8;
          background: rgba(148, 163, 184, 0.12);
        }

        @keyframes homeOrbitSpin {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }

        @keyframes homeSoftPulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.035);
          }
        }

        @keyframes homeFloatOne {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes homeFloatTwo {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(9px);
          }
        }

        @keyframes homeFloatThree {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .publicHomePage .homeMotionOrbit,
          .publicHomePage .homePulseCore,
          .publicHomePage .homeFloatingCard {
            animation: none;
          }
        }

        @media (max-width: 1100px) {
          .publicHomePage .ohHeroGrid {
            grid-template-columns: 1fr;
          }

          .publicHomePage .homeHeroShowcase {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .publicHomePage .homeComparisonTable {
            font-size: 0.9rem;
          }

          .publicHomePage .homeComparisonTable th,
          .publicHomePage .homeComparisonTable td {
            padding: 12px;
          }

          .publicHomePage .homeMotionStage {
            min-height: 310px;
          }

          .publicHomePage .homeFloatingCard {
            position: relative;
            inset: auto !important;
            width: 100%;
            margin-bottom: 10px;
          }

          .publicHomePage .homeMotionOrbit,
          .publicHomePage .homePulseCore {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .publicHomePage .ohTitle {
            font-size: clamp(2.1rem, 12vw, 3.1rem);
          }

          .publicHomePage .ohButtonRow {
            width: 100%;
          }

          .publicHomePage .primaryBtn,
          .publicHomePage .secondaryBtn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Personal Health Intelligence Platform", "منصة ذكاء صحي شخصي")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Understand your health clearly before your next step.",
                  "افهم صحتك بوضوح قبل خطوتك التالية."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "OrganHeal turns assessments, lab reports, and medical documents into clear health understanding, patient-friendly summaries, and doctor-ready briefs.",
                  "OrganHeal يحوّل التقييمات، نتائج المختبر، والمستندات الطبية إلى فهم صحي واضح، ملخصات مبسطة للمريض، وملخصات جاهزة للطبيب."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/assessment" className="primaryBtn">
                  {text("Start Free Assessment", "ابدأ التقييم المجاني")}
                </Link>

                <a href="#how-it-works" className="secondaryBtn">
                  {text("See How It Works", "شاهد كيف يعمل")}
                </a>
              </div>

              <div className="ohTrustNotice" style={{ marginTop: "22px" }}>
                <span aria-hidden="true">!</span>
                <div>
                  <strong>
                    {text("Medical safety", "السلامة الطبية")}
                  </strong>
                  <br />
                  {text(
                    "OrganHeal provides educational health intelligence only. It does not diagnose, treat, or replace emergency care or a licensed clinician.",
                    "OrganHeal يقدم ذكاء صحي تعليمي فقط. لا يشخص ولا يعالج ولا يستبدل الرعاية الطارئة أو الطبيب المختص."
                  )}
                </div>
              </div>
            </div>

            <aside className="homeHeroShowcase" aria-label={text("OrganHeal live preview", "معاينة OrganHeal")}>
              <div className="ohCard homeAskCard">
                <div className="ohCardHeader">
                  <div>
                    <p className="ohMetricLabel">
                      {text("Ask OrganHeal", "اسأل OrganHeal")}
                    </p>

                    <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                      {text("Try a quick health question", "جرّب سؤالًا صحيًا سريعًا")}
                    </h2>
                  </div>

                  <span className="ohStatusBadge neutral">
                    {text("Demo", "تجربة")}
                  </span>
                </div>

                <p className="ohCardText">
                  {text(
                    "Ask a general educational question before creating your full health profile.",
                    "اسأل سؤالًا تثقيفيًا عامًا قبل إنشاء ملفك الصحي الكامل."
                  )}
                </p>

                <div className="ohStack" style={{ gap: "12px", marginTop: "16px" }}>
                  <input
                    className="homeHeroInput"
                    type="text"
                    value={heroQuestion}
                    onChange={(event) => setHeroQuestion(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") askHeroAI();
                    }}
                    placeholder={text(
                      "Example: What should I ask my doctor about LDL?",
                      "مثال: ماذا أسأل الطبيب عن LDL؟"
                    )}
                  />

                  <button
                    type="button"
                    className="primaryBtn"
                    onClick={askHeroAI}
                    disabled={heroLoading}
                  >
                    {heroLoading
                      ? text("Thinking...", "جاري التفكير...")
                      : text("Ask OrganHeal", "اسأل OrganHeal")}
                  </button>
                </div>

                {heroAnswer && (
                  <div className="ohTrustNotice" style={{ marginTop: "16px" }}>
                    <span aria-hidden="true">AI</span>
                    <div>
                      <strong>
                        {text("Quick educational answer", "إجابة تثقيفية سريعة")}
                      </strong>
                      <br />
                      {heroAnswer}
                    </div>
                  </div>
                )}
              </div>

              <div className="homeMotionStage" aria-hidden="true">
                <div className="homeMotionOrbit" />

                <div className="homePulseCore">
                  <div>
                    <strong>72%</strong>
                    <span>{text("Clarity", "وضوح")}</span>
                  </div>
                </div>

                <div className="homeFloatingCard one">
                  <p className="homeSignalLabel">{text("Report signal", "إشارة تقرير")}</p>
                  <p className="homeSignalText">{text("Lab markers organized", "تنظيم مؤشرات المختبر")}</p>
                </div>

                <div className="homeFloatingCard two">
                  <p className="homeSignalLabel">{text("Doctor brief", "ملخص الطبيب")}</p>
                  <p className="homeSignalText">{text("Questions prepared", "أسئلة جاهزة")}</p>
                </div>

                <div className="homeFloatingCard three">
                  <p className="homeSignalLabel">{text("Next step", "الخطوة التالية")}</p>
                  <p className="homeSignalText">{text("Health direction detected", "تحديد الاتجاه الصحي")}</p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="ohMetricGrid">
          {trustCards.map((card) => (
            <article className="ohMetricCard" key={card.title}>
              <IconMark label={card.label} />
              <span className="ohMetricLabel" style={{ marginTop: "12px" }}>
                {card.title}
              </span>
              <span className="ohMetricHint">{card.description}</span>
            </article>
          ))}
        </section>

        <section id="how-it-works" className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("How OrganHeal Works", "كيف يعمل OrganHeal؟")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "One clear journey from health data to action",
                  "رحلة واضحة من البيانات الصحية إلى الخطوة العملية"
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "OrganHeal is built around a practical health journey: profile, reports, intelligence, and follow-up.",
                  "OrganHeal مبني حول رحلة صحية عملية: ملف صحي، تقارير، ذكاء صحي، ومتابعة."
                )}
              </p>
            </div>
          </div>

          <div className="ohGrid cols4">
            {steps.map((step) => (
              <article className="ohCard" key={step.number}>
                <p className="ohMetricLabel">{step.number}</p>
                <h3 className="ohCardTitle" style={{ fontSize: "1.1rem", marginTop: "10px" }}>
                  {step.title}
                </h3>
                <p className="ohCardText">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="ohGrid cols2">
          <article className="ohCard">
            <p className="ohMetricLabel">
              {text("Product Preview", "معاينة المنتج")}
            </p>

            <h2 className="ohCardTitle">
              {text("A dashboard built for health decisions", "لوحة تحكم مبنية للقرارات الصحية")}
            </h2>

            <p className="ohCardText">
              {text(
                "The dashboard should summarize the user's current health direction, priority area, and next action without repeating every page.",
                "لوحة التحكم يجب أن تلخص الاتجاه الصحي الحالي، منطقة الأولوية، والخطوة التالية بدون تكرار كل الصفحات."
              )}
            </p>

            <div className="homeProductPreview" style={{ marginTop: "18px" }}>
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Health Direction", "الاتجاه الصحي")}
                  </p>
                  <h3 className="ohCardTitle" style={{ fontSize: "1.25rem" }}>
                    {text("Your next best action is ready", "خطوتك الصحية التالية جاهزة")}
                  </h3>
                </div>

                <span className="ohStatusBadge good">
                  {text("On track", "مستقر")}
                </span>
              </div>

              <div className="ohMetricGrid">
                <article className="ohMetricCard">
                  <span className="ohMetricLabel">
                    {text("Health score", "النتيجة الصحية")}
                  </span>
                  <span className="ohMetricValue">78</span>
                  <span className="ohMetricHint">
                    {text("Educational estimate", "تقدير تثقيفي")}
                  </span>
                </article>

                <article className="ohMetricCard">
                  <span className="ohMetricLabel">
                    {text("Priority area", "منطقة الأولوية")}
                  </span>
                  <span className="ohMetricHint">
                    {text("Heart & metabolic health", "القلب والصحة الأيضية")}
                  </span>
                </article>
              </div>

              <div className="homePreviewBar" style={{ marginTop: "18px" }}>
                <span />
              </div>
            </div>
          </article>

          <article className="ohCard">
            <p className="ohMetricLabel">
              {text("Recent Insights Preview", "أمثلة على الرؤى الصحية")}
            </p>

            <h2 className="ohCardTitle">
              {text("Examples of what OrganHeal can explain", "أمثلة لما يمكن أن يشرحه OrganHeal")}
            </h2>

            <p className="ohCardText">
              {text(
                "Future insights can be generated from anonymized patterns, report types, and common educational needs.",
                "يمكن لاحقًا توليد رؤى من أنماط مجهّلة الهوية، أنواع التقارير، والاحتياجات التثقيفية الشائعة."
              )}
            </p>

            <div className="ohTimeline" style={{ marginTop: "18px" }}>
              {insightCards.map((insight) => (
                <div className="ohTimelineItem" key={insight.title}>
                  <span className="ohTimelineDot" />
                  <div>
                    <p className="ohTimelineTitle">
                      <span className="ohStatusBadge neutral" style={{ marginInlineEnd: "8px" }}>
                        {insight.label}
                      </span>
                      {insight.title}
                    </p>
                    <p className="ohTimelineMeta">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="ohButtonRow" style={{ marginTop: "20px" }}>
              <Link href="/features" className="primaryBtn">
                {text("Explore Features", "استكشف الميزات")}
              </Link>

              <Link href="/library" className="secondaryBtn">
                {text("Open Education", "فتح التثقيف")}
              </Link>
            </div>
          </article>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Plans & Follow-Up Value", "الخطط وقيمة المتابعة")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Start simple. Grow into deeper health intelligence.",
                  "ابدأ ببساطة. ثم انتقل إلى ذكاء صحي أعمق."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "The strongest subscription value is not one report. It is saved history, trends, PDF summaries, and ongoing follow-up.",
                  "قيمة الاشتراك الأقوى ليست تقريرًا واحدًا، بل حفظ التاريخ، الاتجاهات، ملخصات PDF، والمتابعة المستمرة."
                )}
              </p>
            </div>
          </div>

          <table className="homeComparisonTable">
            <thead>
              <tr>
                <th>{text("Feature", "الميزة")}</th>
                <th>Free</th>
                <th>Plus</th>
              </tr>
            </thead>

            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.feature}>
                  <td>{row.feature}</td>
                  <td>
                    <CheckMark active={row.free} />
                  </td>
                  <td>
                    <CheckMark active={row.plus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="ohActionPanel">
          <div className="ohCardHeader" style={{ marginBottom: 0 }}>
            <div>
              <p className="ohMetricLabel">
                {text("Start Your Health Intelligence Journey", "ابدأ رحلتك الصحية الذكية")}
              </p>

              <h2 className="ohCardTitle" style={{ fontSize: "1.7rem" }}>
                {text(
                  "Build your profile once, then let OrganHeal organize your health journey.",
                  "ابنِ ملفك مرة واحدة، ثم دع OrganHeal ينظم رحلتك الصحية."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Create an account to save assessments, reports, health intelligence, and follow-up results.",
                  "أنشئ حسابًا لحفظ التقييمات، التقارير، الذكاء الصحي، ونتائج المتابعة."
                )}
              </p>
            </div>

            <div className="ohButtonRow">
              {isLoggedIn ? (
                <>
                  <Link href="/dashboard" className="primaryBtn">
                    {text("Open Dashboard", "فتح لوحة التحكم")}
                  </Link>

                  <button type="button" className="secondaryBtn" onClick={signOut}>
                    {text("Sign Out", "تسجيل الخروج")}
                  </button>
                </>
              ) : (
                <>
                  <Link href="/signup" className="primaryBtn">
                    {text("Create Free Account", "إنشاء حساب مجاني")}
                  </Link>

                  <Link href="/login" className="secondaryBtn">
                    {text("Sign In", "تسجيل الدخول")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

