"use client";

import { ReactNode, useEffect, useState } from "react";

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
  if (!isArabic) return status;

  const normalized = String(status || "").toLowerCase();

  if (normalized.includes("completed")) return "مكتمل";
  if (normalized.includes("pending")) return "قيد الانتظار";
  if (normalized.includes("processing")) return "قيد المعالجة";
  if (normalized.includes("failed")) return "فشل الاستخراج";

  return status || "قيد المراجعة";
}

function translateReportType(type: string, isArabic: boolean) {
  if (!isArabic) return type;

  const normalized = String(type || "").toLowerCase();

  if (normalized.includes("lab")) return "تقرير مختبر";
  if (normalized.includes("radiology")) return "تقرير أشعة";
  if (normalized.includes("discharge")) return "ملخص خروج";
  if (normalized.includes("prescription")) return "وصفة طبية";

  return "تقرير طبي";
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
    <div className="intelligenceReportCard" dir={isArabic ? "rtl" : "ltr"}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div style={{ textAlign: isArabic ? "right" : "left" }}>
          <p className="sectionLabel">
            {translateReportType(reportTypeLabel, isArabic)}
          </p>

          <h3 style={{ marginTop: "6px" }}>{fileName}</h3>

          <p style={{ marginTop: "8px", color: "#64748b" }}>
            {isArabic ? "تاريخ الرفع: " : "Uploaded: "}
            {uploadedAtText}
          </p>

          <p style={{ marginTop: "8px", color: "#64748b" }}>
            {isArabic ? "حالة الاستخراج: " : "Extraction Status: "}
            {translateStatus(extractionStatus, isArabic)}
          </p>

          <p style={{ marginTop: "8px", fontWeight: 800 }}>
            {isGenerated
              ? isArabic
                ? "تم توليد الذكاء"
                : "Intelligence Generated"
              : isArabic
              ? "جاهز للتفسير"
              : "Ready for Interpretation"}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            justifyContent: isArabic ? "flex-start" : "flex-end",
          }}
        >
          {canOpen && (
            <button className="secondaryBtn" onClick={onOpen}>
              {isArabic ? "فتح التقرير" : "Open"}
            </button>
          )}

          <button
            className="primaryBtn"
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
                ? isArabic
                  ? "إخفاء النتيجة"
                  : "Hide Result"
                : isArabic
                ? "عرض النتيجة"
                : "View Result"
              : isArabic
              ? "توليد الذكاء"
              : "Generate"}
          </button>
        </div>
      </div>

      {isGenerated && children && (
        <div style={{ marginTop: "16px" }}>{children}</div>
      )}
    </div>
  );
}
