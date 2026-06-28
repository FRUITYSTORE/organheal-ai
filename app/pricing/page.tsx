"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Language = "en" | "ar";

export default function PricingPage() {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const savedLanguage =
      (localStorage.getItem("organheal-language") as Language) || "en";

    setLanguage(savedLanguage);

    const interval = setInterval(() => {
      const currentLanguage =
        (localStorage.getItem("organheal-language") as Language) || "en";
      setLanguage(currentLanguage);
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const isArabic = language === "ar";

  const freeFeatures = isArabic
    ? [
        "تقييم صحي أساسي",
        "تجربة رفع تقرير طبي",
        "شرح صحي مبسط",
        "الوصول إلى المحتوى التعليمي",
        "بدء ملفك الصحي الشخصي",
      ]
    : [
        "Basic health assessment",
        "Try medical report upload",
        "Simple health explanation",
        "Access health education content",
        "Start your personal health profile",
      ];

  const plusFeatures = isArabic
    ? [
        "ذكاء صحي متقدم للتقارير",
        "ملخص مبسط للمريض",
        "ملخص منظم للطبيب",
        "حفظ نتائج الذكاء الصحي",
        "متابعة الاتجاهات وإشارات المخاطر",
        "خطة متابعة صحية شهرية",
        "تحضير أفضل للزيارة الطبية",
      ]
    : [
        "Advanced report intelligence",
        "Patient-friendly summary",
        "Doctor-ready brief",
        "Saved intelligence history",
        "Trends and risk signals",
        "Monthly follow-up plan",
        "Better doctor visit preparation",
      ];

  const valuePoints = isArabic
    ? [
        {
          title: "ليس قراءة واحدة فقط",
          text: "القيمة في متابعة التقارير، التقييمات، والنتائج مع الوقت.",
        },
        {
          title: "يساعدك قبل زيارة الطبيب",
          text: "ينظم أهم النقاط والأسئلة بدل الدخول للزيارة بمعلومات متفرقة.",
        },
        {
          title: "اشتراك واقعي",
          text: "العودة الشهرية تكون للتحديث، المراجعة، الخطة، والتذكيرات، وليس للفحوصات اليومية.",
        },
      ]
    : [
        {
          title: "Not a one-time reading",
          text: "The value is in following reports, assessments, and results over time.",
        },
        {
          title: "Better before doctor visits",
          text: "Organizes key points and questions instead of scattered health information.",
        },
        {
          title: "Realistic subscription value",
          text: "Monthly return is for updates, review, planning, and reminders, not daily lab testing.",
        },
      ];

  return (
    <main className="launchPage pricingLaunchPage" dir={isArabic ? "rtl" : "ltr"}>
      <section className="launchSection pricingHeroSection">
        <div className="launchSectionHeader">
          <p className="launchEyebrow">
            {isArabic ? "خطط OrganHeal" : "OrganHeal Plans"}
          </p>

          <h1 className="pricingHeroTitle">
            {isArabic
              ? "ابدأ مجانًا، ثم انتقل إلى متابعة صحية أعمق"
              : "Start free, then move into deeper health follow-up"}
          </h1>

          <p>
            {isArabic
              ? "OrganHeal Free يساعدك على تجربة الأساسيات. OrganHeal Plus سيكون مخصصًا للمستخدم الذي يريد حفظ النتائج، فهم التقارير، متابعة التغيرات، وتجهيز ملخصات منظمة للطبيب."
              : "OrganHeal Free helps you try the basics. OrganHeal Plus will be designed for users who want saved results, report understanding, trend follow-up, and doctor-ready summaries."}
          </p>
        </div>

        <div className="pricingStatusBanner">
          <strong>
            {isArabic ? "ملاحظة قبل الإطلاق التجاري" : "Pre-commercial launch note"}
          </strong>
          <span>
            {isArabic
              ? "الدفع غير مفعل حاليًا. السعر النهائي سيتم اعتماده لاحقًا قبل فتح الاشتراكات المدفوعة."
              : "Payments are not active yet. Final pricing will be approved later before paid subscriptions are enabled."}
          </span>
        </div>
      </section>

      <section className="launchSection">
        <div className="launchPlanGrid">
          <article className="launchPlanCard pricingPlan">
            <p className="launchEyebrow">
              {isArabic ? "للبداية" : "For getting started"}
            </p>

            <h2>OrganHeal Free</h2>

            <div className="pricingAmount">
              {isArabic ? "مجاني" : "Free"}
            </div>

            <p>
              {isArabic
                ? "خطة البداية لتجربة التقييم الصحي وفهم كيف يستطيع OrganHeal تنظيم معلوماتك الصحية."
                : "The starting plan for trying health assessment and seeing how OrganHeal organizes your health information."}
            </p>

            <ul>
              {freeFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>

            <Link href="/signup" className="launchSecondary">
              {isArabic ? "ابدأ مجانًا" : "Start Free"}
            </Link>
          </article>

          <article className="launchPlanCard launchPlanFeatured pricingPlan">
            <p className="launchEyebrow">
              {isArabic ? "للمتابعة الشهرية" : "For monthly follow-up"}
            </p>

            <h2>OrganHeal Plus</h2>

            <div className="pricingAmount">
              {isArabic ? "سيتم تحديد السعر" : "Pricing to be approved"}
            </div>

            <p>
              {isArabic
                ? "خطة Plus ستكون للمتابعة المستمرة: تقارير محفوظة، ملخصات PDF، اتجاهات صحية، وخطة متابعة شهرية."
                : "Plus will support ongoing follow-up: saved reports, PDF summaries, health trends, and monthly planning."}
            </p>

            <ul>
              {plusFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>

            <Link href="/intelligence" className="launchPrimary">
              {isArabic ? "استكشف الذكاء الصحي" : "Explore Intelligence"}
            </Link>
          </article>
        </div>
      </section>

      <section className="launchSection">
        <div className="launchSectionHeader">
          <p className="launchEyebrow">
            {isArabic ? "لماذا Plus؟" : "Why Plus?"}
          </p>

          <h2>
            {isArabic
              ? "الاشتراك يجب أن يعطي سببًا واضحًا للعودة"
              : "A subscription needs a clear reason to return"}
          </h2>

          <p>
            {isArabic
              ? "OrganHeal Plus ليس مجرد تحليل تقرير. الفكرة أن يكون للمستخدم مكان واحد يعود إليه لمراجعة صحته، تحديث بياناته، حفظ التقارير، وتحضير أسئلة أفضل للطبيب."
              : "OrganHeal Plus is not just report analysis. It gives users one place to return to for reviewing health, updating data, saving reports, and preparing better questions for doctors."}
          </p>
        </div>

        <div className="pricingMiniGrid">
          {valuePoints.map((item) => (
            <article className="launchValueCard" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="launchSection">
        <div className="pricingCompareBox">
          <div>
            <h2>{isArabic ? "مقارنة سريعة" : "Quick comparison"}</h2>
            <p>
              {isArabic
                ? "ابدأ مجانًا، ثم استخدم Plus عندما تحتاج متابعة أعمق وحفظًا أفضل لمعلوماتك الصحية."
                : "Start free, then use Plus when you need deeper follow-up and better saved health intelligence."}
            </p>
          </div>

          <div className="pricingCompareTable">
            <div>
              <span>{isArabic ? "التجربة الأساسية" : "Basic experience"}</span>
              <strong>Free</strong>
            </div>

            <div>
              <span>{isArabic ? "متابعة التقارير" : "Report follow-up"}</span>
              <strong>Plus</strong>
            </div>

            <div>
              <span>{isArabic ? "ملخصات PDF" : "PDF summaries"}</span>
              <strong>Plus</strong>
            </div>

            <div>
              <span>{isArabic ? "الخطة الشهرية" : "Monthly plan"}</span>
              <strong>Plus</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="launchFinalCta">
        <p className="launchEyebrow">
          {isArabic ? "ابدأ الآن" : "Start now"}
        </p>

        <h2>
          {isArabic
            ? "جرّب OrganHeal قبل تفعيل الاشتراكات"
            : "Try OrganHeal before subscriptions are activated"}
        </h2>

        <p>
          {isArabic
            ? "ابدأ بالحساب المجاني، اختبر التقييم ورفع التقارير، ثم نجهّز Plus كطبقة متابعة شهرية أقوى."
            : "Start with a free account, test assessment and report upload, then Plus can become the stronger monthly follow-up layer."}
        </p>

        <div className="launchHeroActions">
          <Link href="/signup" className="launchPrimary">
            {isArabic ? "أنشئ حسابًا مجانيًا" : "Create Free Account"}
          </Link>

          <Link href="/about" className="launchSecondary">
            {isArabic ? "تعرف على OrganHeal" : "Learn More"}
          </Link>
        </div>

        <small>
          {isArabic
            ? "OrganHeal AI يقدم معلومات صحية تعليمية وتنظيمية فقط، ولا يقدم تشخيصًا أو علاجًا أو نصيحة طبية طارئة."
            : "OrganHeal AI provides educational and organizational health intelligence only. It does not provide diagnosis, treatment, or emergency medical advice."}
        </small>
      </section>
    </main>
  );
}