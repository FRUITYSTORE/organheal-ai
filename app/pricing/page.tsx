"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
        "تقييمات صحية أساسية للأعضاء",
        "Dashboard مبسط لبدء الرحلة",
        "رفع محدود للتقارير الطبية",
        "Check-In صحي أساسي",
        "شرح صحي تعليمي مبسط",
      ]
    : [
        "Basic organ health assessments",
        "Simple dashboard to start the journey",
        "Limited medical report uploads",
        "Basic wellness check-ins",
        "Simple educational health explanations",
      ];

  const plusFeatures = isArabic
    ? [
        "ذكاء صحي متقدم للتقارير الطبية",
        "Patient-Friendly PDF قابل للمشاركة",
        "Doctor Brief منظم للتحضير للزيارة",
        "حفظ نتائج الذكاء الصحي داخل الحساب",
        "Health Plan شخصي مبني على البيانات",
        "Follow-Up Intelligence وخطوة تالية واضحة",
        "Health History لمتابعة التغير مع الوقت",
        "قيمة أعلى للمستخدم الذي يتابع صحته شهريًا",
      ]
    : [
        "Advanced medical report intelligence",
        "Patient-friendly PDF summary",
        "Doctor-ready brief for visit preparation",
        "Saved intelligence results inside the account",
        "Personal health plan based on connected data",
        "Follow-up intelligence with a clear next best action",
        "Health History to track changes over time",
        "Higher value for users who follow their health monthly",
      ];

  const futureFeatures = isArabic
    ? [
        "تذكيرات ذكية عبر البريد أو WhatsApp-style",
        "ملفات عائلية",
        "تعاون أعمق مع الطبيب",
        "تنبيهات عند تغير الأنماط الصحية",
      ]
    : [
        "Smart email or WhatsApp-style reminders",
        "Family profiles",
        "Deeper doctor collaboration",
        "Alerts when health patterns change",
      ];

  const comparisonRows = isArabic
    ? [
        ["التقييمات الصحية", "أساسي", "متقدم ومربوط بالخطة"],
        ["رفع التقارير", "محدود", "أوسع ومنظم داخل Reports Library"],
        ["Generated Intelligence", "محدود", "أساسي في Plus"],
        ["Patient PDF", "غير متاح أو محدود", "متاح"],
        ["Doctor Brief", "غير متاح أو محدود", "متاح"],
        ["Health Plan", "عام", "شخصي ومبني على البيانات"],
        ["Health History", "أساسي", "متابعة أوضح للتغيرات"],
      ]
    : [
        ["Health assessments", "Basic", "Advanced and connected to the plan"],
        ["Report uploads", "Limited", "Expanded and organized in Reports Library"],
        ["Generated Intelligence", "Limited", "Core Plus value"],
        ["Patient PDF", "Unavailable or limited", "Available"],
        ["Doctor Brief", "Unavailable or limited", "Available"],
        ["Health Plan", "General", "Personalized from connected data"],
        ["Health History", "Basic", "Clearer trend tracking"],
      ];

  return (
    <main className="pricingValuePage" dir={isArabic ? "rtl" : "ltr"}>
      <section className="pricingValueHero">
        <p className="launchEyebrow">
          {isArabic ? "خطط OrganHeal" : "OrganHeal Plans"}
        </p>

        <h1>
          {isArabic
            ? "ابدأ مجانًا، ثم انتقل إلى متابعة صحية أعمق"
            : "Start free, then move into deeper health follow-up"}
        </h1>

        <p>
          {isArabic
            ? "OrganHeal Free يساعدك على تجربة الأساسيات. OrganHeal Plus مصمم للمستخدم الذي يريد حفظ التقارير، توليد ذكاء صحي، تحضير Doctor Brief، ومتابعة خطة صحية شخصية بشكل مستمر."
            : "OrganHeal Free helps users try the basics. OrganHeal Plus is designed for people who want saved reports, generated health intelligence, doctor-ready briefs, and a personalized follow-up plan over time."}
        </p>

        <div className="pricingStatusBanner">
          <strong>
            {isArabic ? "ملاحظة حالية:" : "Current status:"}
          </strong>
          <span>
            {isArabic
              ? "الدفع والاشتراكات غير مفعلة بعد. هذه الصفحة توضّح هيكل القيمة المتوقع قبل تفعيل الدفع."
              : "Payments and subscriptions are not enabled yet. This page explains the intended value structure before payment activation."}
          </span>
        </div>
      </section>

      <section className="pricingPlanGrid">
        <article className="pricingPlanCard">
          <div className="pricingPlanTop">
            <span>{isArabic ? "للبداية" : "Starter"}</span>
            <h2>OrganHeal Free</h2>
          </div>

          <p>
            {isArabic
              ? "مناسب لتجربة OrganHeal وفهم الفكرة الأساسية."
              : "Best for trying OrganHeal and understanding the core experience."}
          </p>

          <div className="pricingAmount">
            {isArabic ? "مجاني" : "Free"}
          </div>

          <ul>
            {freeFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>

          <Link href="/signup" className="launchSecondary">
            {isArabic ? "ابدأ مجانًا" : "Start Free"}
          </Link>
        </article>

        <article className="pricingPlanCard pricingPlanFeatured">
          <div className="pricingPlanTop">
            <span>{isArabic ? "قيمة الاشتراك" : "Subscription value"}</span>
            <h2>OrganHeal Plus</h2>
          </div>

          <p>
            {isArabic
              ? "الخطة التي تعطي OrganHeal قيمته الشهرية: تقارير محفوظة، ذكاء صحي، PDF للمريض، Doctor Brief، وخطة متابعة شخصية."
              : "The plan that creates monthly value: saved reports, health intelligence, patient PDF, doctor brief, and a personalized follow-up plan."}
          </p>

          <div className="pricingAmount premium">
            {isArabic ? "السعر لاحقًا" : "Price to be announced"}
          </div>

          <ul>
            {plusFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>

          <Link href="/intelligence" className="launchPrimary">
            {isArabic ? "استكشف قيمة Plus" : "Explore Plus Value"}
          </Link>
        </article>
      </section>

      <section className="pricingCompareBox">
        <div>
          <p className="launchEyebrow">
            {isArabic ? "المقارنة" : "Comparison"}
          </p>

          <h2>
            {isArabic
              ? "الفرق الحقيقي ليس عدد الصفحات، بل استمرار المتابعة"
              : "The real difference is not pages, it is continuous follow-up"}
          </h2>

          <p>
            {isArabic
              ? "Free يشرح البداية. Plus يربط التقارير والذكاء الصحي والخطة والتاريخ الصحي في تجربة متابعة واحدة."
              : "Free explains the starting point. Plus connects reports, intelligence, health plan, and history into one follow-up experience."}
          </p>
        </div>

        <div className="pricingCompareTable">
          {comparisonRows.map(([feature, free, plus]) => (
            <div key={feature}>
              <span>{feature}</span>
              <strong>{free}</strong>
              <strong>{plus}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="pricingValueSection">
        <div className="pricingValueHeader">
          <p className="launchEyebrow">
            {isArabic ? "لماذا يدفع المستخدم؟" : "Why would users subscribe?"}
          </p>

          <h2>
            {isArabic
              ? "القيمة الشهرية تأتي من المتابعة وليس من تقرير واحد"
              : "Monthly value comes from follow-up, not one report"}
          </h2>

          <p>
            {isArabic
              ? "المستخدم لا يدفع فقط مقابل قراءة تقرير. يدفع لأنه يريد معرفة ماذا يفعل بعد التقرير، كيف يتابع، وما الذي تغير مع الوقت."
              : "Users do not pay only to read a report. They pay to know what to do after the report, how to follow up, and what changed over time."}
          </p>
        </div>

        <div className="pricingValueCards">
          <article>
            <span>01</span>
            <h3>{isArabic ? "تنظيم التقارير" : "Report organization"}</h3>
            <p>
              {isArabic
                ? "كل تقرير محفوظ ومربوط بمسار واضح داخل Reports Library وIntelligence Center."
                : "Every report is saved and connected to a clear path inside Reports Library and Intelligence Center."}
            </p>
          </article>

          <article>
            <span>02</span>
            <h3>{isArabic ? "تفسير قابل للفهم" : "Understandable intelligence"}</h3>
            <p>
              {isArabic
                ? "تحويل التقارير إلى ملخص مفهوم للمريض وBrief منظم للطبيب."
                : "Turning reports into a patient-friendly summary and a doctor-ready brief."}
            </p>
          </article>

          <article>
            <span>03</span>
            <h3>{isArabic ? "خطة متابعة" : "Follow-up plan"}</h3>
            <p>
              {isArabic
                ? "Health Plan يربط التقييمات، التقارير، الذكاء الصحي، Check-Ins، والتاريخ الصحي."
                : "Health Plan connects assessments, reports, generated intelligence, check-ins, and health history."}
            </p>
          </article>

          <article>
            <span>04</span>
            <h3>{isArabic ? "استمرارية" : "Continuity"}</h3>
            <p>
              {isArabic
                ? "القيمة تزيد كلما عاد المستخدم وأضاف Check-In أو تقرير جديد أو نتيجة متابعة."
                : "Value increases as the user returns with check-ins, new reports, or follow-up results."}
            </p>
          </article>
        </div>
      </section>

      <section className="pricingFutureBox">
        <div>
          <p className="launchEyebrow">
            {isArabic ? "ميزات مستقبلية" : "Future premium layer"}
          </p>

          <h2>
            {isArabic
              ? "Premium لاحقًا، وليس الآن"
              : "Premium later, not now"}
          </h2>

          <p>
            {isArabic
              ? "هذه الميزات لا نحتاج بناءها قبل تثبيت Free وPlus. نذكرها كاتجاه مستقبلي بدون وعد تفعيل فوري."
              : "These features do not need to be built before Free and Plus are stable. They are positioned as a future direction without promising immediate activation."}
          </p>
        </div>

        <ul>
          {futureFeatures.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>

      <section className="pricingFinalCta">
        <h2>
          {isArabic
            ? "ابدأ بالبيانات، ثم ابنِ المتابعة"
            : "Start with data, then build follow-up"}
        </h2>

        <p>
          {isArabic
            ? "ابدأ بتقييم مجاني، ارفع تقريرًا عند توفره، ثم افتح Intelligence وHealth Plan لرؤية القيمة الكاملة."
            : "Start with a free assessment, upload a report when available, then open Intelligence and Health Plan to see the full value."}
        </p>

        <div className="pricingCtaActions">
          <Link href="/signup" className="launchPrimary">
            {isArabic ? "أنشئ حسابًا مجانيًا" : "Create Free Account"}
          </Link>

          <Link href="/lab-upload" className="launchSecondary">
            {isArabic ? "ارفع تقريرًا" : "Upload Report"}
          </Link>

          <Link href="/health-plan" className="launchSecondary">
            {isArabic ? "خطة المتابعة" : "Health Plan"}
          </Link>
        </div>

        <small>
          {isArabic
            ? "OrganHeal AI يقدم ذكاء صحي تعليمي وتنظيمي فقط، ولا يقدم تشخيصًا أو علاجًا أو وصفات طبية أو نصيحة طبية طارئة."
            : "OrganHeal AI provides educational and organizational health intelligence only. It does not diagnose, treat, prescribe, provide emergency advice, or replace licensed medical care."}
        </small>
      </section>
    </main>
  );
}