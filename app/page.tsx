"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getReportsLibrary,
  type ReportsLibraryCard,
} from "@/lib/services/reports/reports.service";

type Language = "en" | "ar";

type TrustCard = {
  label: string;
  title: string;
  description: string;
};


type InsightCard = {
  label: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
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
  const [latestReport, setLatestReport] =
    useState<ReportsLibraryCard | null>(null);
  const [continuationLoading, setContinuationLoading] = useState(false);

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

  function formatHomeDate(value?: string | null) {
    if (!value) {
      return text("Date unavailable", "التاريخ غير متوفر");
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return text("Date unavailable", "التاريخ غير متوفر");
    }

    return new Intl.DateTimeFormat(isArabic ? "ar" : "en", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  }

  async function checkUser() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    setIsLoggedIn(Boolean(user));

    if (!user) {
      setLatestReport(null);
      setContinuationLoading(false);
      return;
    }

    setContinuationLoading(true);

    try {
      const reports = await getReportsLibrary(user.id, 1);
      setLatestReport(reports[0] ?? null);
    } catch {
      setLatestReport(null);
    } finally {
      setContinuationLoading(false);
    }
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

  const insightCards: InsightCard[] = [
  {
    label: "LAB",
    title: text(
      "Lab Tests & Biomarkers",
      "تحاليل المختبر والمؤشرات"
    ),
    description: text(
      "Understand blood tests, biomarkers, normal ranges, and what common laboratory values may indicate.",
      "تعرّف على تحاليل الدم والمؤشرات الحيوية والقيم الطبيعية وما قد تعنيه النتائج الشائعة."
    ),
    href: "/library",
    actionLabel: text("Browse Lab Topics", "استكشف التحاليل"),
  },
  {
    label: "ORGAN",
    title: text(
      "Organ Health Library",
      "مكتبة صحة الأعضاء"
    ),
    description: text(
      "Explore heart, kidney, liver, lung, brain, and metabolic health in patient-friendly language.",
      "استكشف صحة القلب والكلى والكبد والرئة والدماغ والتمثيل الغذائي بلغة مبسطة."
    ),
    href: "/library/organs",
    actionLabel: text("Explore Organs", "استكشف الأعضاء"),
  },
  {
    label: "REPORT",
    title: text(
      "Medical Reports",
      "فهم التقارير الطبية"
    ),
    description: text(
      "Learn how laboratory and medical reports are structured before reviewing your own results.",
      "تعرّف على طريقة قراءة التقارير الطبية قبل مراجعة نتائجك الشخصية."
    ),
    href: "/library/reports",
    actionLabel: text("Learn Reports", "تعلّم التقارير"),
  },
  {
    label: "VISIT",
    title: text(
      "Doctor Visit Preparation",
      "التحضير لزيارة الطبيب"
    ),
    description: text(
      "Organize questions, understand findings, and prepare for a more productive appointment.",
      "نظّم أسئلتك وافهم نتائجك واستعد لموعد طبي أكثر فائدة."
    ),
    href: "/library/doctor-prep",
    actionLabel: text("Prepare Visit", "استعد للزيارة"),
  },
];

  const homeHealthFocus = !isLoggedIn
    ? null
    : continuationLoading
      ? {
          title: text(
            "Loading your latest health activity.",
            "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0623\u062d\u062f\u062b \u0646\u0634\u0627\u0637\u0643 \u0627\u0644\u0635\u062d\u064a."
          ),
          description: text(
            "OrganHeal is connecting your latest report and intelligence status.",
            "\u064a\u0642\u0648\u0645 OrganHeal \u0628\u0631\u0628\u0637 \u0623\u062d\u062f\u062b \u062a\u0642\u0631\u064a\u0631 \u0628\u062d\u0627\u0644\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0635\u062d\u064a."
          ),
        }
      : !latestReport
        ? {
            title: text(
              "Start with your first health report.",
              "\u0627\u0628\u062f\u0623 \u0628\u0623\u0648\u0644 \u062a\u0642\u0631\u064a\u0631 \u0635\u062d\u064a."
            ),
            description: text(
              "Upload a medical document to begin building your private health intelligence workspace.",
              "\u0627\u0631\u0641\u0639 \u0645\u0633\u062a\u0646\u062f\u064b\u0627 \u0637\u0628\u064a\u064b\u0627 \u0644\u0628\u062f\u0621 \u0628\u0646\u0627\u0621 \u0645\u0633\u0627\u062d\u0629 \u0630\u0643\u0627\u0626\u0643 \u0627\u0644\u0635\u062d\u064a \u0627\u0644\u062e\u0627\u0635\u0629."
            ),
          }
        : latestReport.extractionStatus === "Processing"
          ? {
              title: text(
                "Your latest report is being prepared.",
                "\u062c\u0627\u0631\u064a \u062a\u062c\u0647\u064a\u0632 \u0623\u062d\u062f\u062b \u062a\u0642\u0631\u064a\u0631 \u0644\u062f\u064a\u0643."
              ),
              description: text(
                "OrganHeal is processing the document before health intelligence can be generated.",
                "\u064a\u0642\u0648\u0645 OrganHeal \u0628\u0645\u0639\u0627\u0644\u062c\u0629 \u0627\u0644\u0645\u0633\u062a\u0646\u062f \u0642\u0628\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0635\u062d\u064a."
              ),
            }
          : latestReport.hasSavedAnalysis
            ? {
                title: text(
                  "Your latest health intelligence is ready.",
                  "\u0623\u062d\u062f\u062b \u0630\u0643\u0627\u0621 \u0635\u062d\u064a \u0644\u062f\u064a\u0643 \u062c\u0627\u0647\u0632."
                ),
                description:
                  latestReport.nextBestAction ||
                  text(
                    "Review the important findings and continue with your recommended next health step.",
                    "\u0631\u0627\u062c\u0639 \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0645\u0647\u0645\u0629 \u0648\u062a\u0627\u0628\u0639 \u062e\u0637\u0648\u062a\u0643 \u0627\u0644\u0635\u062d\u064a\u0629 \u0627\u0644\u062a\u0627\u0644\u064a\u0629 \u0627\u0644\u0645\u0648\u0635\u0649 \u0628\u0647\u0627."
                  ),
              }
            : {
                title: text(
                  "Your latest report is ready for analysis.",
                  "\u0623\u062d\u062f\u062b \u062a\u0642\u0631\u064a\u0631 \u0644\u062f\u064a\u0643 \u062c\u0627\u0647\u0632 \u0644\u0644\u062a\u062d\u0644\u064a\u0644."
                ),
                description: text(
                  "Generate health intelligence from the report and identify the next action that matters.",
                  "\u0623\u0646\u0634\u0626 \u0630\u0643\u0627\u0621\u064b \u0635\u062d\u064a\u064b\u0627 \u0645\u0646 \u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0648\u062d\u062f\u062f \u0627\u0644\u062e\u0637\u0648\u0629 \u0627\u0644\u062a\u0627\u0644\u064a\u0629 \u0627\u0644\u0623\u0647\u0645."
                ),
              };
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
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .publicHomePage .homePreviewCard {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 280px;
          border-top: 5px solid #14b8a6;
        }

        .publicHomePage .homePreviewCard .ohButtonRow {
          width: 100%;
        }

        .publicHomePage .homePreviewCard .secondaryBtn {
          min-width: 170px;
          justify-content: center;
        }

        .publicHomePage .homeSignOutBtn {
          color: #ffffff;
          background: #334155;
          border-color: #334155;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);
        }

        .publicHomePage .homeSignOutBtn:hover {
          color: #ffffff;
          background: #1e293b;
          border-color: #1e293b;
          transform: translateY(-1px);
        }

        .publicHomePage .homeLearningFooter {
          display: grid;
          grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr);
          gap: 24px;
          align-items: center;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid rgba(15, 118, 110, 0.16);
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

        .publicHomePage .homeCommandHero {
          padding: clamp(24px, 4vw, 48px);
          border: 1px solid rgba(148, 163, 184, 0.18);
          background:
            radial-gradient(circle at 8% 8%, rgba(20, 184, 166, 0.17), transparent 30%),
            radial-gradient(circle at 92% 12%, rgba(37, 99, 235, 0.14), transparent 32%),
            linear-gradient(145deg, #ffffff 0%, #f8fbff 52%, #f0fdfa 100%);
          box-shadow: 0 34px 90px rgba(15, 23, 42, 0.1);
        }

        .publicHomePage .homeCommandGrid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(420px, 1.08fr);
          gap: clamp(30px, 5vw, 72px);
          align-items: center;
        }

        .publicHomePage .homeCommandIntro {
          min-width: 0;
        }

        .publicHomePage .homeCommandBadge {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 8px 12px;
          border: 1px solid rgba(15, 118, 110, 0.2);
          border-radius: 999px;
          background: rgba(240, 253, 250, 0.82);
          color: #0f766e;
          font-size: 0.78rem;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .publicHomePage .homeCommandBadgeDot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #14b8a6;
          box-shadow: 0 0 0 6px rgba(20, 184, 166, 0.12);
        }

        .publicHomePage .homeCommandTitle {
          max-width: 760px;
          margin-top: 22px;
          font-size: clamp(2.75rem, 5.4vw, 5.6rem);
          line-height: 0.98;
          letter-spacing: -0.055em;
        }

        .publicHomePage .homeCommandLead {
          max-width: 700px;
          margin-top: 22px;
          font-size: clamp(1rem, 1.35vw, 1.18rem);
          line-height: 1.8;
        }

        .publicHomePage .homePrimaryActions {
          display: flex;
          flex-wrap: wrap;
          align-items: stretch;
          gap: 12px;
          margin-top: 28px;
        }

        .publicHomePage .homeUploadAction {
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          gap: 12px;
          min-width: min(100%, 300px);
          padding: 13px 18px;
        }

        .publicHomePage .homeUploadAction span:last-child {
          display: grid;
          gap: 2px;
          text-align: start;
        }

        .publicHomePage .homeUploadAction small {
          color: rgba(255, 255, 255, 0.78);
          font-size: 0.72rem;
          font-weight: 700;
        }

        .publicHomePage .homeActionIcon {
          display: grid;
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          place-items: center;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.16);
          font-size: 1.2rem;
        }

        .publicHomePage .homeSecondaryAction {
          display: inline-flex;
          min-height: 62px;
          align-items: center;
          justify-content: center;
        }

        .publicHomePage .homePrimaryActions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: stretch;
        }

        .publicHomePage .homePrimaryActions .homeSecondaryAction {
          min-height: 52px;
          justify-content: center;
        }

        .publicHomePage .homeContinuationCard {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 24px;
          align-items: center;
          padding: 24px 26px;
          border: 1px solid rgba(20, 184, 166, 0.22);
          border-radius: 24px;
          background:
            linear-gradient(
              135deg,
              rgba(240, 253, 250, 0.96),
              rgba(255, 255, 255, 0.98)
            );
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.06);
        }

        .publicHomePage .homeContinuationMain {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .publicHomePage .homeContinuationEyebrow {
          margin: 0;
          color: #0f766e;
          font-size: 0.76rem;
          font-weight: 900;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .publicHomePage .homeContinuationTitle {
          margin: 0;
          color: var(--oh-text);
          font-size: clamp(1.2rem, 2vw, 1.55rem);
          line-height: 1.25;
          overflow-wrap: anywhere;
        }

        .publicHomePage .homeContinuationMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 14px;
          color: var(--oh-muted);
          font-size: 0.9rem;
          font-weight: 700;
        }

        .publicHomePage .homeContinuationStatus {
          color: #0f766e;
        }

        .publicHomePage .homeContinuationDescription {
          max-width: 760px;
          margin: 2px 0 0;
          color: var(--oh-muted);
          line-height: 1.65;
        }

        .publicHomePage .homeContinuationAction {
          min-width: 190px;
          justify-content: center;
          white-space: nowrap;
        }

        .publicHomePage .homePrivacyPromise {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          padding: 15px;
          border: 1px solid rgba(15, 118, 110, 0.16);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.72);
        }

        .publicHomePage .homePrivacyIcon {
          display: grid;
          width: 32px;
          height: 32px;
          flex: 0 0 32px;
          place-items: center;
          border-radius: 10px;
          background: #dcfce7;
          color: #15803d;
          font-weight: 950;
        }

        .publicHomePage .homePrivacyPromise strong {
          color: #0f172a;
          font-size: 0.91rem;
        }

        .publicHomePage .homePrivacyPromise p {
          margin: 4px 0 0;
          color: #526077;
          font-size: 0.78rem;
          line-height: 1.55;
        }

        .publicHomePage .homeJourneyPreview {
          display: grid;
          grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
          align-items: center;
          gap: 8px;
          margin-top: 26px;
        }

        .publicHomePage .homeJourneyItem {
          display: grid;
          gap: 3px;
          min-width: 0;
        }

        .publicHomePage .homeJourneyItem span {
          color: #0f766e;
          font-size: 0.68rem;
          font-weight: 950;
        }

        .publicHomePage .homeJourneyItem strong {
          color: #334155;
          font-size: 0.78rem;
          line-height: 1.3;
        }

        .publicHomePage .homeJourneyConnector {
          color: #94a3b8;
          font-size: 0.86rem;
          font-weight: 900;
        }

        [dir="rtl"] .publicHomePage .homeJourneyConnector {
          transform: rotate(180deg);
        }

        .publicHomePage .homeAICommandCard {
          position: relative;
          min-width: 0;
          overflow: hidden;
          padding: clamp(22px, 3vw, 32px);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 30px;
          background:
            radial-gradient(circle at 90% 4%, rgba(45, 212, 191, 0.18), transparent 29%),
            linear-gradient(150deg, #0f172a 0%, #152238 58%, #102c32 100%);
          color: #ffffff;
          box-shadow: 0 32px 76px rgba(15, 23, 42, 0.24);
        }

        .publicHomePage .homeAICommandHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .publicHomePage .homeAICommandEyebrow {
          margin: 0;
          color: #5eead4;
          font-size: 0.72rem;
          font-weight: 950;
          letter-spacing: 0.12em;
        }

        .publicHomePage .homeAICommandHeader h2 {
          margin: 9px 0 0;
          max-width: 520px;
          color: #ffffff;
          font-size: clamp(1.55rem, 2.4vw, 2.3rem);
          line-height: 1.15;
          letter-spacing: -0.035em;
        }

        .publicHomePage .homeAILiveBadge {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border: 1px solid rgba(94, 234, 212, 0.22);
          border-radius: 999px;
          background: rgba(15, 118, 110, 0.22);
          color: #ccfbf1;
          font-size: 0.7rem;
          font-weight: 900;
        }

        .publicHomePage .homeAILiveBadge span {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #5eead4;
          box-shadow: 0 0 0 5px rgba(94, 234, 212, 0.12);
        }

        .publicHomePage .homeAICommandDescription {
          margin: 17px 0 0;
          color: #cbd5e1;
          font-size: 0.91rem;
          line-height: 1.7;
        }

        .publicHomePage .homeAISuggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 18px;
        }

        .publicHomePage .homeAISuggestion {
          appearance: none;
          padding: 8px 11px;
          border: 1px solid rgba(148, 163, 184, 0.23);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.07);
          color: #e2e8f0;
          font: inherit;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          transition:
            border-color 160ms ease,
            background 160ms ease,
            transform 160ms ease;
        }

        .publicHomePage .homeAISuggestion:hover {
          transform: translateY(-1px);
          border-color: rgba(94, 234, 212, 0.46);
          background: rgba(20, 184, 166, 0.14);
        }

        .publicHomePage .homeAIComposer {
          margin-top: 18px;
          padding: 10px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.97);
        }

        .publicHomePage .homeAITextarea {
          min-height: 112px;
          resize: vertical;
          border: 0;
          box-shadow: none;
          background: transparent;
          font-weight: 650;
          line-height: 1.55;
        }

        .publicHomePage .homeAITextarea:focus {
          border: 0;
          box-shadow: none;
        }

        .publicHomePage .homeAIComposerActions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 9px;
          border-top: 1px solid rgba(148, 163, 184, 0.16);
        }

        .publicHomePage .homeAttachAction {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #475569;
          font-size: 0.77rem;
          font-weight: 900;
        }

        .publicHomePage .homeAttachAction span {
          font-size: 1.1rem;
          color: #0f766e;
        }

        .publicHomePage .homeAskAction {
          min-height: 42px;
          padding: 10px 15px;
        }

        .publicHomePage .homeAskAction:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .publicHomePage .homeAIAnswer {
          margin-top: 16px;
          padding: 16px;
          border: 1px solid rgba(94, 234, 212, 0.2);
          border-radius: 18px;
          background: rgba(15, 118, 110, 0.13);
        }

        .publicHomePage .homeAIAnswerHeader {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .publicHomePage .homeAIAnswerHeader span {
          display: grid;
          width: 30px;
          height: 30px;
          place-items: center;
          border-radius: 10px;
          background: #14b8a6;
          color: #042f2e;
          font-size: 0.68rem;
          font-weight: 950;
        }

        .publicHomePage .homeAIAnswer p {
          margin: 11px 0 0;
          color: #e2e8f0;
          font-size: 0.85rem;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .publicHomePage .homeAIOutcomePanel {
          margin-top: 18px;
          padding: 15px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.05);
        }

        .publicHomePage .homeAIOutcomePanel > p {
          margin: 0;
          color: #94a3b8;
          font-size: 0.7rem;
          font-weight: 900;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .publicHomePage .homeAIOutcomeGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 11px;
        }

        .publicHomePage .homeAIOutcomeGrid span {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 10px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
          color: #e2e8f0;
          font-size: 0.73rem;
          font-weight: 800;
        }

        .publicHomePage .homeAIOutcomeGrid span::before {
          content: "✓";
          color: #5eead4;
          font-weight: 950;
        }

        .publicHomePage .homeAIPrivacyNote {
          margin: 14px 0 0;
          color: #94a3b8;
          font-size: 0.7rem;
          line-height: 1.55;
          text-align: center;
        }

        .publicHomePage .homeMissionSection {
          position: relative;
          overflow: hidden;
          padding: clamp(24px, 4vw, 40px);
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 30px;
          background:
            radial-gradient(circle at 96% 0%, rgba(37, 99, 235, 0.1), transparent 28%),
            linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.07);
        }

        .publicHomePage .homeMissionHeader {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .publicHomePage .homeMissionTitle {
          max-width: 800px;
          margin: 8px 0 0;
          color: #0f172a;
          font-size: clamp(1.8rem, 3.4vw, 3.15rem);
          line-height: 1.08;
          letter-spacing: -0.045em;
        }

        .publicHomePage .homeMissionLead {
          max-width: 760px;
          margin: 13px 0 0;
          color: #64748b;
          font-size: 0.96rem;
          line-height: 1.7;
        }

        .publicHomePage .homeMissionAIStatus {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 11px;
          padding: 12px 14px;
          border: 1px solid rgba(20, 184, 166, 0.18);
          border-radius: 16px;
          background: #f0fdfa;
        }

        .publicHomePage .homeMissionAIStatus > span {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #14b8a6;
          box-shadow: 0 0 0 7px rgba(20, 184, 166, 0.12);
        }

        .publicHomePage .homeMissionAIStatus div {
          display: grid;
          gap: 2px;
        }

        .publicHomePage .homeMissionAIStatus strong {
          color: #115e59;
          font-size: 0.78rem;
        }

        .publicHomePage .homeMissionAIStatus small {
          color: #64748b;
          font-size: 0.68rem;
          font-weight: 700;
        }

        .publicHomePage .homeMissionGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .publicHomePage .homeMissionCard {
          position: relative;
          display: flex;
          min-height: 264px;
          gap: 15px;
          overflow: hidden;
          padding: 20px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 22px;
          background: #ffffff;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.045);
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .publicHomePage .homeMissionCard:hover {
          transform: translateY(-4px);
          border-color: rgba(20, 184, 166, 0.42);
          box-shadow: 0 20px 44px rgba(15, 23, 42, 0.09);
        }

        .publicHomePage .homeMissionCard.featured {
          border-color: rgba(20, 184, 166, 0.28);
          background:
            radial-gradient(circle at 100% 0%, rgba(20, 184, 166, 0.14), transparent 35%),
            linear-gradient(145deg, #f0fdfa 0%, #ffffff 70%);
        }

        .publicHomePage .homeMissionIcon {
          display: grid;
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          place-items: center;
          border-radius: 14px;
          background: #e6fffb;
          color: #0f766e;
          font-size: 0.72rem;
          font-weight: 950;
          letter-spacing: -0.02em;
        }

        .publicHomePage .homeMissionContent {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
        }

        .publicHomePage .homeMissionType {
          color: #0f766e;
          font-size: 0.64rem;
          font-weight: 950;
          letter-spacing: 0.08em;
        }

        .publicHomePage .homeMissionContent h3 {
          margin: 9px 0 0;
          color: #0f172a;
          font-size: 1.06rem;
          line-height: 1.35;
          letter-spacing: -0.02em;
        }

        .publicHomePage .homeMissionContent p {
          margin: 10px 0 0;
          color: #64748b;
          font-size: 0.79rem;
          line-height: 1.62;
        }

        .publicHomePage .homeMissionAction {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: auto;
          padding-top: 18px;
          color: #0f766e;
          font-size: 0.76rem;
          font-weight: 950;
        }

        [dir="rtl"] .publicHomePage .homeMissionAction span {
          transform: rotate(180deg);
        }

        .publicHomePage .homeMissionFuture {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 15px;
          margin-top: 18px;
          padding: 16px 18px;
          border: 1px solid rgba(99, 102, 241, 0.16);
          border-radius: 20px;
          background:
            radial-gradient(circle at 95% 50%, rgba(99, 102, 241, 0.1), transparent 27%),
            #f8fafc;
        }

        .publicHomePage .homeMissionFutureIcon {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          border-radius: 14px;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 0.8rem;
        }

        .publicHomePage .homeMissionFuture strong {
          color: #1e293b;
          font-size: 0.88rem;
        }

        .publicHomePage .homeMissionFuture p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 0.75rem;
          line-height: 1.55;
        }

        .publicHomePage .homeMissionComingSoon {
          padding: 7px 10px;
          border-radius: 999px;
          background: #eef2ff;
          color: #4338ca;
          font-size: 0.68rem;
          font-weight: 950;
          white-space: nowrap;
        }

        @media (max-width: 1050px) {
          .publicHomePage .homeMissionGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .publicHomePage .homeMissionHeader {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 680px) {
          .publicHomePage .homeMissionGrid {
            grid-template-columns: 1fr;
          }

          .publicHomePage .homeMissionCard {
            min-height: 230px;
          }

          .publicHomePage .homeMissionFuture {
            grid-template-columns: auto 1fr;
          }

          .publicHomePage .homeMissionComingSoon {
            grid-column: 1 / -1;
            width: fit-content;
          }
        }
        .publicHomePage .homeMissionGridCompact {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .publicHomePage .homeMissionGridCompact .homeMissionCard {
          min-height: 224px;
        }

        .publicHomePage .homeMissionGridCompact .homeMissionContent p {
          max-width: 500px;
        }

        @media (max-width: 760px) {
          .publicHomePage .homeMissionGridCompact {
            grid-template-columns: 1fr;
          }

          .publicHomePage .homeMissionGridCompact .homeMissionCard {
            min-height: 210px;
          }
        }
        .publicHomePage .homeSignOutBtn {
          color: #ffffff;
          background: #334155;
          border-color: #334155;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);
        }

        .publicHomePage .homeSignOutBtn:hover {
          color: #ffffff;
          background: #1e293b;
          border-color: #1e293b;
          transform: translateY(-1px);
        }

        @media (max-width: 1100px) {
          .publicHomePage .homeCommandGrid,
          .publicHomePage .homeLearningFooter {
            grid-template-columns: 1fr;
          }

          .publicHomePage .homePreviewGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .publicHomePage .homeContinuationCard {
            grid-template-columns: 1fr;
            align-items: stretch;
          }

          .publicHomePage .homeContinuationAction {
            width: 100%;
          }
          .publicHomePage .homePrimaryActions,
          .publicHomePage .homeAIComposerActions {
            align-items: stretch;
            flex-direction: column;
          }

          .publicHomePage .homeUploadAction,
          .publicHomePage .homeSecondaryAction,
          .publicHomePage .homeAskAction {
            width: 100%;
          }

          .publicHomePage .homeJourneyPreview {
            grid-template-columns: 1fr;
            gap: 7px;
          }

          .publicHomePage .homeJourneyConnector {
            display: none;
          }

          .publicHomePage .homeJourneyItem {
            grid-template-columns: auto 1fr;
            align-items: center;
            gap: 10px;
            padding: 8px 0;
            border-bottom: 1px solid rgba(148, 163, 184, 0.16);
          }

          .publicHomePage .homeAICommandHeader {
            flex-direction: column;
          }

          .publicHomePage .homeAIOutcomeGrid {
            grid-template-columns: 1fr;
          }
        }
        .publicHomePage .homeSignOutBtn {
          color: #ffffff;
          background: #334155;
          border-color: #334155;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);
        }

        .publicHomePage .homeSignOutBtn:hover {
          color: #ffffff;
          background: #1e293b;
          border-color: #1e293b;
          transform: translateY(-1px);
        }

        @media (max-width: 1100px) {
          .publicHomePage .homeCommandGrid,
          .publicHomePage .homeLearningFooter {
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

          .publicHomePage .ohButtonRow,
          .publicHomePage .homePrimaryActions {
            width: 100%;
          }

          .publicHomePage .homePrimaryActions > a {
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
        <section className="ohHero homeHero homeCommandHero">
          <div className="homeCommandGrid">
            <div className="homeCommandIntro">
              <div className="homeCommandBadge">
                <span className="homeCommandBadgeDot" aria-hidden="true" />
                {isLoggedIn
                  ? text(
                      "Welcome back to your health workspace",
                      "مرحبًا بعودتك إلى مساحتك الصحية"
                    )
                  : text(
                      "Your private AI health workspace",
                      "مساحتك الصحية الخاصة المدعومة بالذكاء الاصطناعي"
                    )}
              </div>

              <h1 className="ohTitle homeCommandTitle">
                {isLoggedIn
                  ? homeHealthFocus?.title
                  : text(
                      "Turn your health reports into clear next steps.",
                      "\u062d\u0648\u0651\u0644 \u062a\u0642\u0627\u0631\u064a\u0631\u0643 \u0627\u0644\u0635\u062d\u064a\u0629 \u0625\u0644\u0649 \u062e\u0637\u0648\u0627\u062a \u0648\u0627\u0636\u062d\u0629."
                    )}
              </h1>

              <p className="ohLead homeCommandLead">
                {isLoggedIn
                  ? homeHealthFocus?.description
                  : text(
                      "Upload a lab report or medical document. OrganHeal AI helps organize the findings, explain what matters, and guide you toward your next health decision.",
                      "\u0627\u0631\u0641\u0639 \u062a\u0642\u0631\u064a\u0631 \u0645\u062e\u062a\u0628\u0631 \u0623\u0648 \u0645\u0633\u062a\u0646\u062f\u064b\u0627 \u0637\u0628\u064a\u064b\u0627. \u064a\u0633\u0627\u0639\u062f\u0643 OrganHeal AI \u0639\u0644\u0649 \u062a\u0646\u0638\u064a\u0645 \u0627\u0644\u0646\u062a\u0627\u0626\u062c\u060c \u0648\u0641\u0647\u0645 \u0645\u0627 \u064a\u0647\u0645\u060c \u0648\u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0642\u0631\u0627\u0631\u0643 \u0627\u0644\u0635\u062d\u064a \u0627\u0644\u062a\u0627\u0644\u064a."
                    )}
              </p>

              <div className="homePrimaryActions">
                {isLoggedIn ? (
                  <>
                    <Link href="/dashboard" className="primaryBtn homeUploadAction">
                      <span className="homeActionIcon" aria-hidden="true">→</span>
                      <span>
                        <strong>
                          {text("Open Dashboard", "فتح لوحة التحكم")}
                        </strong>
                        <small>
                          {text(
                            "Continue your health workspace",
                            "تابع مساحتك الصحية"
                          )}
                        </small>
                      </span>
                    </Link>

                    <Link href="/reports" className="secondaryBtn homeSecondaryAction">
                      {text("My Reports", "تقاريري")}
                    </Link>

                    <Link href="/intelligence" className="secondaryBtn homeSecondaryAction">
                      {text("Intelligence", "الذكاء الصحي")}
                    </Link>

                    <Link href="/lab-upload" className="secondaryBtn homeSecondaryAction">
                      {text("Upload New Report", "رفع تقرير جديد")}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/lab-upload" className="primaryBtn homeUploadAction">
                      <span className="homeActionIcon" aria-hidden="true">↑</span>
                      <span>
                        <strong>
                          {text("Upload & Analyze Report", "رفع التقرير وتحليله")}
                        </strong>
                        <small>
                          {text(
                            "PDF, image, or medical document",
                            "PDF أو صورة أو مستند طبي"
                          )}
                        </small>
                      </span>
                    </Link>

                    <Link href="/signup" className="secondaryBtn homeSecondaryAction">
                      {text("Create Private Workspace", "إنشاء مساحة خاصة")}
                    </Link>
                  </>
                )}
              </div>

              <div className="homePrivacyPromise">
                <span className="homePrivacyIcon" aria-hidden="true">✓</span>

                <div>
                  <strong>
                    {text("Private by design", "الخصوصية جزء من التصميم")}
                  </strong>

                  <p>
                    {text(
                      "Your reports, conversations, and health workspace are connected to your account and are not visible to other users.",
                      "تقاريرك ومحادثاتك ومساحتك الصحية مرتبطة بحسابك ولا تظهر للمستخدمين الآخرين."
                    )}
                  </p>
                </div>
              </div>

              <div className="homeJourneyPreview" aria-label={text(
                "Report analysis journey",
                "رحلة تحليل التقرير"
              )}>
                <div className="homeJourneyItem">
                  <span>01</span>
                  <strong>{text("Upload", "ارفع")}</strong>
                </div>

                <div className="homeJourneyConnector" aria-hidden="true">→</div>

                <div className="homeJourneyItem">
                  <span>02</span>
                  <strong>{text("AI Analysis", "تحليل ذكي")}</strong>
                </div>

                <div className="homeJourneyConnector" aria-hidden="true">→</div>

                <div className="homeJourneyItem">
                  <span>03</span>
                  <strong>{text("Health Intelligence", "ذكاء صحي")}</strong>
                </div>

                <div className="homeJourneyConnector" aria-hidden="true">→</div>

                <div className="homeJourneyItem">
                  <span>04</span>
                  <strong>{text("Next Action", "الخطوة التالية")}</strong>
                </div>
              </div>
            </div>

            <aside
              className="homeAICommandCard"
              aria-label={text(
                "Ask OrganHeal AI",
                "اسأل OrganHeal AI"
              )}
            >
              <div className="homeAICommandHeader">
                <div>
                  <p className="homeAICommandEyebrow">
                    {text("ASK ORGANHEAL AI", "اسأل ORGANHEAL AI")}
                  </p>

                  <h2>
                    {text(
                      "What do you need help with today?",
                      "بماذا تحتاج المساعدة اليوم؟"
                    )}
                  </h2>
                </div>

                <span className="homeAILiveBadge">
                  <span aria-hidden="true" />
                  {text("AI ready", "الذكاء جاهز")}
                </span>
              </div>

              <p className="homeAICommandDescription">
                {text(
                  "Start with a question. OrganHeal can help you understand a result, prepare for a visit, or guide you to the right part of your health workspace.",
                  "ابدأ بسؤال. يستطيع OrganHeal مساعدتك على فهم نتيجة، أو التحضير لزيارة، أو توجيهك إلى الجزء المناسب من مساحتك الصحية."
                )}
              </p>

              <div className="homeAISuggestions">
                {[
                  text(
                    "Explain my blood test",
                    "اشرح فحص الدم الخاص بي"
                  ),
                  text(
                    "What should I ask my doctor?",
                    "ماذا يجب أن أسأل طبيبي؟"
                  ),
                  text(
                    "Compare my latest reports",
                    "قارن أحدث تقاريري"
                  ),
                  text(
                    "Show my top health priority",
                    "أظهر أهم أولوية صحية لدي"
                  ),
                ].map((suggestion) => (
                  <button
                    type="button"
                    className="homeAISuggestion"
                    key={suggestion}
                    onClick={() => setHeroQuestion(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <div className="homeAIComposer">
                <textarea
                  className="homeHeroInput homeAITextarea"
                  value={heroQuestion}
                  onChange={(event) => setHeroQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();
                      askHeroAI();
                    }
                  }}
                  placeholder={text(
                    "Ask about a result, report, symptom question, or your next step...",
                    "اسأل عن نتيجة أو تقرير أو سؤال صحي أو خطوتك التالية..."
                  )}
                  rows={4}
                />

                <div className="homeAIComposerActions">
                  <Link href="/lab-upload" className="homeAttachAction">
                    <span aria-hidden="true">＋</span>
                    {text("Attach report", "إرفاق تقرير")}
                  </Link>

                  <button
                    type="button"
                    className="primaryBtn homeAskAction"
                    onClick={askHeroAI}
                    disabled={heroLoading || !heroQuestion.trim()}
                  >
                    {heroLoading
                      ? text("Thinking...", "جاري التفكير...")
                      : text("Ask OrganHeal AI", "اسأل OrganHeal AI")}
                  </button>
                </div>
              </div>

              {heroAnswer && (
                <div className="homeAIAnswer">
                  <div className="homeAIAnswerHeader">
                    <span aria-hidden="true">AI</span>
                    <strong>
                      {text("OrganHeal response", "إجابة OrganHeal")}
                    </strong>
                  </div>

                  <p>{heroAnswer}</p>
                </div>
              )}

              <div className="homeAIOutcomePanel">
                <p>
                  {text(
                    "Your connected OrganHeal journey",
                    "رحلتك المترابطة داخل OrganHeal"
                  )}
                </p>

                <div className="homeAIOutcomeGrid">
                  <span>{text("Report organized", "تنظيم التقرير")}</span>
                  <span>{text("Key findings", "النتائج المهمة")}</span>
                  <span>{text("Doctor questions", "أسئلة الطبيب")}</span>
                  <span>{text("Next best action", "أفضل خطوة تالية")}</span>
                </div>
              </div>

              <p className="homeAIPrivacyNote">
                {text(
                  "OrganHeal provides educational health intelligence and does not replace licensed medical care.",
                  "يقدم OrganHeal ذكاءً صحيًا تثقيفيًا ولا يستبدل الرعاية الطبية المرخصة."
                )}
              </p>
            </aside>
          </div>
        </section>
        {isLoggedIn && (
          <section
            className="homeContinuationCard"
            aria-label={text(
              "Continue where you left off",
              "تابع من حيث توقفت"
            )}
          >
            <div className="homeContinuationMain">
              <p className="homeContinuationEyebrow">
                {text(
                  "Continue where you left off",
                  "تابع من حيث توقفت"
                )}
              </p>

              {continuationLoading ? (
                <>
                  <h2 className="homeContinuationTitle">
                    {text(
                      "Loading your latest health activity...",
                      "جاري تحميل أحدث نشاط صحي..."
                    )}
                  </h2>

                  <p className="homeContinuationDescription">
                    {text(
                      "OrganHeal is connecting your latest report and intelligence status.",
                      "يقوم OrganHeal بربط أحدث تقرير بحالة الذكاء الصحي."
                    )}
                  </p>
                </>
              ) : latestReport ? (
                <>
                  <h2 className="homeContinuationTitle">
                    {latestReport.hasSavedAnalysis
                      ? text(
                          "Review your latest health intelligence.",
                          "\u0631\u0627\u062c\u0639 \u0623\u062d\u062f\u062b \u0630\u0643\u0627\u0621 \u0635\u062d\u064a \u0644\u062f\u064a\u0643."
                        )
                      : latestReport.extractionStatus === "Processing"
                        ? text(
                            "Your latest report is still processing.",
                            "\u0644\u0627 \u064a\u0632\u0627\u0644 \u0623\u062d\u062f\u062b \u062a\u0642\u0631\u064a\u0631 \u0644\u062f\u064a\u0643 \u0642\u064a\u062f \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629."
                          )
                        : text(
                            "Your latest report is ready for analysis.",
                            "\u0623\u062d\u062f\u062b \u062a\u0642\u0631\u064a\u0631 \u0644\u062f\u064a\u0643 \u062c\u0627\u0647\u0632 \u0644\u0644\u062a\u062d\u0644\u064a\u0644."
                          )}
                  </h2>

                  <div className="homeContinuationMeta">
                    <span>{latestReport.fileName}</span>

                    <span>
                      {formatHomeDate(latestReport.uploadedAt)}
                    </span>

                    <span>{latestReport.reportType}</span>

                    <span className="homeContinuationStatus">
                      {latestReport.hasSavedAnalysis
                        ? text(
                            "Intelligence ready",
                            "الذكاء الصحي جاهز"
                          )
                        : latestReport.extractionStatus === "Processing"
                          ? text(
                              "Report processing",
                              "التقرير قيد المعالجة"
                            )
                          : text(
                              "Ready for analysis",
                              "جاهز للتحليل"
                            )}
                    </span>
                  </div>

                  <p className="homeContinuationDescription">
                    {latestReport.nextBestAction ||
                      (latestReport.hasSavedAnalysis
                        ? text(
                            "Return to your saved intelligence and continue reviewing the important findings and next steps.",
                            "ارجع إلى الذكاء الصحي المحفوظ وتابع مراجعة النتائج المهمة والخطوات التالية."
                          )
                        : text(
                            "Continue to Intelligence to organize this report, understand the important findings, and identify your next action.",
                            "تابع إلى الذكاء الصحي لتنظيم هذا التقرير وفهم النتائج المهمة وتحديد خطوتك التالية."
                          ))}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="homeContinuationTitle">
                    {text(
                      "Start with your first health report.",
                      "ابدأ بأول تقرير صحي."
                    )}
                  </h2>

                  <p className="homeContinuationDescription">
                    {text(
                      "Upload a medical document to begin building your private health workspace.",
                      "ارفع مستندًا طبيًا لبدء بناء مساحتك الصحية الخاصة."
                    )}
                  </p>
                </>
              )}
            </div>

            {!continuationLoading && (
              <Link
                href={
                  latestReport
                    ? latestReport.extractionStatus === "Processing"
                      ? "/reports"
                      : latestReport.hasSavedAnalysis
                        ? `/intelligence?reportId=${latestReport.reportId}`
                        : `/intelligence?reportId=${latestReport.reportId}&auto=1`
                    : "/lab-upload"
                }
                className="primaryBtn homeContinuationAction"
              >
                {latestReport
                  ? latestReport.extractionStatus === "Processing"
                    ? text(
                        "View Report Status",
                        "\u0639\u0631\u0636 \u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u0642\u0631\u064a\u0631"
                      )
                    : latestReport.hasSavedAnalysis
                      ? text(
                          "Review Intelligence",
                          "\u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0635\u062d\u064a"
                        )
                      : text(
                          "Analyze Latest Report",
                          "\u062a\u062d\u0644\u064a\u0644 \u0623\u062d\u062f\u062b \u062a\u0642\u0631\u064a\u0631"
                        )
                  : text(
                      "Upload First Report",
                      "\u0631\u0641\u0639 \u0623\u0648\u0644 \u062a\u0642\u0631\u064a\u0631"
                    )}
              </Link>
            )}
          </section>
        )}
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

        <section className="homeMissionSection">
          <div className="homeMissionHeader">
            <div>
              <p className="ohMetricLabel">
                {text("START WITH YOUR GOAL", "ابدأ بهدفك")}
              </p>

              <h2 className="homeMissionTitle">
                {text(
                  "Choose what you need. OrganHeal guides the next step.",
                  "اختر ما تحتاجه، وسيقودك OrganHeal إلى الخطوة التالية."
                )}
              </h2>

              <p className="homeMissionLead">
                {text(
                  "You do not need to understand the whole platform. Start with the outcome you want today.",
                  "لست بحاجة إلى معرفة جميع أجزاء المنصة. ابدأ بالنتيجة التي تريدها اليوم."
                )}
              </p>
            </div>

            <div className="homeMissionAIStatus">
              <span aria-hidden="true" />

              <div>
                <strong>
                  {text("AI-guided journey", "رحلة موجهة بالذكاء الاصطناعي")}
                </strong>

                <small>
                  {text(
                    "One goal. One clear path.",
                    "هدف واحد ومسار واضح."
                  )}
                </small>
              </div>
            </div>
          </div>

          <div className="homeMissionGrid homeMissionGridCompact">
            <Link href="/lab-upload" className="homeMissionCard featured">
              <span className="homeMissionIcon" aria-hidden="true">01</span>

              <div className="homeMissionContent">
                <span className="homeMissionType">
                  {text("REPORT INTELLIGENCE", "ذكاء التقارير")}
                </span>

                <h3>
                  {text(
                    "Understand my report",
                    "أريد فهم تقريري"
                  )}
                </h3>

                <p>
                  {text(
                    "Upload a lab report or medical document and turn it into organized findings, clear explanations, and useful next questions.",
                    "ارفع تقرير مختبر أو مستندًا طبيًا وحوّله إلى نتائج منظمة وشرح واضح وأسئلة مفيدة."
                  )}
                </p>

                <span className="homeMissionAction">
                  {text("Upload and analyze", "ارفع وابدأ التحليل")}
                  <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>

            <Link href="/assistant" className="homeMissionCard">
              <span className="homeMissionIcon" aria-hidden="true">AI</span>

              <div className="homeMissionContent">
                <span className="homeMissionType">
                  {text("PERSONAL AI GUIDANCE", "إرشاد شخصي بالذكاء الاصطناعي")}
                </span>

                <h3>
                  {text(
                    "Ask about my health",
                    "أريد السؤال عن صحتي"
                  )}
                </h3>

                <p>
                  {text(
                    "Ask a health question and let OrganHeal guide you toward the right explanation, report, assessment, or next action.",
                    "اطرح سؤالًا صحيًا ودع OrganHeal يوجهك إلى الشرح أو التقرير أو التقييم أو الخطوة المناسبة."
                  )}
                </p>

                <span className="homeMissionAction">
                  {text("Open AI assistant", "افتح المساعد الذكي")}
                  <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>

            <Link href="/library/doctor-prep" className="homeMissionCard">
              <span className="homeMissionIcon" aria-hidden="true">02</span>

              <div className="homeMissionContent">
                <span className="homeMissionType">
                  {text("DOCTOR PREPARATION", "التحضير للطبيب")}
                </span>

                <h3>
                  {text(
                    "Prepare for my appointment",
                    "أريد الاستعداد لموعدي"
                  )}
                </h3>

                <p>
                  {text(
                    "Organize important findings and prepare focused questions before speaking with your clinician.",
                    "نظّم النتائج المهمة وحضّر أسئلة مركزة قبل التحدث مع المختص."
                  )}
                </p>

                <span className="homeMissionAction">
                  {text("Prepare my visit", "حضّر زيارتي")}
                  <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>

            <Link
              href={isLoggedIn ? "/history" : "/assessment"}
              className="homeMissionCard"
            >
              <span className="homeMissionIcon" aria-hidden="true">03</span>

              <div className="homeMissionContent">
                <span className="homeMissionType">
                  {text("HEALTH JOURNEY", "الرحلة الصحية")}
                </span>

                <h3>
                  {isLoggedIn
                    ? text(
                        "Continue my health journey",
                        "أريد متابعة رحلتي الصحية"
                      )
                    : text(
                        "Find where I should start",
                        "أريد معرفة من أين أبدأ"
                      )}
                </h3>

                <p>
                  {isLoggedIn
                    ? text(
                        "Review your saved reports, health history, and meaningful changes over time.",
                        "راجع تقاريرك المحفوظة وسجلك الصحي والتغيرات المهمة مع الوقت."
                      )
                    : text(
                        "Complete a guided assessment to identify the health area that may deserve attention first.",
                        "أكمل تقييمًا موجهًا لتحديد المجال الصحي الذي قد يستحق اهتمامك أولًا."
                      )}
                </p>

                <span className="homeMissionAction">
                  {isLoggedIn
                    ? text("Continue my journey", "تابع رحلتي")
                    : text("Start assessment", "ابدأ التقييم")}
                  <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
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

        <section className="homePreviewPanel">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Health Learning Hub", "مركز التعلّم الصحي")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Explore trusted health knowledge in one connected place.",
                  "استكشف المعرفة الصحية الموثوقة في مكان واحد مترابط."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Learn about lab markers, organ health, medical reports, and doctor-visit preparation before or after using OrganHeal AI.",
                  "تعلّم عن مؤشرات المختبر وصحة الأعضاء والتقارير الطبية والتحضير لزيارة الطبيب قبل أو بعد استخدام OrganHeal AI."
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

                <div
                  className="ohButtonRow"
                  style={{ marginTop: "auto", paddingTop: "16px" }}
                >
                  <Link href={insight.href} className="secondaryBtn">
                    {insight.actionLabel}
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="homeLearningFooter">
            <div>
              <p className="ohMetricLabel">
                {text("Popular health topics", "مواضيع صحية شائعة")}
              </p>

              <h3 className="ohCardTitle" style={{ fontSize: "1.22rem" }}>
                {text(
                  "Continue learning by marker, organ system, or report topic.",
                  "تابع التعلّم حسب المؤشر أو جهاز الجسم أو موضوع التقرير."
                )}
              </h3>

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
          </div>
        </section>

        <section className="ohActionPanel">
          <div className="ohCardHeader" style={{ marginBottom: 0 }}>
            <div>
              <p className="ohMetricLabel">
                {isLoggedIn
                  ? text(
                      "Continue your private health workspace",
                      "تابع مساحتك الصحية الخاصة"
                    )
                  : text(
                      "Start your private health workspace",
                      "ابدأ مساحتك الصحية الخاصة"
                    )}
              </p>

              <h2 className="ohCardTitle" style={{ fontSize: "1.7rem" }}>
                {isLoggedIn
                  ? text(
                      "Continue organizing your reports, insights, and next health steps.",
                      "تابع تنظيم تقاريرك ورؤاك وخطواتك الصحية القادمة."
                    )
                  : text(
                      "Create your account and organize your health journey with more clarity.",
                      "أنشئ حسابك ونظّم رحلتك الصحية بوضوح أكبر."
                    )}
              </h2>

              <p className="ohCardText">
                {isLoggedIn
                  ? text(
                      "Return to your dashboard to review saved reports, health context, and meaningful updates.",
                      "ارجع إلى لوحة التحكم لمراجعة التقارير المحفوظة والسياق الصحي والتحديثات المهمة."
                    )
                  : text(
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

                  <button
                    type="button"
                    className="secondaryBtn homeSignOutBtn"
                    onClick={signOut}
                  >
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


