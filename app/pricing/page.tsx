"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Language = "en" | "ar";

type Plan = {
  name: string;
  nameAr: string;
  price: string;
  priceAr: string;
  note: string;
  noteAr: string;
  description: string;
  descriptionAr: string;
  features: string[];
  featuresAr: string[];
  action: string;
  actionAr: string;
  href: string | null;
  available: boolean;
};

const plans: Plan[] = [
  {
    name: "Free",
    nameAr: "المجاني",
    price: "$0",
    priceAr: "$0",
    note: "Understand your health",
    noteAr: "افهم صحتك",
    description:
      "Start with meaningful health intelligence. Organize reports, understand important findings, and know what to review next.",
    descriptionAr:
      "ابدأ بذكاء صحي مفيد فعليًا. نظّم تقاريرك، وافهم النتائج المهمة، واعرف ما الذي يستحق المراجعة بعد ذلك.",
    features: [
      "Upload and organize health reports",
      "Understand important findings in clear language",
      "Ask OrganHeal about reports and health questions",
      "Review next-step and doctor-preparation guidance",
      "Build your private health history",
    ],
    featuresAr: [
      "رفع وتنظيم التقارير الصحية",
      "فهم النتائج المهمة بلغة واضحة",
      "سؤال OrganHeal عن التقارير والأسئلة الصحية",
      "مراجعة الخطوة التالية والتحضير لزيارة الطبيب",
      "بناء سجلك الصحي الخاص",
    ],
    action: "Start Free",
    actionAr: "ابدأ مجانًا",
    href: "/signup",
    available: true,
  },
  {
    name: "Plus",
    nameAr: "بلس",
    price: "Coming soon",
    priceAr: "قريبًا",
    note: "Go deeper over time",
    noteAr: "فهم أعمق مع مرور الوقت",
    description:
      "Designed for deeper, ongoing intelligence as your health history grows and more context becomes available.",
    descriptionAr:
      "مصمم لذكاء صحي أعمق ومستمر كلما نما سجلك الصحي وتوفّر سياق أكبر عن رحلتك الصحية.",
    features: [
      "Deeper multi-report health synthesis",
      "Recurring-pattern intelligence across your history",
      "Richer longitudinal trends and health story",
      "More adaptive follow-up over time",
      "Advanced doctor-ready summaries from accumulated context",
    ],
    featuresAr: [
      "تحليل أعمق يربط عدة تقارير صحية",
      "التعرّف على الأنماط المتكررة عبر سجلك الصحي",
      "اتجاهات زمنية وقصة صحية أكثر عمقًا",
      "متابعة أكثر تكيفًا مع تطور حالتك الصحية",
      "ملخصات متقدمة للطبيب مبنية على السياق المتراكم",
    ],
    action: "Plus coming soon",
    actionAr: "OrganHeal Plus قريبًا",
    href: null,
    available: false,
  },
];

function getStoredLanguage(): Language {
  if (typeof window === "undefined") {
    return "en";
  }

  const savedLanguage =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("organheal_language") ||
    localStorage.getItem("language") ||
    "";

  return savedLanguage.toLowerCase().startsWith("ar") ? "ar" : "en";
}

export default function PricingPage() {
  const [language, setLanguage] = useState<Language>("en");

  const isArabic = language === "ar";

  useEffect(() => {
    function syncLanguage() {
      const selectedLanguage = getStoredLanguage();

      setLanguage(selectedLanguage);
      document.documentElement.lang = selectedLanguage;
      document.documentElement.dir =
        selectedLanguage === "ar" ? "rtl" : "ltr";
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
      className="ohPageShell pricingPage"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <style>{`
        .pricingPage,
        .pricingPage * {
          box-sizing: border-box;
        }

        .pricingPage .pricingHero {
          position: relative;
          overflow: hidden;
        }

        .pricingPage .pricingHero::before {
          content: "";
          position: absolute;
          width: 360px;
          height: 360px;
          top: -180px;
          inset-inline-end: -130px;
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(20, 184, 166, 0.17),
            transparent 68%
          );
          pointer-events: none;
        }

        .pricingPage .pricingHeroContent {
          position: relative;
          z-index: 1;
          max-width: 900px;
        }

        .pricingPage .pricingGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 22px;
          align-items: stretch;
        }

        .pricingPage .pricingCard {
          position: relative;
          display: flex;
          flex-direction: column;
          min-height: 520px;
          padding: 30px;
          overflow: hidden;
          background: var(--oh-c-bg-white, #ffffff);
          border: 1px solid color-mix(in srgb, var(--oh-line-base, #0f172a) calc(14% * var(--oh-line-scale, 1)), transparent);
          box-shadow: 0 22px 52px rgba(15, 23, 42, 0.08);
        }

        .pricingPage .pricingCardFree {
          border: 2px solid rgba(15, 118, 110, 0.72);
          box-shadow: 0 26px 62px rgba(15, 118, 110, 0.14);
        }

        .pricingPage .pricingCardPlus {
          border-color: rgba(99, 102, 241, 0.26);
          background:
            radial-gradient(
              circle at 90% 0%,
              rgba(99, 102, 241, 0.11),
              transparent 34%
            ),
            var(--oh-c-bg-white, #ffffff);
        }

        .pricingPage .pricingPlanTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .pricingPage .pricingPlanStatus {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.18);
          color: var(--oh-c-ink-indigo-700, #4338ca);
          font-size: 0.72rem;
          font-weight: 900;
          white-space: nowrap;
        }

        .pricingPage .pricingPrice {
          margin: 14px 0 0;
          color: var(--oh-text, #0f172a);
          font-size: clamp(2rem, 4vw, 3.4rem);
          font-weight: 950;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .pricingPage .pricingDescription {
          margin: 18px 0 0;
          color: var(--oh-soft-text, #475569);
          line-height: 1.7;
        }

        .pricingPage .pricingFeatureList {
          display: grid;
          gap: 13px;
          margin-top: 24px;
          padding-top: 22px;
          border-top: 1px solid rgba(148, 163, 184, 0.2);
        }

        .pricingPage .pricingFeature {
          display: grid;
          grid-template-columns: 24px minmax(0, 1fr);
          gap: 10px;
          align-items: flex-start;
          margin: 0;
          color: var(--oh-c-ink-ink-700, #334155);
          line-height: 1.55;
        }

        .pricingPage .pricingFeatureMark {
          display: inline-grid;
          width: 22px;
          height: 22px;
          place-items: center;
          border-radius: 999px;
          background: rgba(20, 184, 166, 0.12);
          color: var(--oh-c-ink-teal-700, #0f766e);
          font-size: 0.72rem;
          font-weight: 950;
        }

        .pricingPage .pricingAction {
          width: 100%;
          min-height: 50px;
          justify-content: center;
          margin-top: auto;
          padding-top: 14px;
          padding-bottom: 14px;
          border-radius: 14px;
          font-weight: 950;
        }

        .pricingPage .pricingDisabledAction {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 50px;
          margin-top: auto;
          padding: 14px 18px;
          border: 1px solid rgba(99, 102, 241, 0.18);
          border-radius: 14px;
          background: rgba(99, 102, 241, 0.08);
          color: var(--oh-c-ink-indigo-600, #4f46e5);
          font: inherit;
          font-weight: 900;
          cursor: default;
        }

        .pricingPage .pricingPrinciplePanel {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
          gap: 24px;
          align-items: center;
        }

        .pricingPage .pricingPrinciples {
          display: grid;
          gap: 12px;
        }

        .pricingPage .pricingPrinciple {
          padding: 15px 17px;
          border-radius: 16px;
          background: color-mix(in srgb, var(--oh-c-bg-slate-50, #f8fafc) 92%, transparent);
          border: 1px solid rgba(148, 163, 184, 0.18);
        }

        .pricingPage .pricingPrinciple strong {
          display: block;
          color: var(--oh-text, #0f172a);
        }

        .pricingPage .pricingPrinciple span {
          display: block;
          margin-top: 4px;
          color: var(--oh-muted, #64748b);
          font-size: 0.9rem;
          line-height: 1.55;
        }

        @media (max-width: 820px) {
          .pricingPage .pricingGrid,
          .pricingPage .pricingPrinciplePanel {
            grid-template-columns: 1fr;
          }

          .pricingPage .pricingCard {
            min-height: 0;
          }
        }
      `}</style>

      <div
        className="ohContainer ohStack large"
        style={{ padding: "32px 0 64px" }}
      >
        <section className="ohHero pricingHero">
          <div className="pricingHeroContent">
            <p className="ohEyebrow">
              {text("OrganHeal Plans", "خطط OrganHeal")}
            </p>

            <h1 className="ohTitle">
              {text(
                "Start with real health intelligence. Go deeper when you need more.",
                "ابدأ بذكاء صحي حقيقي. وتعمّق أكثر عندما تحتاج إلى ذلك."
              )}
            </h1>

            <p className="ohLead">
              {text(
                "Free is designed to help you understand what matters now. Plus is being built for deeper, ongoing intelligence as your health history grows.",
                "الخطة المجانية مصممة لمساعدتك على فهم ما يهم الآن. أما Plus فهي قيد التطوير لتقديم ذكاء صحي أعمق ومستمر كلما نما سجلك الصحي."
              )}
            </p>

            <div className="ohButtonRow" style={{ marginTop: "24px" }}>
              <Link href="/signup" className="primaryBtn">
                {text("Start Free", "ابدأ مجانًا")}
              </Link>

              <Link href="/features" className="secondaryBtn">
                {text("Explore Features", "استكشف الميزات")}
              </Link>
            </div>
          </div>
        </section>

        <section className="pricingGrid">
          {plans.map((plan) => {
            const features = isArabic ? plan.featuresAr : plan.features;

            return (
              <article
                className={`ohCard pricingCard ${
                  plan.available ? "pricingCardFree" : "pricingCardPlus"
                }`}
                key={plan.name}
              >
                <div className="pricingPlanTop">
                  <div>
                    <p className="ohEyebrow">
                      {isArabic ? plan.noteAr : plan.note}
                    </p>

                    <h2
                      className="ohCardTitle"
                      style={{ fontSize: "1.7rem" }}
                    >
                      OrganHeal {isArabic ? plan.nameAr : plan.name}
                    </h2>
                  </div>

                  {!plan.available && (
                    <span className="pricingPlanStatus">
                      {text("Coming soon", "قريبًا")}
                    </span>
                  )}
                </div>

                <p className="pricingPrice">
                  {isArabic ? plan.priceAr : plan.price}
                </p>

                <p className="pricingDescription">
                  {isArabic ? plan.descriptionAr : plan.description}
                </p>

                <div className="pricingFeatureList">
                  {features.map((feature) => (
                    <p className="pricingFeature" key={feature}>
                      <span
                        className="pricingFeatureMark"
                        aria-hidden="true"
                      >
                        ✓
                      </span>

                      <span>{feature}</span>
                    </p>
                  ))}
                </div>

                {plan.href ? (
                  <Link
                    href={plan.href}
                    className="primaryBtn pricingAction"
                  >
                    {isArabic ? plan.actionAr : plan.action}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="pricingDisabledAction"
                    disabled
                  >
                    {isArabic ? plan.actionAr : plan.action}
                  </button>
                )}
              </article>
            );
          })}
        </section>

        <section className="ohCard pricingPrinciplePanel">
          <div>
            <p className="ohEyebrow">
              {text(
                "What Plus is for",
                "ما الذي تقدمه Plus"
              )}
            </p>

            <h2 className="ohCardTitle" style={{ fontSize: "1.8rem" }}>
              {text(
                "More depth, continuity, and personalization — not a safer answer behind a paywall.",
                "عمق واستمرارية وتخصيص أكبر — وليس إجابة صحية أكثر أمانًا خلف اشتراك مدفوع."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "OrganHeal Plus is intended to become more useful as your health history grows, connecting more context across reports, follow-up, and your ongoing health journey.",
                "تهدف OrganHeal Plus إلى أن تصبح أكثر فائدة كلما نما سجلك الصحي، من خلال ربط سياق أوسع بين التقارير والمتابعة ورحلتك الصحية المستمرة."
              )}
            </p>
          </div>

          <div className="pricingPrinciples">
            <div className="pricingPrinciple">
              <strong>{text("Depth", "العمق")}</strong>
              <span>
                {text(
                  "Go beyond a single result into richer connected health intelligence.",
                  "انتقل من فهم نتيجة واحدة إلى ذكاء صحي أعمق وأكثر ترابطًا."
                )}
              </span>
            </div>

            <div className="pricingPrinciple">
              <strong>{text("Continuity", "الاستمرارية")}</strong>
              <span>
                {text(
                  "Understand how your health story develops across time and new information.",
                  "افهم كيف تتطور قصتك الصحية مع مرور الوقت ومع إضافة معلومات جديدة."
                )}
              </span>
            </div>

            <div className="pricingPrinciple">
              <strong>{text("Personalization", "التخصيص")}</strong>
              <span>
                {text(
                  "Use more of your accumulated health context to make the experience increasingly relevant.",
                  "استخدم سياقًا أكبر من سجلك الصحي لتصبح التجربة أكثر ارتباطًا بك مع الوقت."
                )}
              </span>
            </div>
          </div>
        </section>

        <section className="ohActionPanel">
          <div>
            <p className="ohEyebrow">
              {text("Health safety", "السلامة الصحية")}
            </p>

            <h2 className="ohCardTitle">
              {text(
                "Important health understanding should not depend on an upgrade.",
                "فهم المعلومات الصحية المهمة يجب ألا يعتمد على الترقية إلى خطة مدفوعة."
              )}
            </h2>

            <p className="ohCardText">
              {text(
                "OrganHeal supports education, organization, and preparation. Safety guidance, important findings, and appropriate clinical boundaries should remain clear regardless of plan.",
                "يدعم OrganHeal التثقيف والتنظيم والتحضير. ويجب أن تبقى إرشادات السلامة والنتائج المهمة والحدود السريرية المناسبة واضحة بغض النظر عن الخطة."
              )}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}