"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PremiumBadge from "../components/PremiumBadge";

export default function PricingPage() {
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("organheal-language") || "en";
    setLanguage(savedLanguage);

    const interval = setInterval(() => {
      setLanguage(localStorage.getItem("organheal-language") || "en");
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const isArabic = language === "ar";

  const freeFeatures = isArabic
    ? [
        "تقييم صحي أساسي",
        "مساعد صحي محدود",
        "رفع محدود للتقارير الطبية",
        "شرح صحي مبسط",
        "محتوى تثقيفي أساسي",
        "تاريخ محدود للنتائج",
      ]
    : [
        "Basic health assessment",
        "Limited health intelligence",
        "Limited medical report uploads",
        "Basic health explanation",
        "Basic education content",
        "Limited result history",
      ];

  const plusFeatures = isArabic
    ? [
        "ذكاء صحي متقدم للتقارير",
        "تقرير PDF مبسط للمريض",
        "ملخص PDF جاهز للطبيب",
        "حفظ نتائج الذكاء الصحي",
        "Health Passport",
        "الفرص الصحية المهمة",
        "الاتجاهات وإشارات المخاطر",
        "الخط الزمني الصحي",
        "متابعة وتذكيرات شهرية",
        "تحضير أفضل لزيارة الطبيب",
      ]
    : [
        "Advanced report intelligence",
        "Patient-friendly PDF report",
        "Doctor-ready brief PDF",
        "Saved intelligence history",
        "Health Passport",
        "Top health opportunities",
        "Trends and risk signals",
        "Personal health timeline",
        "Monthly follow-up and reminders",
        "Doctor visit preparation",
      ];

  const futureFeatures = isArabic
    ? [
        "ملفات صحية للعائلة",
        "بوابة الطبيب",
        "لوحة عيادات مستقبلية",
        "تذكيرات بأسلوب WhatsApp",
        "مكتبة فيديوهات صحية",
        "مشاركة ملخص الطبيب بشكل منظم",
      ]
    : [
        "Family health profiles",
        "Doctor portal",
        "Future clinic dashboard",
        "WhatsApp-style reminders",
        "Health video library",
        "Structured doctor brief sharing",
      ];

  return (
    <main
      className="homepage"
      style={{
        minHeight: "100vh",
        padding: "48px 20px 70px",
        textAlign: isArabic ? "right" : "left",
      }}
    >
      <section
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: "820px",
            margin: "0 auto 34px",
          }}
        >
          <p className="homeBadge">
            {isArabic ? "خطط OrganHeal" : "OrganHeal Plans"}
          </p>

          <h1
            style={{
              fontSize: "clamp(2.2rem, 5vw, 4rem)",
              lineHeight: 1.08,
              marginBottom: "18px",
            }}
          >
            {isArabic
              ? "ابدأ مجانًا، ثم انتقل إلى ذكاء صحي أعمق"
              : "Start free, then unlock deeper health intelligence"}
          </h1>

          <p
            style={{
              opacity: 0.82,
              lineHeight: 1.8,
              fontSize: "1.05rem",
              margin: "0 auto",
            }}
          >
            {isArabic
              ? "OrganHeal Free يساعدك على تجربة الأساسيات. OrganHeal Plus مصمم للمتابعة المستمرة، تقارير PDF، حفظ النتائج، وتحضير أفضل لمناقشة معلوماتك الصحية مع الطبيب."
              : "OrganHeal Free helps you try the basics. OrganHeal Plus is designed for ongoing follow-up, PDF reports, saved results, and better preparation for health conversations with your doctor."}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
            gap: "20px",
            alignItems: "stretch",
          }}
        >
          <div className="aiFeatureCard">
            <p className="sectionLabel">
              {isArabic ? "للبداية" : "For getting started"}
            </p>

            <h2 style={{ marginBottom: "8px" }}>OrganHeal Free</h2>

            <p
              style={{
                opacity: 0.8,
                lineHeight: 1.7,
                marginBottom: "18px",
              }}
            >
              {isArabic
                ? "تجربة أساسية آمنة تساعدك على بدء فهم صحتك بشكل أوضح."
                : "A safe basic experience to help you start understanding your health more clearly."}
            </p>

            <div
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                marginBottom: "14px",
              }}
            >
              {isArabic ? "مجاني" : "Free"}
            </div>

            <ul
              style={{
                lineHeight: 1.9,
                opacity: 0.88,
                paddingLeft: isArabic ? "0" : "20px",
                paddingRight: isArabic ? "20px" : "0",
                marginBottom: "22px",
              }}
            >
              {freeFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>

            <Link href="/assessment" className="secondaryBtn">
              {isArabic ? "ابدأ مجانًا" : "Start Free"}
            </Link>
          </div>

          <div
            className="aiFeatureCard"
            style={{
              border: "1px solid rgba(34,211,238,0.42)",
              boxShadow: "0 22px 60px rgba(34,211,238,0.1)",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                padding: "6px 12px",
                borderRadius: "999px",
                background: "rgba(34,211,238,0.12)",
                border: "1px solid rgba(34,211,238,0.22)",
                marginBottom: "14px",
                fontSize: "0.85rem",
              }}
            >
              {isArabic ? "الأفضل للمتابعة" : "Best for ongoing follow-up"}
            </div>

            <div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: isArabic ? "flex-end" : "flex-start",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "8px",
  }}
>
  <h2 style={{ margin: 0 }}>OrganHeal Plus</h2>

  <PremiumBadge label={isArabic ? "Plus" : "Plus"} />
</div>

            <p
              style={{
                opacity: 0.84,
                lineHeight: 1.7,
                marginBottom: "18px",
              }}
            >
              {isArabic
                ? "خطة متقدمة للذكاء الصحي، ملخصات PDF، حفظ النتائج، متابعة الاتجاهات، والتذكيرات الشهرية."
                : "An advanced plan for health intelligence, PDF summaries, saved results, trend tracking, and monthly reminders."}
            </p>

            <div
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                marginBottom: "4px",
              }}
            >
              {isArabic ? "قريبًا" : "Coming soon"}
            </div>

            <p
              style={{
                opacity: 0.72,
                marginBottom: "14px",
              }}
            >
              {isArabic
                ? "سيتم اعتماد السعر لاحقًا قبل تفعيل الدفع."
                : "Pricing will be approved later before payments are enabled."}
            </p>

            <ul
              style={{
                lineHeight: 1.9,
                opacity: 0.9,
                paddingLeft: isArabic ? "0" : "20px",
                paddingRight: isArabic ? "20px" : "0",
                marginBottom: "22px",
              }}
            >
              {plusFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>

            <Link href="/intelligence" className="primaryBtn">
              {isArabic ? "استكشف OrganHeal Plus" : "Explore OrganHeal Plus"}
            </Link>
          </div>
        </div>

        <section
          style={{
            marginTop: "28px",
            padding: "26px",
            borderRadius: "24px",
            background: "rgba(15,23,42,0.72)",
            border: "1px solid rgba(148,163,184,0.18)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "20px",
              alignItems: "start",
            }}
          >
            <div>
              <p className="sectionLabel">
                {isArabic ? "خطط مستقبلية" : "Future Plans"}
              </p>

              <h2>
                {isArabic
                  ? "العائلة، الطبيب، والعيادات لاحقًا"
                  : "Family, doctor, and clinic options later"}
              </h2>

              <p
                style={{
                  opacity: 0.8,
                  lineHeight: 1.7,
                }}
              >
                {isArabic
                  ? "هذه الميزات محفوظة كاتجاه مستقبلي، ولن يتم بناؤها قبل تثبيت OrganHeal Free و OrganHeal Plus."
                  : "These features are saved as a future direction and will not be built before OrganHeal Free and OrganHeal Plus are stable."}
              </p>
            </div>

            <ul
              style={{
                lineHeight: 1.9,
                opacity: 0.9,
                paddingLeft: isArabic ? "0" : "20px",
                paddingRight: isArabic ? "20px" : "0",
                margin: 0,
              }}
            >
              {futureFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        </section>

        <section
          style={{
            marginTop: "24px",
            padding: "22px",
            borderRadius: "22px",
            background: "rgba(8,13,24,0.74)",
            border: "1px solid rgba(34,211,238,0.16)",
          }}
        >
          <p className="sectionLabel">
            {isArabic ? "السلامة الطبية" : "Medical Safety"}
          </p>

          <p
            style={{
              opacity: 0.82,
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            {isArabic
              ? "OrganHeal AI يقدم ذكاء صحي تعليمي وتنظيمي فقط. لا يقدم تشخيصًا أو علاجًا أو وصفات طبية أو نصيحة طبية طارئة، ولا يستبدل الطبيب أو الرعاية الطبية المرخصة."
              : "OrganHeal AI provides educational and organizational health intelligence only. It does not diagnose, treat, prescribe, provide emergency advice, or replace licensed medical care."}
          </p>
        </section>

       <div
  style={{
    marginTop: "28px",
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    flexWrap: "wrap",
  }}
>
  <Link href="/" className="secondaryBtn">
    {isArabic ? "العودة للرئيسية" : "Back to Home"}
  </Link>

  <Link href="/reports" className="secondaryBtn">
    {isArabic ? "مكتبة التقارير" : "Reports Library"}
  </Link>

  <Link href="/assessment" className="primaryBtn">
    {isArabic ? "ابدأ التقييم" : "Start Assessment"}
  </Link>
</div>
      </section>
    </main>
  );
}
