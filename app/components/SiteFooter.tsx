"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Language = "en" | "ar";

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

export default function SiteFooter() {
  const [language, setLanguage] = useState<Language>("en");

  const isArabic = language === "ar";

  useEffect(() => {
    function syncLanguage() {
      setLanguage(getStoredLanguage());
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
    <footer className="siteFooter" dir={isArabic ? "rtl" : "ltr"}>
      <div className="siteFooterGrid">
        <div>
          <h3>OrganHeal AI</h3>
          <p>
            {text(
              "A personal health intelligence system designed to help users understand assessments, medical reports, and lab results more clearly.",
              "نظام ذكاء صحي شخصي يساعد المستخدمين على فهم التقييمات الصحية، التقارير الطبية، ونتائج المختبر بطريقة أوضح وأكثر تنظيمًا."
            )}
          </p>
        </div>

        <div>
          <h4>{text("Platform", "المنصة")}</h4>
          <nav className="siteFooterLinks">
            <Link href="/about">{text("About", "عن OrganHeal")}</Link>
            <Link href="/assessment">{text("Assessment", "التقييم الصحي")}</Link>
            <Link href="/reports">{text("Reports", "التقارير")}</Link>
            <Link href="/intelligence">{text("Intelligence", "الذكاء الصحي")}</Link>
            <Link href="/library">{text("Education Library", "مكتبة التثقيف")}</Link>
            <Link href="/pricing">{text("Pricing", "الأسعار")}</Link>
          </nav>
        </div>

        <div>
          <h4>{text("Trust & Safety", "الثقة والسلامة")}</h4>
          <nav className="siteFooterLinks">
            <Link href="/privacy">{text("Privacy Policy", "سياسة الخصوصية")}</Link>
            <Link href="/terms">{text("Terms of Use", "شروط الاستخدام")}</Link>
            <Link href="/medical-disclaimer">
              {text("Medical Disclaimer", "إخلاء المسؤولية الطبية")}
            </Link>
            <Link href="/contact">{text("Contact", "التواصل")}</Link>
          </nav>
        </div>

        <div>
          <h4>{text("Medical Safety", "السلامة الطبية")}</h4>
          <p>
            {text(
              "OrganHeal AI provides educational and organizational health intelligence only. It does not diagnose, treat, provide emergency advice, or replace licensed medical care.",
              "OrganHeal AI يقدم معلومات صحية تعليمية وتنظيمية فقط. لا يقدم تشخيصًا أو علاجًا أو نصيحة طبية طارئة، ولا يستبدل الطبيب أو الرعاية الطبية المرخصة."
            )}
          </p>
        </div>
      </div>

      <div className="siteFooterBottom">
        <span>© {new Date().getFullYear()} OrganHeal AI. All rights reserved.</span>
        <span>
          {text("Educational health intelligence only", "ذكاء صحي تعليمي فقط")}
        </span>
      </div>
    </footer>
  );
}
