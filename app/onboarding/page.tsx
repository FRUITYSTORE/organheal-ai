"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Language = "en" | "ar";

type OnboardingStep = {
  code: string;
  title: string;
  titleAr: string;
  text: string;
  textAr: string;
  href: string;
  action: string;
  actionAr: string;
  primary: boolean;
  estimated: string;
  estimatedAr: string;
  status: string;
  statusAr: string;
};

export default function OnboardingPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  const isArabic = language === "ar";

  useEffect(() => {
    function syncLanguage() {
      const savedLanguage =
        (localStorage.getItem("organheal-language") as Language | null) || "en";

      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
      document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
    }

    syncLanguage();
    loadUser();

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

  async function loadUser() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      window.location.href = "/login?next=/onboarding";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, email")
      .eq("id", userData.user.id)
      .maybeSingle();

    setUsername(profile?.username || userData.user.email || "User");
    setLoading(false);
  }

  const steps: OnboardingStep[] = [
    {
      code: "01",
      title: "Start with a health assessment",
      titleAr: "ابدأ بتقييم صحي",
      text:
        "Create your first health baseline so OrganHeal can organize your starting point.",
      textAr:
        "أنشئ أول نقطة بداية صحية حتى يستطيع OrganHeal تنظيم صورتك الصحية الأولى.",
      href: "/assessment",
      action: "Start Assessment",
      actionAr: "ابدأ التقييم",
      primary: true,
      estimated: "3–5 min",
      estimatedAr: "3–5 دقائق",
      status: "Ready",
      statusAr: "جاهز",
    },
    {
      code: "02",
      title: "Add a medical document",
      titleAr: "أضف مستندًا طبيًا",
      text:
        "Upload lab results, radiology reports, discharge summaries, or medical documents when available.",
      textAr:
        "ارفع نتائج المختبر أو تقارير الأشعة أو ملخصات الخروج أو المستندات الطبية عند توفرها.",
      href: "/lab-upload",
      action: "Upload Document",
      actionAr: "رفع مستند",
      primary: false,
      estimated: "2–4 min",
      estimatedAr: "2–4 دقائق",
      status: "Optional",
      statusAr: "اختياري",
    },
    {
      code: "03",
      title: "Review your reports",
      titleAr: "راجع تقاريرك",
      text:
        "Use the reports library to review uploaded documents and continue into selected report analysis.",
      textAr:
        "استخدم مكتبة التقارير لمراجعة المستندات المرفوعة والمتابعة إلى تحليل التقرير المحدد.",
      href: "/reports",
      action: "Open Reports",
      actionAr: "فتح التقارير",
      primary: false,
      estimated: "1–2 min",
      estimatedAr: "1–2 دقيقة",
      status: "Review",
      statusAr: "مراجعة",
    },
    {
      code: "04",
      title: "Build your health plan",
      titleAr: "ابنِ خطتك الصحية",
      text:
        "Turn your health context into clear priorities, practical tasks, and a safer follow-up direction.",
      textAr:
        "حوّل سياقك الصحي إلى أولويات واضحة، مهام عملية، واتجاه متابعة أكثر أمانًا.",
      href: "/health-plan",
      action: "Open Health Plan",
      actionAr: "فتح الخطة الصحية",
      primary: false,
      estimated: "3–6 min",
      estimatedAr: "3–6 دقائق",
      status: "Plan",
      statusAr: "خطة",
    },
    {
      code: "05",
      title: "Keep your check-ins updated",
      titleAr: "حافظ على تحديث المتابعة",
      text:
        "Use check-ins to keep OrganHeal aware of symptoms, progress, changes, and next follow-up needs.",
      textAr:
        "استخدم التحديثات اليومية لإبقاء OrganHeal على معرفة بالأعراض، التقدم، التغييرات، واحتياجات المتابعة التالية.",
      href: "/checkin",
      action: "Open Check-In",
      actionAr: "فتح المتابعة",
      primary: false,
      estimated: "1–3 min",
      estimatedAr: "1–3 دقائق",
      status: "Ongoing",
      statusAr: "مستمر",
    },
  ];

  return (
    <main className="ohPageShell onboardingPage" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        .onboardingPage,
        .onboardingPage * {
          box-sizing: border-box;
        }

        .onboardingPage a {
          color: inherit;
          text-decoration: none;
        }

        .onboardingPage .onboardingHero {
          position: relative;
          overflow: hidden;
          padding: 38px;
        }

        .onboardingPage .onboardingHero::before {
          content: "";
          position: absolute;
          inset: -120px auto auto -120px;
          width: 320px;
          height: 320px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(20, 184, 166, 0.18), transparent 68%);
          pointer-events: none;
        }

        [dir="rtl"] .onboardingPage .onboardingHero::before {
          inset: -120px -120px auto auto;
        }

        .onboardingPage .onboardingHero .ohHeroGrid {
          position: relative;
          z-index: 1;
          grid-template-columns: minmax(0, 1.05fr) minmax(330px, 0.78fr);
          align-items: center;
        }

        .onboardingPage .onboardingHero .ohTitle {
          max-width: 820px;
          font-size: clamp(2.35rem, 4.4vw, 4.35rem);
          line-height: 0.98;
        }

        .onboardingPage .onboardingPathCard {
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(15, 118, 110, 0.92));
          color: white;
          padding: 24px;
          box-shadow: 0 24px 64px rgba(15, 23, 42, 0.14);
        }

        .onboardingPage .onboardingPathCard::after {
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

        [dir="rtl"] .onboardingPage .onboardingPathCard::after {
          right: auto;
          left: -82px;
        }

        .onboardingPage .onboardingPathCard * {
          position: relative;
          z-index: 1;
        }

        .onboardingPage .onboardingPathCard .ohMetricLabel {
          color: rgba(209, 250, 229, 0.88);
        }

        .onboardingPage .onboardingPathCard .ohCardTitle {
          color: white;
        }

        .onboardingPage .onboardingPathCard .ohCardText {
          color: rgba(226, 232, 240, 0.9);
        }

        .onboardingPage .onboardingCodeMark {
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
          font-size: 0.84rem;
          letter-spacing: 0.04em;
        }

        .onboardingPage .onboardingStepCard {
          display: flex;
          flex-direction: column;
          gap: 13px;
          min-height: 100%;
          border-top: 5px solid #14b8a6;
        }

        .onboardingPage .onboardingStepCard .primaryBtn,
        .onboardingPage .onboardingStepCard .secondaryBtn {
          width: 100%;
          min-height: 48px;
          margin-top: auto;
          border-radius: 16px;
          font-size: 0.9rem;
          font-weight: 950;
          letter-spacing: -0.01em;
          justify-content: center;
          box-shadow: 0 14px 30px rgba(15, 118, 110, 0.18);
        }

        .onboardingPage .onboardingStepCard .secondaryBtn {
          background: #ffffff;
          border: 1.5px solid rgba(15, 118, 110, 0.45);
          color: #0f766e;
        }

        .onboardingPage .onboardingStepCard .secondaryBtn:hover {
          background: rgba(240, 253, 250, 0.95);
          border-color: rgba(15, 118, 110, 0.75);
          transform: translateY(-1px);
        }


        .onboardingPage .onboardingStepMeta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 4px;
        }

        .onboardingPage .onboardingStepMetaItem {
          border-radius: 14px;
          padding: 11px 12px;
          background: rgba(240, 253, 250, 0.95);
          border: 1px solid rgba(15, 118, 110, 0.18);
        }

        .onboardingPage .onboardingStepMetaLabel {
          display: block;
          color: #475569;
          font-size: 0.74rem;
          font-weight: 850;
          margin-bottom: 3px;
        }

        .onboardingPage .onboardingStepMetaValue {
          display: block;
          color: #0f172a;
          font-size: 0.88rem;
          font-weight: 950;
        }


        /* ===== ORGANHEAL_ONBOARDING_PROGRESS_TRACKER_V1 ===== */

        .onboardingPage .onboardingProgressCard {
          padding: 24px;
          border-radius: 28px;
          background: linear-gradient(135deg, #ffffff, #f0fdfa);
          border: 1px solid rgba(15, 118, 110, 0.16);
          box-shadow: 0 20px 46px rgba(15, 23, 42, 0.10);
        }

        .onboardingPage .onboardingProgressTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .onboardingPage .onboardingProgressTitle {
          margin: 0;
          color: #0f172a;
          font-size: 1.25rem;
          font-weight: 950;
        }

        .onboardingPage .onboardingProgressText {
          margin: 6px 0 0;
          color: #475569;
          font-weight: 750;
          line-height: 1.6;
        }

        .onboardingPage .onboardingProgressPercent {
          flex: 0 0 auto;
          min-width: 84px;
          text-align: center;
          padding: 10px 14px;
          border-radius: 18px;
          background: #0f766e;
          color: #ffffff;
          font-size: 1.2rem;
          font-weight: 950;
        }

        .onboardingPage .onboardingProgressTrack {
          height: 12px;
          border-radius: 999px;
          background: rgba(15, 118, 110, 0.12);
          overflow: hidden;
        }

        .onboardingPage .onboardingProgressFill {
          width: 20%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(135deg, #0ea5e9, #0891b2);
        }

        .onboardingPage .onboardingProgressSteps {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-top: 16px;
        }

        .onboardingPage .onboardingProgressStep {
          padding: 12px;
          border-radius: 16px;
          background: #ffffff;
          border: 1px solid rgba(15, 118, 110, 0.16);
          color: #334155;
          font-size: 0.82rem;
          font-weight: 900;
          text-align: center;
        }

        .onboardingPage .onboardingProgressStep.active {
          background: #0f766e;
          color: #ffffff;
          border-color: #0f766e;
        }

        .onboardingPage .onboardingSafetyStrip {
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

        .onboardingPage .onboardingSafetyStrip strong {
          color: var(--oh-text);
        }

        .onboardingPage .onboardingSafetyMark {
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

        
        /* ===== ORGANHEAL_ONBOARDING_BUTTON_CLARITY_FINAL ===== */

        .onboardingPage .onboardingStepCard a.onboardingStepAction,
        .onboardingPage .onboardingStepCard a.onboardingStepAction:visited {
          background: linear-gradient(135deg, #0ea5e9, #0891b2) !important;
          color: #ffffff !important;
          min-height: 58px !important;
          padding: 0 20px !important;
          border-radius: 18px !important;
          border: 1px solid rgba(255, 255, 255, 0.35) !important;
          box-shadow: 0 18px 36px rgba(8, 145, 178, 0.32) !important;
          opacity: 1 !important;
        }

        .onboardingPage .onboardingStepCard a.onboardingStepAction span {
          color: #ffffff !important;
          opacity: 1 !important;
          font-size: 1rem !important;
          font-weight: 950 !important;
          text-shadow: 0 1px 2px rgba(15, 23, 42, 0.22) !important;
        }

        .onboardingPage .onboardingStepCard a.onboardingStepAction .onboardingStepArrow {
          background: rgba(255, 255, 255, 0.24) !important;
          color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.28) !important;
        }

        
        /* ===== ORGANHEAL_ONBOARDING_BUTTON_TEXT_FIX ===== */

        .onboardingPage .onboardingStepCard a.onboardingStepAction {
          direction: inherit !important;
          justify-content: center !important;
          gap: 10px !important;
          min-height: 56px !important;
          padding: 0 16px !important;
          text-align: center !important;
          white-space: nowrap !important;
          overflow: hidden !important;
        }

        .onboardingPage .onboardingStepCard a.onboardingStepAction span:first-child {
          display: block !important;
          flex: 0 1 auto !important;
          min-width: 0 !important;
          max-width: calc(100% - 38px) !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          line-height: 1.2 !important;
        }

        .onboardingPage .onboardingStepCard a.onboardingStepAction .onboardingStepArrow {
          flex: 0 0 28px !important;
        }

        
        /* ===== ORGANHEAL_ONBOARDING_JOURNEY_CARD_FINAL ===== */

        .onboardingPage .onboardingJourneyCard {
          overflow: hidden !important;
          padding: 0 !important;
          gap: 0 !important;
          border-top: 5px solid #14b8a6 !important;
        }

        .onboardingPage .onboardingJourneyCard .ohCardHeader,
        .onboardingPage .onboardingJourneyCard .ohCardTitle,
        .onboardingPage .onboardingJourneyCard .ohCardText,
        .onboardingPage .onboardingJourneyCard .onboardingStepMeta {
          margin-left: 22px !important;
          margin-right: 22px !important;
        }

        .onboardingPage .onboardingJourneyCard .ohCardHeader {
          margin-top: 20px !important;
        }

        .onboardingPage .onboardingJourneyCard .ohCardTitle {
          margin-top: 18px !important;
          font-size: 1.08rem !important;
          line-height: 1.3 !important;
        }

        .onboardingPage .onboardingJourneyCard .ohCardText {
          margin-top: 10px !important;
          min-height: 84px !important;
          line-height: 1.65 !important;
        }

        .onboardingPage .onboardingJourneyCard .onboardingStepMeta {
          grid-template-columns: 1fr !important;
          gap: 8px !important;
          margin-top: 14px !important;
          margin-bottom: 18px !important;
        }

        .onboardingPage .onboardingJourneyCard .onboardingStepMetaItem {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 12px !important;
          padding: 10px 12px !important;
        }

        .onboardingPage .onboardingJourneyCard a.onboardingStepAction {
          border-radius: 0 !important;
          min-height: 60px !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 22px !important;
          justify-content: space-between !important;
          font-size: 0.96rem !important;
          box-shadow: none !important;
        }

        .onboardingPage .onboardingJourneyCard a.onboardingStepAction span:first-child {
          max-width: none !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }

        @media (max-width: 980px) {
          .onboardingPage .onboardingHero .ohHeroGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .onboardingPage .onboardingHero {
            padding: 28px;
          }

          .onboardingPage .onboardingHero .ohTitle {
            font-size: clamp(2.1rem, 11vw, 3rem);
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "28px 0 56px" }}>
        <section className="ohHero onboardingHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Welcome to OrganHeal", "مرحبًا بك في OrganHeal")}
              </p>

              <h1 className="ohTitle">
                {loading
                  ? text("Preparing your workspace...", "جاري تحضير مساحتك...")
                  : text(`Welcome, ${username}`, `مرحبًا ${username}`)}
              </h1>

              <p className="ohLead">
                {text(
                  "Begin your OrganHeal journey with a simple guided path. Complete your health assessment, upload medical documents when available, review your reports, build your personalized health plan, and continue improving your health through regular check-ins.",
                  "ابدأ رحلتك مع OrganHeal بمسار بسيط وموجّه. أكمل تقييمك الصحي، وارفع مستنداتك الطبية عند توفرها، ثم راجع تقاريرك، وابنِ خطتك الصحية الشخصية، واستمر في تحسين صحتك من خلال المتابعة المنتظمة."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/assessment" className="primaryBtn">
                  {text("Start Assessment", "ابدأ التقييم")}
                </Link>

                <Link href="/lab-upload" className="secondaryBtn">
                  {text("Upload Document", "رفع مستند")}
                </Link>
              </div>
            </div>

            <aside className="onboardingPathCard">
              <p className="ohMetricLabel">
                {text("Private workspace start", "بداية المساحة الخاصة")}
              </p>

              <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                {text(
                  "Your Health Journey",
                  "رحلتك الصحية"
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "You do not need to complete everything today. OrganHeal works best when your health context grows step by step.",
                  "لا تحتاج إلى إكمال كل شيء اليوم. يعمل OrganHeal بشكل أفضل عندما يتطور سياقك الصحي خطوة بخطوة."
                )}
              </p>

              <div className="ohTimeline" style={{ marginTop: "18px" }}>
                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <p className="ohTimelineTitle">
                    {text("Health Assessment", "التقييم الصحي")}
                  </p>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <p className="ohTimelineTitle">
                    {text("Medical Documents", "المستندات الطبية")}
                  </p>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <p className="ohTimelineTitle">
                    {text("Reports & Analysis", "التقارير والتحليل")}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="ohMetricGrid">
          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("First action", "أول إجراء")}
            </span>
            <span className="ohMetricValue">1</span>
            <span className="ohMetricHint">
              {text("step is enough to begin", "خطوة تكفي للبدء")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Health areas", "المجالات الصحية")}
            </span>
            <span className="ohMetricValue">6</span>
            <span className="ohMetricHint">
              {text("organ-focused modules", "وحدات مخصصة للأعضاء")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Workspace", "المساحة")}
            </span>
            <span className="ohMetricValue">✓</span>
            <span className="ohMetricHint">
              {text("protected account area", "منطقة حساب محمية")}
            </span>
          </article>

          <article className="ohMetricCard">
            <span className="ohMetricLabel">
              {text("Clinical boundary", "الحد السريري")}
            </span>
            <span className="ohMetricValue">OH</span>
            <span className="ohMetricHint">
              {text("education and preparation only", "تعليم وتحضير فقط")}
            </span>
          </article>
        </section>


        <section className="onboardingProgressCard">
          <div className="onboardingProgressTop">
            <div>
              <h2 className="onboardingProgressTitle">
                {text("Getting started progress", "تقدم البداية")}
              </h2>
              <p className="onboardingProgressText">
                {text(
                  "Complete the journey step by step. Start with your first health assessment, then continue through documents, reports, plan, and check-ins.",
                  "أكمل الرحلة خطوة بخطوة. ابدأ بالتقييم الصحي، ثم تابع المستندات، التقارير، الخطة، والمتابعة."
                )}
              </p>
            </div>

            <div className="onboardingProgressPercent">20%</div>
          </div>

          <div className="onboardingProgressTrack">
            <div className="onboardingProgressFill" />
          </div>

          <div className="onboardingProgressSteps">
            <div className="onboardingProgressStep active">{text("Assessment", "التقييم")}</div>
            <div className="onboardingProgressStep">{text("Documents", "المستندات")}</div>
            <div className="onboardingProgressStep">{text("Reports", "التقارير")}</div>
            <div className="onboardingProgressStep">{text("Plan", "الخطة")}</div>
            <div className="onboardingProgressStep">{text("Check-Ins", "المتابعة")}</div>
          </div>
        </section>

        <section className="ohGrid cols3">
          {steps.map((step) => (
            <article className="ohCard onboardingStepCard onboardingJourneyCard" key={step.code}>
              <div className="ohCardHeader">
                <span className="onboardingCodeMark">{step.code}</span>

                <span className={step.primary ? "ohStatusBadge good" : "ohStatusBadge neutral"}>
                  {text("Available", "متاح")}
                </span>
              </div>

              <h2 className="ohCardTitle">
                {isArabic ? step.titleAr : step.title}
              </h2>

              <p className="ohCardText">
                {isArabic ? step.textAr : step.text}
              </p>

              <div className="ohDivider" />

              <div className="onboardingStepMeta">
                <div className="onboardingStepMetaItem">
                  <span className="onboardingStepMetaLabel">
                    {text("Estimated time", "الوقت المتوقع")}
                  </span>
                  <span className="onboardingStepMetaValue">
                    {isArabic ? step.estimatedAr : step.estimated}
                  </span>
                </div>

                <div className="onboardingStepMetaItem">
                  <span className="onboardingStepMetaLabel">
                    {text("Status", "الحالة")}
                  </span>
                  <span className="onboardingStepMetaValue">
                    {isArabic ? step.statusAr : step.status}
                  </span>
                </div>
              </div>

              <Link
                href={step.href}
                className={step.primary ? "primaryBtn onboardingStepAction onboardingStepActionPrimary" : "secondaryBtn onboardingStepAction onboardingStepActionSecondary"}
              >
                <span>{isArabic ? step.actionAr : step.action}</span>
                <span className="onboardingStepArrow">{isArabic ? "←" : "→"}</span>
              </Link>
            </article>
          ))}
        </section>

        <section className="ohActionPanel">
          <div className="ohCardHeader" style={{ marginBottom: 0 }}>
            <div>
              <p className="ohMetricLabel">
                {text("Recommended first move", "الخطوة الأولى المقترحة")}
              </p>

              <h2 className="ohCardTitle" style={{ fontSize: "1.55rem" }}>
                {text(
                  "Start with one assessment, then continue at your pace.",
                  "ابدأ بتقييم واحد، ثم تابع حسب وتيرتك."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "A single assessment gives OrganHeal a starting point. You can review your dashboard or add documents whenever they are available.",
                  "تقييم واحد يعطي OrganHeal نقطة بداية. يمكنك مراجعة لوحة التحكم أو إضافة مستندات عندما تكون متوفرة."
                )}
              </p>
            </div>

            <Link href="/assessment" className="primaryBtn">
              {text("Begin Now", "ابدأ الآن")}
            </Link>
          </div>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("What you get at the beginning", "ماذا تحصل عليه في البداية؟")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "A clear, protected health starting point.",
                  "نقطة بداية صحية واضحة ومحمية."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Your account helps you organize assessments, documents, learning context, and preparation notes inside one private workspace.",
                  "يساعدك حسابك على تنظيم التقييمات، المستندات، سياق التعلّم، وملاحظات التحضير داخل مساحة خاصة واحدة."
                )}
              </p>
            </div>
          </div>

          <div className="ohButtonRow">
            <Link href="/reports" className="secondaryBtn">
              {text("Open Reports", "فتح التقارير")}
            </Link>

            <Link href="/library" className="secondaryBtn">
              {text("Open Learning Hub", "فتح مركز التعلّم")}
            </Link>

            <Link href="/medical-disclaimer" className="secondaryBtn">
              {text("Medical Disclaimer", "إخلاء المسؤولية الطبية")}
            </Link>
          </div>
        </section>

        <section className="onboardingSafetyStrip">
          <span className="onboardingSafetyMark">OH</span>

          <div>
            <strong>
              {text("Medical safety reminder", "تذكير السلامة الطبية")}
            </strong>
            <br />
            {text(
              "OrganHeal helps organize health information for education and follow-up preparation. It does not diagnose, treat, prescribe, replace urgent care, or replace licensed medical professionals.",
              "يساعد OrganHeal على تنظيم المعلومات الصحية للتعليم والتحضير للمتابعة. لا يشخص ولا يعالج ولا يصف علاجًا ولا يستبدل الرعاية العاجلة أو المختصين الطبيين المرخصين."
            )}
          </div>
        </section>
      </div>
    </main>
  );
}


