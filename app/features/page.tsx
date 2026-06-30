"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Language = "en" | "ar";

type FeatureAccess = "public-preview" | "account-feature" | "private-workspace";

type PublicFeature = {
  code: string;
  title: string;
  titleAr: string;
  shortValue: string;
  shortValueAr: string;
  preview: string;
  previewAr: string;
  access: FeatureAccess;
};

const publicFeatures: PublicFeature[] = [
  {
    code: "REPORTS",
    title: "Reports Intelligence",
    titleAr: "ذكاء التقارير الطبية",
    shortValue:
      "Turn lab and medical reports into clearer patient-friendly understanding.",
    shortValueAr:
      "حوّل تقارير المختبر والتقارير الطبية إلى فهم أوضح ومناسب للمريض.",
    preview:
      "Understand report type, key markers, abnormal flags, summary points, and questions to discuss with a clinician.",
    previewAr:
      "افهم نوع التقرير، المؤشرات المهمة، العلامات غير الطبيعية، نقاط الملخص، والأسئلة التي تناقشها مع الطبيب.",
    access: "account-feature",
  },
  {
    code: "CENTER",
    title: "Health Intelligence Center",
    titleAr: "مركز الذكاء الصحي",
    shortValue:
      "Connect assessments, reports, check-ins, and health signals into one organized intelligence view.",
    shortValueAr:
      "اربط التقييمات، التقارير، التحديثات، والمؤشرات الصحية داخل رؤية صحية منظمة.",
    preview:
      "Review health direction, priority area, saved intelligence, follow-up context, and confidence level.",
    previewAr:
      "راجع الاتجاه الصحي، منطقة الأولوية، الذكاء المحفوظ، سياق المتابعة، ومستوى الثقة.",
    access: "private-workspace",
  },
  {
    code: "PLAN",
    title: "Personal Health Plan",
    titleAr: "الخطة الصحية الشخصية",
    shortValue:
      "Translate health signals into a practical follow-up direction that can be reviewed with a clinician.",
    shortValueAr:
      "حوّل المؤشرات الصحية إلى اتجاه متابعة عملي يمكن مراجعته مع الطبيب.",
    preview:
      "Organize weekly focus, monthly priorities, education needs, and doctor-review questions.",
    previewAr:
      "نظّم تركيز الأسبوع، أولويات الشهر، الاحتياجات التعليمية، وأسئلة مراجعة الطبيب.",
    access: "private-workspace",
  },
  {
    code: "BRIEF",
    title: "Doctor-Ready Brief",
    titleAr: "ملخص جاهز للطبيب",
    shortValue:
      "Prepare structured summaries that make appointments more focused and useful.",
    shortValueAr:
      "جهّز ملخصات منظمة تجعل زيارة الطبيب أكثر تركيزًا وفائدة.",
    preview:
      "Summarize reason for review, important findings, safety notes, current concerns, and prepared questions.",
    previewAr:
      "لخّص سبب المراجعة، النتائج المهمة، ملاحظات السلامة، المخاوف الحالية، والأسئلة المحضّرة.",
    access: "account-feature",
  },
  {
    code: "DASH",
    title: "Health Command Dashboard",
    titleAr: "لوحة القيادة الصحية",
    shortValue:
      "See your health direction, saved activity, next best step, and progress signals in one place.",
    shortValueAr:
      "شاهد اتجاهك الصحي، النشاط المحفوظ، الخطوة التالية، ومؤشرات التقدم في مكان واحد.",
    preview:
      "Track assessments, reports, saved intelligence, check-ins, and the current health journey status.",
    previewAr:
      "تابع التقييمات، التقارير، الذكاء المحفوظ، التحديثات، وحالة الرحلة الصحية الحالية.",
    access: "account-feature",
  },
  {
    code: "ASK",
    title: "OrganHeal Assistant",
    titleAr: "مساعد OrganHeal",
    shortValue:
      "Ask educational health questions in a safety-bounded assistant experience.",
    shortValueAr:
      "اطرح أسئلة صحية تعليمية ضمن تجربة مساعد محددة بحدود السلامة.",
    preview:
      "Get plain-language explanations, doctor-visit questions, lab marker education, and safe guidance boundaries.",
    previewAr:
      "احصل على شرح مبسط، أسئلة للطبيب، تثقيف حول مؤشرات المختبر، وحدود توجيه آمنة.",
    access: "public-preview",
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

function FeatureCode({ code }: { code: string }) {
  return (
    <span className="featureDiscoveryCode" aria-hidden="true">
      {code}
    </span>
  );
}

function AccessBadge({
  access,
  isArabic,
}: {
  access: FeatureAccess;
  isArabic: boolean;
}) {
  if (access === "public-preview") {
    return (
      <span className="ohStatusBadge good">
        {isArabic ? "معاينة عامة" : "Public preview"}
      </span>
    );
  }

  if (access === "account-feature") {
    return (
      <span className="ohStatusBadge neutral">
        {isArabic ? "ميزة حساب" : "Account feature"}
      </span>
    );
  }

  return (
    <span className="ohStatusBadge moderate">
      {isArabic ? "مساحة خاصة" : "Private workspace"}
    </span>
  );
}

export default function FeaturesPage() {
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
      className="ohPageShell featureDiscoveryPage"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <style>{`
        .featureDiscoveryPage,
        .featureDiscoveryPage * {
          box-sizing: border-box;
        }

        .featureDiscoveryPage a {
          color: inherit;
          text-decoration: none;
        }

        .featureDiscoveryPage .featureDiscoveryHero {
          position: relative;
          overflow: hidden;
        }

        .featureDiscoveryPage .featureDiscoveryHero::before {
          content: "";
          position: absolute;
          inset: -120px auto auto -120px;
          width: 320px;
          height: 320px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(20,184,166,0.16), transparent 68%);
          pointer-events: none;
        }

        [dir="rtl"] .featureDiscoveryPage .featureDiscoveryHero::before {
          inset: -120px -120px auto auto;
        }

        .featureDiscoveryPage .featureGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .featureDiscoveryPage .featureCard {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-height: 100%;
          overflow: hidden;
          border-top: 5px solid #14b8a6;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .featureDiscoveryPage .featureCard:hover {
          transform: translateY(-4px);
          border-color: rgba(20, 184, 166, 0.48);
          box-shadow: 0 22px 48px rgba(15, 23, 42, 0.1);
        }

        .featureDiscoveryPage .featureDiscoveryCode {
          display: inline-flex;
          min-width: 72px;
          height: 48px;
          padding: 0 10px;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(20, 184, 166, 0.14), rgba(37, 99, 235, 0.1));
          border: 1px solid rgba(20, 184, 166, 0.22);
          color: var(--oh-primary);
          font-weight: 950;
          font-size: 0.68rem;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        .featureDiscoveryPage .featurePreviewBox {
          margin-top: auto;
          padding: 14px;
          border-radius: 18px;
          background: rgba(248, 250, 252, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.18);
          color: var(--oh-muted);
          font-size: 0.92rem;
          line-height: 1.7;
        }

        .featureDiscoveryPage .featureAccessPanel {
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(15, 118, 110, 0.92));
          color: white;
          padding: 24px;
          box-shadow: 0 24px 64px rgba(15, 23, 42, 0.14);
        }

        .featureDiscoveryPage .featureAccessPanel::after {
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

        [dir="rtl"] .featureDiscoveryPage .featureAccessPanel::after {
          right: auto;
          left: -82px;
        }

        .featureDiscoveryPage .featureAccessPanel * {
          position: relative;
          z-index: 1;
        }

        .featureDiscoveryPage .featureAccessPanel .ohMetricLabel {
          color: rgba(209, 250, 229, 0.88);
        }

        .featureDiscoveryPage .featureAccessPanel .ohCardTitle {
          color: white;
        }

        .featureDiscoveryPage .featureAccessPanel .ohCardText {
          color: rgba(226, 232, 240, 0.9);
        }

        .featureDiscoveryPage .accessSteps {
          display: grid;
          gap: 12px;
          margin-top: 18px;
        }

        .featureDiscoveryPage .accessStep {
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 12px;
          align-items: flex-start;
          padding: 13px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.09);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .featureDiscoveryPage .accessNumber {
          display: inline-flex;
          width: 34px;
          height: 34px;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.12);
          color: white;
          font-weight: 950;
        }

        .featureDiscoveryPage .accessTitle {
          margin: 0;
          color: white;
          font-weight: 950;
        }

        .featureDiscoveryPage .accessText {
          margin: 5px 0 0;
          color: rgba(226, 232, 240, 0.88);
          line-height: 1.55;
        }

        .featureDiscoveryPage .featureSafetyStrip {
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

        .featureDiscoveryPage .featureSafetyStrip strong {
          color: var(--oh-text);
        }

        .featureDiscoveryPage .featureSafetyMark {
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
          .featureDiscoveryPage .featureGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .featureDiscoveryPage .featureGrid {
            grid-template-columns: 1fr;
          }

          .featureDiscoveryPage .accessStep {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero featureDiscoveryHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("OrganHeal Platform Features", "ميزات منصة OrganHeal")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "A health intelligence workspace built around your health journey.",
                  "مساحة ذكاء صحي مبنية حول رحلتك الصحية."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "OrganHeal brings reports, assessments, health signals, learning, summaries, and follow-up direction into one clearer experience.",
                  "يجمع OrganHeal التقارير والتقييمات والمؤشرات الصحية والتعلّم والملخصات واتجاه المتابعة داخل تجربة أوضح."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/signup" className="primaryBtn">
                  {text("Create Free Account", "إنشاء حساب مجاني")}
                </Link>

                <Link href="/library" className="secondaryBtn">
                  {text("Open Learning Hub", "فتح مركز التعلّم")}
                </Link>
              </div>
            </div>

            <aside className="featureAccessPanel">
              <p className="ohMetricLabel">
                {text("How access works", "كيف يعمل الوصول")}
              </p>

              <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                {text(
                  "Learn publicly. Use privately.",
                  "تعرّف علنًا. واستخدم داخل مساحتك الخاصة."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Visitors can understand the platform value before account access. Personal health work belongs inside the private user workspace.",
                  "يمكن للزائر فهم قيمة المنصة قبل إنشاء الحساب. العمل الصحي الشخصي يكون داخل مساحة المستخدم الخاصة."
                )}
              </p>

              <div className="accessSteps">
                <div className="accessStep">
                  <span className="accessNumber">1</span>
                  <div>
                    <p className="accessTitle">
                      {text("Public discovery", "اكتشاف عام")}
                    </p>
                    <p className="accessText">
                      {text(
                        "Understand what OrganHeal does and why it matters.",
                        "افهم ما يقدمه OrganHeal ولماذا هو مهم."
                      )}
                    </p>
                  </div>
                </div>

                <div className="accessStep">
                  <span className="accessNumber">2</span>
                  <div>
                    <p className="accessTitle">
                      {text("Private workspace", "مساحة خاصة")}
                    </p>
                    <p className="accessText">
                      {text(
                        "Use account-based tools to organize reports, health signals, summaries, and follow-up context.",
                        "استخدم أدوات الحساب لتنظيم التقارير والمؤشرات والملخصات وسياق المتابعة."
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="featureSafetyStrip">
          <span className="featureSafetyMark">OH</span>
          <div>
            <strong>
              {text("Health intelligence with clinical boundaries", "ذكاء صحي بحدود سريرية واضحة")}
            </strong>
            <br />
            {text(
              "OrganHeal supports education, organization, and preparation. It does not diagnose, treat, prescribe, or replace licensed medical care.",
              "يدعم OrganHeal التثقيف والتنظيم والتحضير. لا يقدم تشخيصًا أو علاجًا أو وصفات ولا يستبدل الرعاية الطبية المرخصة."
            )}
          </div>
        </section>

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Feature collection", "مجموعة الميزات")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "Designed as one connected health intelligence experience.",
                  "مصممة كتجربة ذكاء صحي واحدة ومترابطة."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Each feature has a clear role in understanding, organizing, preparing, or following up on health information.",
                  "كل ميزة لها دور واضح في الفهم أو التنظيم أو التحضير أو المتابعة للمعلومات الصحية."
                )}
              </p>
            </div>
          </div>

          <div className="featureGrid">
            {publicFeatures.map((feature) => (
              <article className="ohCard featureCard" key={feature.code}>
                <div className="ohCardHeader" style={{ marginBottom: 0 }}>
                  <FeatureCode code={feature.code} />
                  <AccessBadge access={feature.access} isArabic={isArabic} />
                </div>

                <div>
                  <p className="ohMetricLabel">
                    {text("Platform feature", "ميزة في المنصة")}
                  </p>

                  <h3 className="ohCardTitle" style={{ fontSize: "1.18rem" }}>
                    {isArabic ? feature.titleAr : feature.title}
                  </h3>
                </div>

                <p className="ohCardText">
                  {isArabic ? feature.shortValueAr : feature.shortValue}
                </p>

                <div className="featurePreviewBox">
                  {isArabic ? feature.previewAr : feature.preview}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ohActionPanel">
          <div className="ohCardHeader" style={{ marginBottom: 0 }}>
            <div>
              <p className="ohMetricLabel">
                {text("Start with your private workspace", "ابدأ بمساحتك الصحية الخاصة")}
              </p>

              <h2 className="ohCardTitle" style={{ fontSize: "1.7rem" }}>
                {text(
                  "Create your account and organize your health journey with more clarity.",
                  "أنشئ حسابك ونظّم رحلتك الصحية بوضوح أكبر."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Use OrganHeal to connect learning, reports, assessments, summaries, and follow-up direction inside one health intelligence workspace.",
                  "استخدم OrganHeal لربط التعلّم والتقارير والتقييمات والملخصات واتجاه المتابعة داخل مساحة ذكاء صحي واحدة."
                )}
              </p>
            </div>

            <div className="ohButtonRow">
              <Link href="/signup" className="primaryBtn">
                {text("Create Free Account", "إنشاء حساب مجاني")}
              </Link>

              <Link href="/login" className="secondaryBtn">
                {text("Sign In", "تسجيل الدخول")}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
