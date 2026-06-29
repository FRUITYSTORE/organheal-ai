"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Language = "en" | "ar";

export default function ContactContent() {
  const email = "contact@organheal.com";

  const [language, setLanguage] = useState<Language>("en");
  const isArabic = language === "ar";

  useEffect(() => {
    function syncLanguage() {
      const savedLanguage =
        (localStorage.getItem("organheal-language") as Language | null) || "en";

      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
      document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
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
    <main className="legalPage" dir={isArabic ? "rtl" : "ltr"}>
      <section className="legalHero">
        <p className="assistantBadge">{text("CONTACT", "تواصل معنا")}</p>

        <h1>{text("Contact OrganHeal AI", "تواصل مع OrganHeal AI")}</h1>

        <p>
          {text(
            "For general platform questions, support requests, partnerships, or business inquiries, you can contact the OrganHeal AI team.",
            "للاستفسارات العامة حول المنصة، طلبات الدعم، الشراكات، أو الاستفسارات التجارية، يمكنك التواصل مع فريق OrganHeal AI."
          )}
        </p>
      </section>

      <section className="legalContent">
        <div className="legalCard">
          <h2>{text("General Contact", "التواصل العام")}</h2>

          <p>
            {text("Email:", "البريد الإلكتروني:")}{" "}
            <a href={`mailto:${email}`}>{email}</a>
          </p>

          <p>
            {text(
              "Please do not send emergency medical requests through this contact page.",
              "يرجى عدم إرسال طلبات طبية طارئة من خلال صفحة التواصل هذه."
            )}
          </p>
        </div>

        <div className="legalCard">
          <h2>{text("Medical Safety", "السلامة الطبية")}</h2>

          <p>
            {text(
              "OrganHeal AI does not provide emergency medical care, diagnosis, treatment, or prescriptions. For urgent symptoms, contact emergency medical services or visit the nearest emergency department.",
              "لا يقدم OrganHeal AI رعاية طبية طارئة أو تشخيصًا أو علاجًا أو وصفات طبية. عند وجود أعراض عاجلة، تواصل مع خدمات الطوارئ الطبية أو توجّه إلى أقرب قسم طوارئ."
            )}
          </p>
        </div>

        <div className="legalCard">
          <h2>{text("Useful Links", "روابط مفيدة")}</h2>

          <div className="legalLinkGrid">
            <Link href="/privacy">{text("Privacy Policy", "سياسة الخصوصية")}</Link>
            <Link href="/terms">{text("Terms of Use", "شروط الاستخدام")}</Link>
            <Link href="/medical-disclaimer">
              {text("Medical Disclaimer", "إخلاء المسؤولية الطبية")}
            </Link>
            <Link href="/about">{text("About OrganHeal", "حول OrganHeal")}</Link>
          </div>
        </div>

        <div className="legalActions">
          <Link href="/" className="secondaryBtn">
            {text("Back to Home", "العودة للرئيسية")}
          </Link>

          <Link href="/signup" className="primaryBtn">
            {text("Create Account", "إنشاء حساب")}
          </Link>
        </div>
      </section>
    </main>
  );
}
