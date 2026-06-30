"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Language = "en" | "ar";

type FeatureAccess = "free" | "plus" | "planned";

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
      "Turn written lab and medical reports into clearer patient-friendly understanding.",
    shortValueAr:
      "حوّل تقارير المختبر والتقارير الطبية المكتوبة إلى فهم أوضح للمريض.",
    preview:
      "Preview: report type, key markers, abnormal flags, patient summary, and doctor questions.",
    previewAr:
      "المعاينة: نوع التقرير، المؤشرات المهمة، العلامات غير الطبيعية، ملخص للمريض، وأسئلة للطبيب.",
    access: "free",
  },
  {
    code: "CENTER",
    title: "Health Intelligence Center",
    titleAr: "مركز الذكاء الصحي",
    shortValue:
      "Connect assessments, reports, health signals, and summaries into one organized intelligence view.",
    shortValueAr:
      "اربط التقييمات، التقارير، المؤشرات الصحية، والملخصات داخل رؤية صحية منظمة.",
    preview:
      "Preview: current score, priority area, health direction, forecast, and confidence level.",
    previewAr:
      "المعاينة: النتيجة الحالية، منطقة الأولوية، الاتجاه الصحي، التوقع، ومستوى الثقة.",
    access: "plus",
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
      "Preview: this week, this month, next 90 days, follow-up focus, and education needs.",
    previewAr:
      "المعاينة: هذا الأسبوع، هذا الشهر، 90 يومًا القادمة، محور المتابعة، والاحتياجات التعليمية.",
    access: "plus",
  },
  {
    code: "BRIEF",
    title: "Doctor-Ready Brief",
    titleAr: "ملخص جاهز للطبيب",
    shortValue:
      "Prepare a structured summary that helps make doctor appointments more focused and useful.",
    shortValueAr:
      "جهّز ملخصًا منظمًا يساعد أن تكون زيارة الطبيب أوضح وأكثر فائدة.",
    preview:
      "Preview: reason for review, key findings, questions, safety notes, and report context.",
    previewAr:
      "المعاينة: سبب المراجعة، النتائج المهمة، الأسئلة، تنبيهات السلامة، وسياق التقرير.",
    access: "plus",
  },
  {
    code: "DASH",
    title: "Health Dashboard",
    titleAr: "لوحة التحكم الصحية",
    shortValue:
      "See your health direction, next best step, and progress signals without repeating every page.",
    shortValueAr:
      "شاهد اتجاهك الصحي، الخطوة التالية، ومؤشرات التقدم بدون تكرار كل الصفحات.",
    preview:
      "Preview: health direction, next action, journey status, and saved intelligence activity.",
    previewAr:
      "المعاينة: الاتجاه الصحي، الإجراء التالي، حالة الرحلة، ونشاط الذكاء الصحي المحفوظ.",
    access: "free",
  },
  {
    code: "ASK",
    title: "Ask OrganHeal",
    titleAr: "اسأل OrganHeal",
    shortValue:
      "Ask educational health questions and later connect answers to your own profile and reports.",
    shortValueAr:
      "اسأل أسئلة صحية تعليمية، ولاحقًا اربط الإجابات بملفك وتقاريرك.",
    preview:
      "Preview: simple explanations, doctor-visit questions, lab marker education, and safe guidance.",
    previewAr:
      "المعاينة: شرح مبسط، أسئلة للطبيب، تثقيف حول مؤشرات المختبر، وتوجيه آمن.",
    access: "planned",
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
  if (access === "free") {
    return (
      <span className="ohStatusBadge good">
        {isArabic ? "ضمن الحساب المجاني" : "Free account"}
      </span>
    );
  }

  if (access === "plus") {
    return (
      <span className="ohStatusBadge moderate">
        {isArabic ? "قيمة Plus لاحقًا" : "Plus value later"}
      </span>
    );
  }

  return (
    <span className="ohStatusBadge neutral">
      {isArabic ? "قادم لاحقًا" : "Planned"}
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
        .featureDiscoveryPage a {
          color: inherit;
          text-decoration: none;
        }

        .featureDiscoveryPage .featureDiscoveryGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .featureDiscoveryPage .featureDiscoveryCard {
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-height: 100%;
        }

        .featureDiscoveryPage .featureDiscoveryCode {
          display: inline-flex;
          min-width: 64px;
          height: 48px;
          padding: 0 10px;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(20, 184, 166, 0.14), rgba(37, 99, 235, 0.1));
          border: 1px solid rgba(20, 184, 166, 0.22);
          color: var(--oh-primary);
          font-weight: 900;
          font-size: 0.68rem;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        .featureDiscoveryPage .featurePreviewBox {
          margin-top: auto;
          padding: 14px;
          border-radius: 18px;
          background: rgba(248, 250, 252, 0.86);
          border: 1px solid rgba(148, 163, 184, 0.18);
          color: var(--oh-muted);
          font-size: 0.92rem;
          line-height: 1.7;
        }

        .featureDiscoveryPage .accessPath {
          display: grid;
          gap: 12px;
          margin-top: 18px;
        }

        .featureDiscoveryPage .accessPathItem {
          display: grid;
          grid-template-columns: 44px 1fr;
          gap: 12px;
          align-items: flex-start;
          padding: 14px;
          border-radius: 18px;
          background: rgba(248, 250, 252, 0.82);
          border: 1px solid rgba(148, 163, 184, 0.18);
        }

        .featureDiscoveryPage .accessNumber {
          display: inline-flex;
          width: 36px;
          height: 36px;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: rgba(20, 184, 166, 0.12);
          border: 1px solid rgba(20, 184, 166, 0.2);
          color: var(--oh-primary);
          font-weight: 900;
        }

        .featureDiscoveryPage .unlockGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .featureDiscoveryPage .unlockStep {
          display: grid;
          grid-template-columns: 54px 1fr;
          gap: 14px;
          align-items: flex-start;
          padding: 18px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid rgba(148, 163, 184, 0.18);
        }

        @media (max-width: 980px) {
          .featureDiscoveryPage .featureDiscoveryGrid,
          .featureDiscoveryPage .unlockGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .featureDiscoveryPage .featureDiscoveryGrid,
          .featureDiscoveryPage .unlockGrid {
            grid-template-columns: 1fr;
          }

          .featureDiscoveryPage .unlockStep,
          .featureDiscoveryPage .accessPathItem {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ohContainer ohStack large" style={{ padding: "32px 0 64px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">
                {text("Feature Discovery", "اكتشاف الميزات")}
              </p>

              <h1 className="ohTitle">
                {text(
                  "Discover what OrganHeal can build for your health journey.",
                  "اكتشف ما يمكن أن يبنيه OrganHeal لرحلتك الصحية."
                )}
              </h1>

              <p className="ohLead">
                {text(
                  "OrganHeal helps users understand reports, connect health signals, prepare doctor-ready briefs, and follow a clearer health journey. Start by seeing the value, then create an account when you are ready to use the tools.",
                  "يساعد OrganHeal المستخدمين على فهم التقارير، ربط المؤشرات الصحية، تجهيز ملخصات للطبيب، ومتابعة رحلة صحية أوضح. ابدأ بفهم القيمة، ثم أنشئ حسابًا عندما تكون جاهزًا لاستخدام الأدوات."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/signup" className="primaryBtn">
                  {text("Create Free Account", "إنشاء حساب مجاني")}
                </Link>

                <a href="#feature-discovery" className="secondaryBtn">
                  {text("Explore Features", "استكشاف الميزات")}
                </a>
              </div>
            </div>

            <aside className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">
                    {text("Value-first model", "نموذج يبدأ بالقيمة")}
                  </p>

                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {text(
                      "Understand the benefit before thinking about payment.",
                      "افهم الفائدة قبل التفكير بالدفع."
                    )}
                  </h2>
                </div>

                <span className="ohStatusBadge neutral">
                  {text("Visitor friendly", "مناسب للزائر")}
                </span>
              </div>

              <p className="ohCardText">
                {text(
                  "Visitors should first understand trust, safety, reports, plans, and health intelligence. Pricing remains available later, after the value becomes clear.",
                  "يجب أن يفهم الزائر أولًا الثقة، السلامة، التقارير، الخطط، والذكاء الصحي. التسعير يبقى متاحًا لاحقًا بعد أن تصبح القيمة واضحة."
                )}
              </p>

              <div className="accessPath">
                <div className="accessPathItem">
                  <span className="accessNumber">1</span>
                  <div>
                    <p className="ohTimelineTitle">
                      {text("Public preview", "معاينة عامة")}
                    </p>
                    <p className="ohTimelineMeta">
                      {text(
                        "See what OrganHeal can help you understand.",
                        "شاهد ما يمكن أن يساعدك OrganHeal على فهمه."
                      )}
                    </p>
                  </div>
                </div>

                <div className="accessPathItem">
                  <span className="accessNumber">2</span>
                  <div>
                    <p className="ohTimelineTitle">
                      {text("Account access", "الوصول بالحساب")}
                    </p>
                    <p className="ohTimelineMeta">
                      {text(
                        "Use tools, save results, and build your profile.",
                        "استخدم الأدوات، احفظ النتائج، وابنِ ملفك الصحي."
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section id="feature-discovery" className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Feature discovery", "اكتشاف الميزات")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "A complete health intelligence journey, not separate tools.",
                  "رحلة ذكاء صحي كاملة، وليست أدوات منفصلة."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Each feature has a clear role. The public page explains the value, while account access unlocks real usage.",
                  "كل ميزة لها دور واضح. الصفحة العامة تشرح القيمة، والحساب يفتح الاستخدام الحقيقي."
                )}
              </p>
            </div>
          </div>

          <div className="featureDiscoveryGrid">
            {publicFeatures.map((feature) => (
              <article className="ohCard featureDiscoveryCard" key={feature.code}>
                <div className="ohCardHeader" style={{ marginBottom: 0 }}>
                  <FeatureCode code={feature.code} />
                  <AccessBadge access={feature.access} isArabic={isArabic} />
                </div>

                <div>
                  <p className="ohMetricLabel">
                    {text("Feature", "ميزة")}
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

        <section className="ohCard">
          <div className="ohCardHeader">
            <div>
              <p className="ohMetricLabel">
                {text("Unlock journey", "رحلة فتح الميزات")}
              </p>

              <h2 className="ohCardTitle">
                {text(
                  "The visitor sees the value before becoming a user.",
                  "الزائر يرى القيمة قبل أن يصبح مستخدمًا."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "This keeps the product attractive without exposing private tools before the right step.",
                  "هذا يجعل المنتج جذابًا بدون فتح الأدوات الخاصة قبل الخطوة المناسبة."
                )}
              </p>
            </div>
          </div>

          <div className="unlockGrid">
            <article className="unlockStep">
              <FeatureCode code="01" />
              <div>
                <p className="ohTimelineTitle">
                  {text("Visitor preview", "معاينة الزائر")}
                </p>
                <p className="ohTimelineMeta">
                  {text(
                    "Learn what each OrganHeal feature does and why it matters.",
                    "يتعرف الزائر على وظيفة كل ميزة ولماذا هي مهمة."
                  )}
                </p>
              </div>
            </article>

            <article className="unlockStep">
              <FeatureCode code="02" />
              <div>
                <p className="ohTimelineTitle">
                  {text("Free account access", "الوصول بالحساب المجاني")}
                </p>
                <p className="ohTimelineMeta">
                  {text(
                    "Start assessments, basic dashboard use, report upload, and education.",
                    "بدء التقييمات، الاستخدام الأساسي للوحة التحكم، رفع التقارير، والتثقيف."
                  )}
                </p>
              </div>
            </article>

            <article className="unlockStep">
              <FeatureCode code="03" />
              <div>
                <p className="ohTimelineTitle">
                  {text("Future Plus value", "قيمة Plus لاحقًا")}
                </p>
                <p className="ohTimelineMeta">
                  {text(
                    "Unlock saved history, advanced intelligence, PDF summaries, trends, and personal follow-up.",
                    "فتح التاريخ المحفوظ، الذكاء المتقدم، ملخصات PDF، الاتجاهات، والمتابعة الشخصية."
                  )}
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="ohActionPanel">
          <div className="ohCardHeader" style={{ marginBottom: 0 }}>
            <div>
              <p className="ohMetricLabel">
                {text("Ready to start with value?", "جاهز أن تبدأ بالقيمة؟")}
              </p>

              <h2 className="ohCardTitle" style={{ fontSize: "1.7rem" }}>
                {text(
                  "Create a free account and build your health intelligence journey.",
                  "أنشئ حسابًا مجانيًا وابدأ بناء رحلة ذكائك الصحي."
                )}
              </h2>

              <p className="ohCardText">
                {text(
                  "Start with your profile and core tools. Plan comparison remains available when you are ready to evaluate advanced value.",
                  "ابدأ بملفك والأدوات الأساسية. مقارنة الخطط تبقى متاحة عندما تكون جاهزًا لتقييم القيمة المتقدمة."
                )}
              </p>
            </div>

            <div className="ohButtonRow">
              <Link href="/signup" className="primaryBtn">
                {text("Create Free Account", "إنشاء حساب مجاني")}
              </Link>

              <Link href="/pricing" className="secondaryBtn">
                {text("Compare Plans", "مقارنة الخطط")}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
