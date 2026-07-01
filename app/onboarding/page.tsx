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
    },
    {
      code: "02",
      title: "Add a medical document when available",
      titleAr: "أضف مستندًا طبيًا عند توفره",
      text:
        "Add lab results, radiology reports, discharge summaries, or medical documents inside your private workspace.",
      textAr:
        "أضف نتائج المختبر أو تقارير الأشعة أو ملخصات الخروج أو المستندات الطبية داخل مساحتك الخاصة.",
      href: "/lab-upload",
      action: "Add Medical Document",
      actionAr: "إضافة مستند طبي",
      primary: false,
    },
    {
      code: "03",
      title: "Review your dashboard",
      titleAr: "راجع لوحة التحكم",
      text:
        "Use your dashboard to see your saved journey, current context, and next useful action.",
      textAr:
        "استخدم لوحة التحكم لرؤية رحلتك المحفوظة، السياق الحالي، والخطوة المفيدة التالية.",
      href: "/dashboard",
      action: "Open Dashboard",
      actionAr: "فتح لوحة التحكم",
      primary: false,
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
                  "Start with one practical step. You can begin with an assessment, add a medical document when available, or review your dashboard.",
                  "ابدأ بخطوة عملية واحدة. يمكنك البدء بتقييم صحي، إضافة مستند طبي عند توفره، أو مراجعة لوحة التحكم."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/assessment" className="primaryBtn">
                  {text("Start Assessment", "ابدأ التقييم")}
                </Link>

                <Link href="/dashboard" className="secondaryBtn">
                  {text("Open Dashboard", "فتح لوحة التحكم")}
                </Link>
              </div>
            </div>

            <aside className="onboardingPathCard">
              <p className="ohMetricLabel">
                {text("Private workspace start", "بداية المساحة الخاصة")}
              </p>

              <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                {text(
                  "Your first path is simple and flexible.",
                  "مسارك الأول بسيط ومرن."
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
                    {text("Start with one health baseline", "ابدأ بنقطة صحية واحدة")}
                  </p>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <p className="ohTimelineTitle">
                    {text("Add evidence when you have it", "أضف البيانات عند توفرها")}
                  </p>
                </div>

                <div className="ohTimelineItem">
                  <span className="ohTimelineDot" />
                  <p className="ohTimelineTitle">
                    {text("Use the dashboard to stay organized", "استخدم لوحة التحكم للتنظيم")}
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

        <section className="ohGrid cols3">
          {steps.map((step) => (
            <article className="ohCard onboardingStepCard" key={step.code}>
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

              <Link
                href={step.href}
                className={step.primary ? "primaryBtn" : "secondaryBtn"}
              >
                {isArabic ? step.actionAr : step.action}
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
            <Link href="/dashboard" className="secondaryBtn">
              {text("Open Dashboard", "فتح لوحة التحكم")}
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
