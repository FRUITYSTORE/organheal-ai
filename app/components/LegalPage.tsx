"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Language = "en" | "ar";

type LegalSection = {
  title: string;
  body: string | string[];
};

type LegalPageProps = {
  badge: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
};

export default function LegalPage({
  badge,
  title,
  intro,
  updated,
  sections,
}: LegalPageProps) {
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
        <p className="assistantBadge">{badge}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
        <span>
          {text("Last updated:", "آخر تحديث:")} {updated}
        </span>
      </section>

      <section className="legalContent">
        {sections.map((section) => (
          <div className="legalCard" key={section.title}>
            <h2>{section.title}</h2>

            {Array.isArray(section.body) ? (
              section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
            ) : (
              <p>{section.body}</p>
            )}
          </div>
        ))}

        <div className="legalNotice">
          <strong>{text("Important:", "مهم:")}</strong>{" "}
          {text(
            "These pages are general informational templates for OrganHeal AI and should be reviewed by a qualified legal professional before commercial launch.",
            "هذه الصفحات هي نماذج معلوماتية عامة لمنصة OrganHeal AI ويجب مراجعتها من قبل مختص قانوني مؤهل قبل الإطلاق التجاري."
          )}
        </div>

        <div className="legalActions">
          <Link href="/" className="secondaryBtn">
            {text("Back to Home", "العودة للرئيسية")}
          </Link>

          <Link href="/contact" className="primaryBtn">
            {text("Contact OrganHeal", "تواصل مع OrganHeal")}
          </Link>
        </div>
      </section>
    </main>
  );
}
