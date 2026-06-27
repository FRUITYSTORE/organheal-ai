"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ReportsPage() {
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
            {isArabic ? "مكتبة التقارير الطبية" : "Medical Reports Library"}
          </p>

          <h1
            style={{
              fontSize: "clamp(2.2rem, 5vw, 4rem)",
              lineHeight: 1.08,
              marginBottom: "18px",
            }}
          >
            {isArabic
              ? "كل تقاريرك الطبية ونتائج الذكاء الصحي في مكان واحد"
              : "Your medical reports and health intelligence in one place"}
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
              ? "هذه الصفحة ستكون مركزًا مستقلًا لعرض التقارير الطبية المرفوعة، نتائج الذكاء الصحي المحفوظة، وملخصات PDF للمريض والطبيب."
              : "This page will become a dedicated place to view uploaded medical reports, saved intelligence results, and patient or doctor PDF summaries."}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "18px",
            marginBottom: "28px",
          }}
        >
          <div className="aiFeatureCard">
            <div>📄</div>
            <h3>{isArabic ? "التقارير المرفوعة" : "Uploaded Reports"}</h3>
            <p>
              {isArabic
                ? "عرض التقارير الطبية التي تم رفعها سابقًا داخل حسابك."
                : "View medical reports that were previously uploaded to your account."}
            </p>
          </div>

          <div className="aiFeatureCard">
            <div>🧠</div>
            <h3>
              {isArabic
                ? "نتائج الذكاء الصحي"
                : "Saved Intelligence Results"}
            </h3>
            <p>
              {isArabic
                ? "الوصول إلى نتائج التحليل الصحي المحفوظة لكل تقرير."
                : "Access saved health intelligence results generated for each report."}
            </p>
          </div>

          <div className="aiFeatureCard">
            <div>👤</div>
            <h3>
              {isArabic ? "تقرير مبسط للمريض" : "Patient-Friendly PDF"}
            </h3>
            <p>
              {isArabic
                ? "تحميل ملخص مبسط يساعدك على فهم التقرير بلغة واضحة."
                : "Download a simple summary that helps you understand your report clearly."}
            </p>
          </div>

          <div className="aiFeatureCard">
            <div>🩺</div>
            <h3>{isArabic ? "ملخص جاهز للطبيب" : "Doctor-Ready Brief"}</h3>
            <p>
              {isArabic
                ? "تحضير ملخص منظم يساعدك على مناقشة التقرير مع الطبيب."
                : "Prepare a structured brief to support better discussion with your doctor."}
            </p>
          </div>
        </div>

        <section
          style={{
            padding: "26px",
            borderRadius: "24px",
            background: "rgba(15,23,42,0.72)",
            border: "1px solid rgba(148,163,184,0.18)",
            marginBottom: "24px",
          }}
        >
          <p className="sectionLabel">
            {isArabic ? "حالة الصفحة" : "Page Status"}
          </p>

          <h2>
            {isArabic
              ? "تم تجهيز الصفحة الأساسية"
              : "The reports page shell is ready"}
          </h2>

          <p
            style={{
              opacity: 0.82,
              lineHeight: 1.8,
              marginBottom: "18px",
            }}
          >
            {isArabic
              ? "في الخطوات القادمة سنربط هذه الصفحة بالتقارير الفعلية المحفوظة، ثم نضيف أزرار العرض، فتح التقرير، والانتقال إلى مركز الذكاء الصحي."
              : "In the next steps, this page will be connected to saved reports, then report actions such as view result, open report, and continue in Intelligence Center will be added."}
          </p>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <Link href="/lab-upload" className="primaryBtn">
              {isArabic ? "ارفع تقريرًا طبيًا" : "Upload Medical Report"}
            </Link>

            <Link href="/intelligence" className="secondaryBtn">
              {isArabic ? "افتح مركز الذكاء" : "Open Intelligence Center"}
            </Link>
          </div>
        </section>

        <section
          style={{
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
              ? "OrganHeal AI يقدم معلومات صحية تعليمية وتنظيمية فقط. لا يقدم تشخيصًا أو علاجًا أو نصيحة طبية طارئة، ولا يستبدل الطبيب أو الرعاية الطبية المرخصة."
              : "OrganHeal AI provides educational and organizational health intelligence only. It does not diagnose, treat, provide emergency advice, or replace licensed medical care."}
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

          <Link href="/pricing" className="secondaryBtn">
            {isArabic ? "عرض الخطط" : "View Plans"}
          </Link>
        </div>
      </section>
    </main>
  );
}