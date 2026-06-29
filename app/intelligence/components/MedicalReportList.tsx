"use client";

import { ReactNode, useEffect, useState } from "react";

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

  useEffect(() => {
    function syncLanguage() {
      setLanguage(getStoredLanguage());
    }

    syncLanguage();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("focus", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("focus", syncLanguage);
    };
  }, []);

  const isArabic = language === "ar";

  return (
    <div className="resultBox" dir={isArabic ? "rtl" : "ltr"}>
      <p className="sectionLabel">
        {isArabic ? "مكتبة التقارير الطبية" : "📄 MEDICAL REPORT LIBRARY"}
      </p>

      <h2>{isArabic ? "تقاريرك الطبية" : "Your Medical Reports"}</h2>

      <p
        style={{
          color: "#64748b",
          lineHeight: 1.8,
          marginTop: "8px",
          textAlign: isArabic ? "right" : "left",
        }}
      >
        {isArabic
          ? "اعرض التقارير التي قمت برفعها، وافتح نتائج الذكاء المحفوظة، وحمّل ملخصات مبسطة للمريض أو جاهزة للطبيب."
          : "View your uploaded reports, open saved intelligence results, and download patient-friendly or doctor-ready PDF summaries."}
      </p>

      {!hasReports && (
        <p
          style={{
            marginTop: "16px",
            color: "#64748b",
            lineHeight: 1.8,
            textAlign: isArabic ? "right" : "left",
          }}
        >
          {isArabic
            ? "لا توجد تقارير طبية مرفوعة بعد. ارفع تقريرًا طبيًا أولًا حتى يتمكن OrganHeal من توليد الذكاء الصحي."
            : "No medical reports have been uploaded yet. Upload a report first so OrganHeal can generate health intelligence."}
        </p>
      )}

      {hasReports && children}
    </div>
  );
}
