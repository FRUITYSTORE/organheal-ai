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
        "OrganHeal organizes health signals, explains them clearly, and prepares better health conversations.",
        "OrganHeal ينظم المؤشرات الصحية، يشرحها بوضوح، ويحضرّك لنقاش صحي أفضل."
      ),
    },
    {
      label: "PT",
      title: text("Patient-friendly understanding", "فهم مبسط للمريض"),
      description: text(
        "Complex reports become clearer explanations, learning points, and questions to review with a clinician.",
        "التقارير المعقدة تتحول إلى شرح أوضح، نقاط تعليمية، وأسئلة لمراجعتها مع المختص."
      ),
    },
    {
      label: "DR",
      title: text("Doctor-ready preparation", "تحضير جاهز للطبيب"),
      description: text(
        "Structured summaries help make appointments more focused and useful.",
        "ملخصات منظمة تساعد أن تكون زيارة الطبيب أكثر تركيزًا وفائدة."
      ),
    },
    {
      label: "SC",
      title: text("Safety-first health platform", "منصة صحية مبنية على الأمان"),
      description: text(
        "Educational support only. OrganHeal does not diagnose, treat, prescribe, or replace licensed medical care.",
        "دعم تثقيفي فقط. OrganHeal لا يشخص ولا يعالج ولا يصف علاجًا ولا يستبدل الرعاية الطبية المرخصة."
      ),
    },
  ];

  const steps: StepCard[] = [
    {
      number: "01",
      title: text("Build your health profile", "ابنِ ملفك الصحي"),
      description: text(
        "Start with guided information that helps organize your health context.",
        "ابدأ بمعلومات موجهة تساعد على تنظيم سياقك الصحي."
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
      title: text("Generate health understanding", "ولّد فهمًا صحيًا"),
      description: text(
        "Turn health data into clearer summaries, learning points, and doctor-review questions.",
        "حوّل البيانات الصحية إلى ملخصات أوضح، نقاط تعليمية، وأسئلة لمراجعة الطبيب."
      ),
    },
    {
      number: "04",
      title: text("Continue with clarity", "تابع بوضوح"),
      description: text(
        "Use your workspace to keep reports, learning, summaries, and follow-up context organized.",
        "استخدم مساحتك لتنظيم التقارير والتعلّم والملخصات وسياق المتابعة."
      ),
    },
  ];

  const insightCards: InsightCard[] = [
    {
      label: "LAB",
      title: text("Lab marker learning", "تعلّم مؤشرات المختبر"),
      description: text(
        "Understand common values such as LDL, HDL, HbA1c, creatinine, vitamin D, and liver enzymes.",
        "افهم مؤشرات مثل LDL، HDL، HbA1c، الكرياتينين، فيتامين D، وإنزيمات الكبد."
      ),
    },
    {
      label: "REPORT",
      title: text("Report understanding", "فهم التقارير"),
      description: text(
        "Learn how to read abnormal flags, reference ranges, summary language, and trend comments.",
        "تعلّم قراءة العلامات غير الطبيعية، القيم المرجعية، لغة الملخص، وملاحظات الاتجاهات."
      ),
    },
    {
      label: "VISIT",
      title: text("Doctor-visit preparation", "التحضير لزيارة الطبيب"),
      description: text(
        "Prepare better questions and organize important results before your appointment.",
        "حضّر أسئلة أفضل ونظّم النتائج المهمة قبل موعدك."
      ),
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

        .publicHomePage .homeHero {
          position: relative;
          overflow: hidden;
          padding: 38px;
        }

        .publicHomePage .homeHero::before {
          content: "";
          position: absolute;
          inset: -120px auto auto -120px;
          width: 320px;
          height: 320px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(20,184,166,0.18), transparent 68%);
          pointer-events: none;
        }

        [dir="rtl"] .publicHomePage .homeHero::before {
          inset: -120px -120px auto auto;
        }

        .publicHomePage .homeHero .ohHeroGrid {
          grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.86fr);
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .publicHomePage .homeHero .ohTitle {
          max-width: 860px;
          font-size: clamp(2.55rem, 5vw, 5.2rem);
          line-height: 0.96;
        }

        .publicHomePage .homeHero .ohLead {
          max-width: 760px;
        }

        .publicHomePage .homeHeroInput {
          width: 100%;
          max-width: 100%;
          min-height: 52px;
          border: 1px solid rgba(15, 118, 110, 0.28);
          border-radius: 16px;
          padding: 13px 15px;
          background: rgba(255, 255, 255, 0.98);
          color: var(--oh-text);
          font: inherit;
          font-weight: 750;
          outline: none;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
        }

        .publicHomePage .homeHeroInput:focus {
          border-color: rgba(20, 184, 166, 0.78);
          box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.14);
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
          border-top: 5px solid #14b8a6;
        }

        .publicHomePage .homeMotionStage {
          position: relative;
          min-height: 286px;
          overflow: hidden;
          border-radius: 28px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background:
            radial-gradient(circle at 20% 20%, rgba(20, 184, 166, 0.18), transparent 28%),
            radial-gradient(circle at 82% 28%, rgba(37, 99, 235, 0.14), transparent 26%),
            linear-gradient(135deg, rgba(255,255,255,0.96), rgba(240,253,250,0.9));
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
          padding: 18px;
        }

        .publicHomePage .homeMotionOrbit {
          position: absolute;
          width: 180px;
          height: 180px;
          border-radius: 999px;
          border: 1px dashed rgba(20, 184, 166, 0.38);
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
          width: 124px;
          height: 124px;
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
          font-size: 1.55rem;
          color: var(--oh-text);
          line-height: 1;
        }

        .publicHomePage .homePulseCore span {
          display: block;
          margin-top: 4px;
          color: var(--oh-muted);
          font-size: 0.68rem;
          font-weight: 950;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .publicHomePage .homeFloatingCard {
          position: absolute;
          width: min(214px, calc(100% - 36px));
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
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .publicHomePage .homeSignalText {
          margin-top: 5px !important;
          color: var(--oh-text);
          font-weight: 950;
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
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .publicHomePage .homePreviewPanel {
          border-radius: 28px;
          border: 1px solid rgba(15, 118, 110, 0.18);
          background:
            radial-gradient(circle at 12% 22%, rgba(20, 184, 166, 0.14), transparent 28%),
            linear-gradient(135deg, rgba(240, 253, 250, 0.96), rgba(255, 255, 255, 0.96));
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
          padding: 24px;
        }

        .publicHomePage .homePreviewGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .publicHomePage .homePreviewCard {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 100%;
          border-top: 5px solid #14b8a6;
        }

        .publicHomePage .homeLearningStrip {
          display: grid;
          grid-template-columns: minmax(0, 0.65fr) minmax(0, 1fr);
          gap: 18px;
          align-items: center;
          border-radius: 28px;
          padding: 24px;
          background: linear-gradient(135deg, rgba(239, 246, 255, 0.9), rgba(240, 253, 250, 0.94));
          border: 1px solid rgba(37, 99, 235, 0.14);
        }

        .publicHomePage .homeLearningCloud {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .publicHomePage .homeLearningChip {
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

        .publicHomePage .homeSafetyStrip {
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

        .publicHomePage .homeSafetyStrip strong {
          color: var(--oh-text);
        }

        .publicHomePage .homeSafetyMark {
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
          .publicHomePage .homeHero .ohHeroGrid,
          .publicHomePage .homeLearningStrip {
            grid-template-columns: 1fr;
          }

          .publicHomePage .homePreviewGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
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
          .publicHomePage .homeHero {
            padding: 28px;
          }

          .publicHomePage .homeHero .ohTitle {
            font-size: clamp(2.15rem, 11vw, 3rem);
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
        <section className="ohHero homeHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Personal Health Analysis Platform", "منصة ذكاء صحي شخصي")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Understand your health clearly before your next step.",
                  "افهم صحتك بوضوح قبل خطوتك التالية."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "OrganHeal helps you organize assessments, lab reports, medical documents, learning, and doctor-ready preparation inside one clearer health workspace.",
                  "يساعدك OrganHeal على تنظيم التقييمات، تقارير المختبر، المستندات الطبية، التعلّم، والتحضير للطبيب داخل مساحة صحية أوضح."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                {isLoggedIn ? (
                  <Link href="/dashboard" className="primaryBtn">
                    {text("Open Dashboard", "فتح لوحة التحكم")}
                  </Link>
                ) : (
                  <Link href="/signup" className="primaryBtn">
                    {text("Create Free Account", "إنشاء حساب مجاني")}
                  </Link>
                )}

                <Link href="/features" className="secondaryBtn">
                  {text("Explore Platform Features", "استكشاف ميزات المنصة")}
                </Link>

                <Link href="/library" className="secondaryBtn">
                  {text("Open Health Learning Hub", "فتح مركز التعلّم الصحي")}
                </Link>
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
                      {text("Try a quick educational question", "جرّب سؤالًا تثقيفيًا سريعًا")}
                    </h2>
                  </div>

                  <span className="ohStatusBadge good">
                    {text("Available", "متاح")}
                  </span>
                </div>

                <p className="ohCardText">
                  {text(
                    "Ask a general health education question before building your private health workspace.",
                    "اسأل سؤالًا صحيًا تثقيفيًا عامًا قبل بناء مساحتك الصحية الخاصة."
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
                  <div className="homeSafetyStrip" style={{ marginTop: "16px" }}>
                    <span className="homeSafetyMark" aria-hidden="true">AI</span>
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
                    <strong>OH</strong>
                    <span>{text("Clarity", "وضوح")}</span>
                  </div>
                </div>

                <div className="homeFloatingCard one">
                  <p className="homeSignalLabel">{text("Reports", "التقارير")}</p>
                  <p className="homeSignalText">{text("Markers organized", "تنظيم المؤشرات")}</p>
                </div>

                <div className="homeFloatingCard two">
                  <p className="homeSignalLabel">{text("Doctor prep", "تحضير الطبيب")}</p>
                  <p className="homeSignalText">{text("Questions prepared", "أسئلة جاهزة")}</p>
                </div>

                <div className="homeFloatingCard three">
                  <p className="homeSignalLabel">{text("Learning", "التعلّم")}</p>
                  <p className="homeSignalText">{text("Health topics connected", "مواضيع صحية مترابطة")}</p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="homeSafetyStrip">
          <span className="homeSafetyMark">OH</span>
          <div>
            <strong>
              {text("Health intelligence with clinical boundaries", "ذكاء صحي بحدود سريرية واضحة")}
            </strong>
            <br />
            {text(
              "OrganHeal supports education, organization, and preparation. It does not diagnose, treat, prescribe, provide emergency advice, or replace licensed medical care.",
              "يدعم OrganHeal التثقيف والتنظيم والتحضير. لا يقدم تشخيصًا أو علاجًا أو وصفات أو نصائح طارئة ولا يستبدل الرعاية الطبية المرخصة."
            )}
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
                  "One clear journey from information to preparation.",
                  "رحلة واضحة من المعلومات إلى التحضير."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "OrganHeal is built around a practical journey: profile, reports, understanding, and organized follow-up context.",
                  "OrganHeal مبني حول رحلة عملية: ملف صحي، تقارير، فهم واضح، وسياق متابعة منظم."
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

        <section className="homePreviewPanel">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("What OrganHeal helps you understand", "ما الذي يساعدك OrganHeal على فهمه")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Reports, learning, and doctor preparation in one connected experience.",
                  "التقارير والتعلّم والتحضير للطبيب داخل تجربة مترابطة."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Start with available platform areas, then continue inside your private workspace when you create an account.",
                  "ابدأ بالمناطق المتاحة في المنصة، ثم أكمل داخل مساحتك الخاصة عند إنشاء الحساب."
                )}
              </p>
            </div>
          </div>

          <div className="homePreviewGrid">
            {insightCards.map((insight) => (
              <article className="ohCard homePreviewCard" key={insight.title}>
                <span className="ohStatusBadge neutral">{insight.label}</span>
                <h3 className="ohCardTitle" style={{ fontSize: "1.16rem" }}>
                  {insight.title}
                </h3>
                <p className="ohCardText">{insight.description}</p>
              </article>
            ))}
          </div>

          <div className="ohButtonRow" style={{ marginTop: "22px" }}>
            <Link href="/features" className="primaryBtn">
              {text("Explore Features", "استكشف الميزات")}
            </Link>

            <Link href="/library" className="secondaryBtn">
              {text("Open Learning Hub", "فتح مركز التعلّم")}
            </Link>
          </div>
        </section>

        <section className="homeLearningStrip">
          <div>
            <p className="ohMetricLabel">
              {text("Health learning starts here", "التعلّم الصحي يبدأ هنا")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Find articles by marker, organ system, or report topic.",
                "اعثر على مقالات حسب المؤشر أو العضو أو موضوع التقرير."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "The Health Learning Hub helps visitors understand common lab markers, organ systems, report language, and doctor-visit preparation.",
                "يساعد مركز التعلّم الصحي الزوار على فهم مؤشرات المختبر الشائعة، أجهزة الجسم، لغة التقارير، والتحضير لزيارة الطبيب."
              )}
            </p>

            <div className="ohButtonRow" style={{ marginTop: "18px" }}>
              <Link href="/library" className="primaryBtn">
                {text("Open Health Learning Hub", "فتح مركز التعلّم الصحي")}
              </Link>

              <Link href="/blog" className="secondaryBtn">
                {text("Search Articles", "البحث في المقالات")}
              </Link>
            </div>
          </div>

          <div className="homeLearningCloud">
            {["LDL", "HDL", "HbA1c", "Creatinine", "eGFR", "ALT", "AST", "Blood Pressure"].map((item) => (
              <span className="homeLearningChip" key={item}>
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="ohActionPanel">
          <div className="ohCardHeader" style={{ marginBottom: 0 }}>
            <div>
              <p className="ohMetricLabel">
                {text("Start your private health workspace", "ابدأ مساحتك الصحية الخاصة")}
              </p>

              <h2 className="ohCardTitle" style={{ fontSize: "1.7rem" }}>
                {text(
                  "Create your account and organize your health journey with more clarity.",
                  "أنشئ حسابك ونظّم رحلتك الصحية بوضوح أكبر."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Save assessments, reports, educational context, and health preparation inside your OrganHeal workspace.",
                  "احفظ التقييمات، التقارير، السياق التعليمي، والتحضير الصحي داخل مساحة OrganHeal الخاصة بك."
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


