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
              "A personal health intelligence platform that helps users understand reports, health signals, education, and next steps with more clarity.",
              "منصة ذكاء صحي شخصي تساعد المستخدمين على فهم التقارير، المؤشرات الصحية، التثقيف، والخطوات التالية بوضوح أكبر."
            )}
          </p>
        </div>

        <div>
          <h4>{text("Platform", "المنصة")}</h4>
          <nav className="siteFooterLinks">
            <Link href="/features">
              {text("Features", "الميزات")}
            </Link>

            <Link href="/library">
              {text("Health Learning Hub", "مركز التعلّم الصحي")}
            </Link>

            <Link href="/about">
              {text("About OrganHeal", "عن OrganHeal")}
            </Link>

            <Link href="/contact">
              {text("Contact", "التواصل")}
            </Link>
          </nav>
        </div>

        <div>
          <h4>{text("Account", "الحساب")}</h4>
          <nav className="siteFooterLinks">
            <Link href="/signup">
              {text("Create Free Account", "إنشاء حساب مجاني")}
            </Link>

            <Link href="/login">
              {text("Sign In", "تسجيل الدخول")}
            </Link>

            <Link href="/pricing">
              {text("Compare Plans", "مقارنة الخطط")}
            </Link>
          </nav>
        </div>

        <div>
          <h4>{text("Trust & Safety", "الثقة والسلامة")}</h4>
          <nav className="siteFooterLinks">
            <Link href="/privacy">
              {text("Privacy Policy", "سياسة الخصوصية")}
            </Link>

            <Link href="/terms">
              {text("Terms of Use", "شروط الاستخدام")}
            </Link>

            <Link href="/medical-disclaimer">
              {text("Medical Disclaimer", "إخلاء المسؤولية الطبية")}
            </Link>
          </nav>
        </div>
      </div>

      <div className="siteFooterBottom">
        <span>© {new Date().getFullYear()} OrganHeal AI. All rights reserved.</span>
        <span>
          {text(
            "Educational health intelligence only. Not a diagnosis or emergency service.",
            "ذكاء صحي تعليمي فقط. ليس تشخيصًا أو خدمة طوارئ."
          )}
        </span>
      </div>
    </footer>
  );
}

