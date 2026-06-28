"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Language = "en" | "ar";

export default function SiteFooter() {
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

  return (
    <footer className="siteFooter" dir={isArabic ? "rtl" : "ltr"}>
      <div className="siteFooterGrid">
        <div>
          <h3>OrganHeal AI</h3>
          <p>
            {isArabic
              ? "نظام ذكاء صحي شخصي يساعد المستخدمين على فهم التقييمات الصحية، التقارير الطبية، ونتائج المختبر بطريقة أوضح وأكثر تنظيمًا."
              : "A personal health intelligence system designed to help users understand assessments, medical reports, and lab results more clearly."}
          </p>
        </div>

        <div>
          <h4>{isArabic ? "المنصة" : "Platform"}</h4>
          <nav className="siteFooterLinks">
            <Link href="/about">{isArabic ? "عن OrganHeal" : "About"}</Link>
            <Link href="/assessment">{isArabic ? "التقييم الصحي" : "Assessment"}</Link>
            <Link href="/reports">{isArabic ? "التقارير" : "Reports"}</Link>
            <Link href="/intelligence">{isArabic ? "الذكاء الصحي" : "Intelligence"}</Link>
            <Link href="/pricing">{isArabic ? "الأسعار" : "Pricing"}</Link>
          </nav>
        </div>

        <div>
          <h4>{isArabic ? "الثقة والسلامة" : "Trust & Safety"}</h4>
          <nav className="siteFooterLinks">
            <Link href="/privacy">{isArabic ? "سياسة الخصوصية" : "Privacy Policy"}</Link>
            <Link href="/terms">{isArabic ? "شروط الاستخدام" : "Terms of Use"}</Link>
            <Link href="/medical-disclaimer">
              {isArabic ? "إخلاء المسؤولية الطبية" : "Medical Disclaimer"}
            </Link>
            <Link href="/contact">{isArabic ? "التواصل" : "Contact"}</Link>
          </nav>
        </div>

        <div>
          <h4>{isArabic ? "السلامة الطبية" : "Medical Safety"}</h4>
          <p>
            {isArabic
              ? "OrganHeal AI يقدم معلومات صحية تعليمية وتنظيمية فقط. لا يقدم تشخيصًا أو علاجًا أو نصيحة طبية طارئة، ولا يستبدل الطبيب أو الرعاية الطبية المرخصة."
              : "OrganHeal AI provides educational and organizational health intelligence only. It does not diagnose, treat, provide emergency advice, or replace licensed medical care."}
          </p>
        </div>
      </div>

      <div className="siteFooterBottom">
        <span>© {new Date().getFullYear()} OrganHeal AI. All rights reserved.</span>
        <span>
          {isArabic
            ? "ذكاء صحي تعليمي فقط"
            : "Educational health intelligence only"}
        </span>
      </div>
    </footer>
  );
}