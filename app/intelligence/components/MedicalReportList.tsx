"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";

type MedicalReportListProps = {
  hasReports: boolean;
  children: ReactNode;
};

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

export default function MedicalReportList({
  hasReports,
  children,
}: MedicalReportListProps) {
  const [language, setLanguage] = useState<Language>("en");

  const isArabic = language === "ar";

  useEffect(() => {
    function syncLanguage() {
      const selectedLanguage = getStoredLanguage();

      setLanguage(selectedLanguage);
      document.documentElement.lang = selectedLanguage;
      document.documentElement.dir = selectedLanguage === "ar" ? "rtl" : "ltr";
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
    <section
      className="ohCard"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">
            {text("Medical Report Library", "مكتبة التقارير الطبية")}
          </p>

          <h2 className="ohCardTitle" style={{ marginTop: "8px" }}>
            {text("Your Medical Reports", "تقاريرك الطبية")}
          </h2>
        </div>

        <span className={`ohStatusBadge ${hasReports ? "good" : "moderate"}`}>
          {hasReports
            ? text("Reports available", "توجد تقارير")
            : text("No reports yet", "لا توجد تقارير بعد")}
        </span>
      </div>

      <p className="ohCardText">
        {text(
          "View your uploaded reports, open saved intelligence results, and download patient-friendly or doctor-ready PDF summaries.",
          "اعرض التقارير التي قمت برفعها، وافتح نتائج الذكاء المحفوظة، وحمّل ملخصات مبسطة للمريض أو جاهزة للطبيب."
        )}
      </p>

      <div className="ohDivider" />

      {!hasReports ? (
        <div className="ohEmptyState">
          <h3>
            {text(
              "No medical reports uploaded yet",
              "لا توجد تقارير طبية مرفوعة بعد"
            )}
          </h3>

          <p>
            {text(
              "Upload a medical report first so OrganHeal can extract information and generate health intelligence.",
              "ارفع تقريرًا طبيًا أولًا حتى يتمكن OrganHeal من استخراج المعلومات وتوليد الذكاء الصحي."
            )}
          </p>

          <div className="ohButtonRow" style={{ justifyContent: "center" }}>
            <Link href="/lab-upload" className="primaryBtn">
              {text("Upload Report", "رفع تقرير")}
            </Link>

            <Link href="/reports" className="secondaryBtn">
              {text("Reports Library", "مكتبة التقارير")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="ohStack">{children}</div>
      )}
    </section>
  );
}
