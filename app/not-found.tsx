"use client";

import Link from "next/link";

import { useAdminLanguage } from "@/app/admin/use-admin-language";

// Follows the site language (English or Arabic) like every other page.
export default function NotFound() {
  const { isArabic, language, text } = useAdminLanguage();

  const steps = [
    {
      title: text("Start Assessment", "ابدأ التقييم"),
      meta: text("Begin with an organ health assessment.", "ابدأ بتقييم لصحة أعضاء جسمك."),
    },
    {
      title: text("Upload Lab Report", "ارفع تقرير تحليل"),
      meta: text(
        "Organize and understand uploaded medical reports.",
        "نظّم تقاريرك الطبية المرفوعة وافهمها."
      ),
    },
    {
      title: text("Health Analysis", "التحليل الصحي"),
      meta: text(
        "Turn your health data into clear next steps.",
        "حوّل بياناتك الصحية إلى خطوات تالية واضحة."
      ),
    },
  ];

  return (
    <main className="ohPageShell" dir={isArabic ? "rtl" : "ltr"} lang={language}>
      <div className="ohContainer ohStack large" style={{ padding: "48px 0 72px" }}>
        <section className="ohHero">
          <div className="ohHeroGrid">
            <div>
              <p className="ohEyebrow">{text("Page unavailable", "الصفحة غير موجودة")}</p>

              <h1 className="ohTitle">
                {text("This OrganHeal section is not available.", "هذا القسم من OrganHeal غير متاح.")}
              </h1>

              <p className="ohLead">
                {text(
                  "The page may have moved, may still be under development, or the link may be incorrect. You can return home, open your dashboard, or continue your health journey from one of the main sections.",
                  "قد تكون الصفحة انتقلت، أو ما زالت قيد التطوير، أو أن الرابط غير صحيح. يمكنك العودة إلى الصفحة الرئيسية، أو فتح لوحتك، أو متابعة رحلتك الصحية من أحد الأقسام الرئيسية."
                )}
              </p>

              <div className="ohButtonRow" style={{ marginTop: "24px" }}>
                <Link href="/" className="primaryBtn">
                  {text("Back Home", "العودة للرئيسية")}
                </Link>

                <Link href="/dashboard" className="secondaryBtn">
                  {text("Open Dashboard", "افتح اللوحة")}
                </Link>

                <Link href="/contact" className="secondaryBtn">
                  {text("Contact Support", "تواصل مع الدعم")}
                </Link>
              </div>
            </div>

            <div className="ohCard">
              <div className="ohCardHeader">
                <div>
                  <p className="ohMetricLabel">404</p>
                  <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
                    {text("Page not found", "الصفحة غير موجودة")}
                  </h2>
                </div>

                <span className="ohStatusBadge moderate">{text("Unavailable", "غير متاحة")}</span>
              </div>

              <p className="ohCardText">
                {text(
                  "No worries, you can go back to the main pages and keep using OrganHeal as usual.",
                  "لا تقلق، يمكنك الرجوع إلى الصفحات الرئيسية ومتابعة استخدام OrganHeal بشكل طبيعي."
                )}
              </p>

              <div className="ohDivider" />

              <div className="ohTimeline">
                {steps.map((step) => (
                  <div className="ohTimelineItem" key={step.title}>
                    <span className="ohTimelineDot" />
                    <div>
                      <p className="ohTimelineTitle">{step.title}</p>
                      <p className="ohTimelineMeta">{step.meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="ohGrid cols3">
          <Link href="/assessment" className="ohCard">
            <p className="ohMetricLabel">{text("Assessment", "التقييم")}</p>
            <h2 className="ohCardTitle">{text("Start Assessment", "ابدأ التقييم")}</h2>
            <p className="ohCardText">
              {text(
                "Check heart, kidney, liver, lung, brain, and metabolic health.",
                "افحص صحة القلب والكلى والكبد والرئة والدماغ والأيض."
              )}
            </p>
          </Link>

          <Link href="/lab-upload" className="ohCard">
            <p className="ohMetricLabel">{text("Reports", "التقارير")}</p>
            <h2 className="ohCardTitle">{text("Upload Lab Report", "ارفع تقرير تحليل")}</h2>
            <p className="ohCardText">
              {text(
                "Upload medical reports and prepare them for health analysis.",
                "ارفع تقاريرك الطبية وجهّزها للتحليل الصحي."
              )}
            </p>
          </Link>

          <Link href="/health-plan" className="ohCard">
            <p className="ohMetricLabel">{text("Next Step", "الخطوة التالية")}</p>
            <h2 className="ohCardTitle">{text("Health Plan", "الخطة الصحية")}</h2>
            <p className="ohCardText">
              {text(
                "Continue with a practical action plan based on your health journey.",
                "تابع بخطة عملية مبنية على رحلتك الصحية."
              )}
            </p>
          </Link>
        </section>

        <section className="ohTrustNotice">
          <span aria-hidden="true">🩺</span>
          <div>
            <strong>{text("Medical safety reminder", "تذكير بالسلامة الطبية")}</strong>
            <br />
            {text(
              "OrganHeal provides educational and organizational health analysis only and does not replace licensed medical care.",
              "يقدم OrganHeal تحليلاً صحياً تثقيفياً وتنظيمياً فقط، ولا يغني عن الرعاية الطبية المرخّصة."
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
