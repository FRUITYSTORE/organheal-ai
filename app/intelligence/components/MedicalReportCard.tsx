"use client";

import { type ReactNode, useEffect, useState } from "react";

type MedicalReportCardProps = {
  fileName: string;
  reportTypeLabel: string;
  uploadedAtText: string;
  extractionStatus: string;
  isGenerated: boolean;
  isExpanded: boolean;
  canOpen: boolean;
  onOpen: () => void;
  onGenerate: () => void;
  onViewGenerated: () => void;
  onHideGenerated: () => void;
  children?: ReactNode;
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

function translateStatus(status: string, isArabic: boolean) {
  if (!isArabic) return status || "Under review";

  const normalized = String(status || "").toLowerCase();

  if (normalized.includes("completed")) return "مكتمل";
  if (normalized.includes("complete")) return "مكتمل";
  if (normalized.includes("success")) return "مكتمل";
  if (normalized.includes("pending")) return "قيد الانتظار";
  if (normalized.includes("processing")) return "قيد المعالجة";
  if (normalized.includes("failed")) return "فشل الاستخراج";
  if (normalized.includes("error")) return "حدث خطأ";

  return status || "قيد المراجعة";
}

function translateReportType(type: string, isArabic: boolean) {
  if (!isArabic) return type || "Medical Report";

  const normalized = String(type || "").toLowerCase();

  if (normalized.includes("lab")) return "تقرير مختبر";
  if (normalized.includes("radiology")) return "تقرير أشعة";
  if (normalized.includes("discharge")) return "ملخص خروج";
  if (normalized.includes("prescription")) return "وصفة طبية";

  return "تقرير طبي";
}

function getStatusTone(status: string) {
  const normalized = String(status || "").toLowerCase();

  if (
    normalized.includes("completed") ||
    normalized.includes("complete") ||
    normalized.includes("success") ||
    normalized.includes("done")
  ) {
    return "good";
  }

  if (
    normalized.includes("failed") ||
    normalized.includes("error") ||
    normalized.includes("rejected")
  ) {
    return "risk";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("processing") ||
    normalized.includes("extract")
  ) {
    return "moderate";
  }

  return "neutral";
}

export default function MedicalReportCard({
  fileName,
  reportTypeLabel,
  uploadedAtText,
  extractionStatus,
  isGenerated,
  isExpanded,
  canOpen,
  onOpen,
  onGenerate,
  onViewGenerated,
  onHideGenerated,
  children,
}: MedicalReportCardProps) {
  const [language, setLanguage] = useState<Language>("en");

  const isArabic = language === "ar";
  const extractionTone = getStatusTone(extractionStatus);
  const intelligenceTone = isGenerated ? "good" : "moderate";

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
    <article
      className="ohCard intelligenceReportCard"
      dir={isArabic ? "rtl" : "ltr"}
      lang={isArabic ? "ar" : "en"}
    >
      <div className="ohCardHeader">
        <div>
          <p className="ohMetricLabel">
            {translateReportType(reportTypeLabel, isArabic)}
          </p>

          <h3 className="ohCardTitle" style={{ marginTop: "8px" }}>
            {fileName}
          </h3>

          <p className="ohCardText" style={{ marginTop: "8px" }}>
            {text(
              "Uploaded report ready for extraction review and intelligence generation.",
              "تقرير مرفوع جاهز لمراجعة الاستخراج وتوليد التحليل الصحي."
            )}
          </p>
        </div>

        <div className="ohButtonRow">
          {canOpen && (
            <button className="secondaryBtn" type="button" onClick={onOpen}>
              {text("Open", "فتح التقرير")}
            </button>
          )}

          <button
            className="primaryBtn"
            type="button"
            onClick={
              isGenerated
                ? isExpanded
                  ? onHideGenerated
                  : onViewGenerated
                : onGenerate
            }
          >
            {isGenerated
              ? isExpanded
                ? text("Hide Result", "إخفاء النتيجة")
                : text("View Result", "عرض النتيجة")
              : text("Generate", "توليد الذكاء")}
          </button>
        </div>
      </div>

      <div className="ohMetricGrid" style={{ marginTop: "18px" }}>
        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text("Uploaded", "تاريخ الرفع")}
          </span>
          <span className="ohMetricHint">{uploadedAtText}</span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text("Extraction Status", "حالة الاستخراج")}
          </span>
          <span className={`ohStatusBadge ${extractionTone}`}>
            {translateStatus(extractionStatus, isArabic)}
          </span>
        </article>

        <article className="ohMetricCard">
          <span className="ohMetricLabel">
            {text("Intelligence Status", "حالة الذكاء")}
          </span>
          <span className={`ohStatusBadge ${intelligenceTone}`}>
            {isGenerated
              ? text("Generated", "تم توليد الذكاء")
              : text("Ready for Interpretation", "جاهز للتفسير")}
          </span>
        </article>
      </div>

      {isGenerated && children && (
        <>
          <div className="ohDivider" />
          <div className="ohStack">{children}</div>
        </>
      )}
    </article>
  );
}


