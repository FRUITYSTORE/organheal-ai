"use client";

import { useEffect, useState } from "react";

export type Language = "en" | "ar";

export function useArabicUi() {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    function readLanguage(): Language {
      const saved =
        localStorage.getItem("organheal-language") ||
        localStorage.getItem("organhealLanguage") ||
        localStorage.getItem("organheal_language") ||
        localStorage.getItem("language") ||
        "";

      return saved.toLowerCase().startsWith("ar") ? "ar" : "en";
    }

    function syncLanguage() {
      setLanguage(readLanguage());
    }

    syncLanguage();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("focus", syncLanguage);

    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("focus", syncLanguage);
    };
  }, []);

  return language === "ar";
}

export function text(value: unknown, fallback = "N/A") {
  if (value === null || value === undefined) return fallback;

  if (typeof value === "string") {
    const clean = value.trim();
    return clean.length > 0 ? clean : fallback;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}


export function translateReportText(
  value: unknown,
  isArabic: boolean,
  fallback = "N/A"
) {
  const fallbackText =
    isArabic && fallback === "N/A"
      ? "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d"
      : fallback;

  const source = text(value, fallbackText);

  if (!isArabic) return source;

  const clean = source.trim();

  if (!clean) return fallbackText;

  if (/[\u0600-\u06FF]/.test(clean)) return clean;

  const exact: Record<string, string> = {
    "Laboratory Report": "\u062a\u0642\u0631\u064a\u0631 \u0645\u062e\u062a\u0628\u0631",
    "Lab Report": "\u062a\u0642\u0631\u064a\u0631 \u0645\u062e\u062a\u0628\u0631",
    "Medical Report": "\u062a\u0642\u0631\u064a\u0631 \u0637\u0628\u064a",
    "Radiology Report": "\u062a\u0642\u0631\u064a\u0631 \u0623\u0634\u0639\u0629",
    "Discharge Summary": "\u0645\u0644\u062e\u0635 \u062e\u0631\u0648\u062c",
    "Liver Health": "\u0635\u062d\u0629 \u0627\u0644\u0643\u0628\u062f",
    "Kidney Health": "\u0635\u062d\u0629 \u0627\u0644\u0643\u0644\u0649",
    "Heart Health": "\u0635\u062d\u0629 \u0627\u0644\u0642\u0644\u0628",
    "Lung Health": "\u0635\u062d\u0629 \u0627\u0644\u0631\u0626\u062a\u064a\u0646",
    "Preventive Health Monitoring": "\u0645\u062a\u0627\u0628\u0639\u0629 \u0635\u062d\u064a\u0629 \u0648\u0642\u0627\u0626\u064a\u0629",
    "Low": "\u0645\u0646\u062e\u0641\u0636",
    "Moderate": "\u0645\u062a\u0648\u0633\u0637",
    "High": "\u0645\u0631\u062a\u0641\u0639",
    "N/A": "\u063a\u064a\u0631 \u0645\u062a\u0627\u062d",
  };

  if (exact[clean]) return exact[clean];

  let output = clean;

  const replacements: Array<[RegExp, string]> = [
    [
      /Lab marker\(s\) detected from the uploaded report\s*([0-9]+)\.?/gi,
      "\u062a\u0645 \u0627\u0643\u062a\u0634\u0627\u0641 \u0645\u0624\u0634\u0631\u0627\u062a \u0645\u062e\u0628\u0631\u064a\u0629 \u0645\u0646 \u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0645\u0631\u0641\u0648\u0639 \u0631\u0642\u0645 $1."
    ],
    [
      /Detected lab markers/gi,
      "\u0627\u0644\u0645\u0624\u0634\u0631\u0627\u062a \u0627\u0644\u0645\u062e\u0628\u0631\u064a\u0629 \u0627\u0644\u0645\u0643\u062a\u0634\u0641\u0629"
    ],
    [
      /No abnormal marker detected based on common adult reference ranges\.?/gi,
      "\u0644\u0645 \u064a\u062a\u0645 \u0627\u0643\u062a\u0634\u0627\u0641 \u0645\u0624\u0634\u0631 \u063a\u064a\u0631 \u0637\u0628\u064a\u0639\u064a \u0628\u0646\u0627\u0621\u064b \u0639\u0644\u0649 \u0627\u0644\u0645\u0631\u0627\u062c\u0639 \u0627\u0644\u0634\u0627\u0626\u0639\u0629 \u0644\u0644\u0628\u0627\u0644\u063a\u064a\u0646."
    ],
    [
      /Detected markers appear generally within common adult reference ranges\. Continue regular health monitoring\.?/gi,
      "\u062a\u0628\u062f\u0648 \u0627\u0644\u0645\u0624\u0634\u0631\u0627\u062a \u0627\u0644\u0645\u0643\u062a\u0634\u0641\u0629 \u0636\u0645\u0646 \u0627\u0644\u0645\u062f\u0649 \u0627\u0644\u0645\u0631\u062c\u0639\u064a \u0627\u0644\u0634\u0627\u0626\u0639 \u0644\u0644\u0628\u0627\u0644\u063a\u064a\u0646. \u064a\u064f\u0646\u0635\u062d \u0628\u0627\u0644\u0627\u0633\u062a\u0645\u0631\u0627\u0631 \u0641\u064a \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0635\u062d\u064a\u0629."
    ],
    [
      /With consistent follow-up and targeted lifestyle changes, preventive health monitoring may improve or become clearer over the next 8[\u2013-]12 weeks\.?/gi,
      "\u0645\u0639 \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0645\u0646\u062a\u0638\u0645\u0629 \u0648\u062a\u063a\u064a\u064a\u0631\u0627\u062a \u0646\u0645\u0637 \u0627\u0644\u062d\u064a\u0627\u0629 \u0627\u0644\u0645\u0648\u062c\u0647\u0629\u060c \u0642\u062f \u062a\u062a\u062d\u0633\u0646 \u0645\u0624\u0634\u0631\u0627\u062a \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0648\u0642\u0627\u0626\u064a\u0629 \u0623\u0648 \u062a\u0635\u0628\u062d \u0623\u0648\u0636\u062d \u062e\u0644\u0627\u0644 8 \u0625\u0644\u0649 12 \u0623\u0633\u0628\u0648\u0639\u064b\u0627."
    ],
    [
      /Review preventive health monitoring markers with a licensed healthcare professional and repeat relevant labs as advised\.?/gi,
      "\u0631\u0627\u062c\u0639 \u0645\u0624\u0634\u0631\u0627\u062a \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0648\u0642\u0627\u0626\u064a\u0629 \u0645\u0639 \u0645\u0642\u062f\u0645 \u0631\u0639\u0627\u064a\u0629 \u0635\u062d\u064a\u0629 \u0645\u0631\u062e\u0635\u060c \u0648\u0623\u0639\u062f \u0627\u0644\u0641\u062d\u0648\u0635\u0627\u062a \u0630\u0627\u062a \u0627\u0644\u0639\u0644\u0627\u0642\u0629 \u062d\u0633\u0628 \u0627\u0644\u062a\u0648\u0635\u064a\u0629."
    ],
    [
      /Clinical note: This is an educational interpretation and should be reviewed by a licensed healthcare professional\.?/gi,
      "\u0645\u0644\u0627\u062d\u0638\u0629 \u0633\u0631\u064a\u0631\u064a\u0629: \u0647\u0630\u0627 \u062a\u0641\u0633\u064a\u0631 \u062a\u062b\u0642\u064a\u0641\u064a \u0648\u064a\u062c\u0628 \u0645\u0631\u0627\u062c\u0639\u062a\u0647 \u0645\u0639 \u0645\u0642\u062f\u0645 \u0631\u0639\u0627\u064a\u0629 \u0635\u062d\u064a\u0629 \u0645\u0631\u062e\u0635."
    ],
    [/\(Normal\)/gi, "(\u0637\u0628\u064a\u0639\u064a)"],
    [/Ref:/gi, "\u0627\u0644\u0645\u0631\u062c\u0639:"],
    [/\(default\)/gi, "(\u0627\u0641\u062a\u0631\u0627\u0636\u064a)"],
    [/Laboratory Report/gi, "\u062a\u0642\u0631\u064a\u0631 \u0645\u062e\u062a\u0628\u0631"],
    [/Liver Health/gi, "\u0635\u062d\u0629 \u0627\u0644\u0643\u0628\u062f"],
    [/Kidney Health/gi, "\u0635\u062d\u0629 \u0627\u0644\u0643\u0644\u0649"],
    [/Heart Health/gi, "\u0635\u062d\u0629 \u0627\u0644\u0642\u0644\u0628"],
    [/Lung Health/gi, "\u0635\u062d\u0629 \u0627\u0644\u0631\u0626\u062a\u064a\u0646"],
    [/Priority Goal/gi, "\u0647\u062f\u0641 \u0627\u0644\u0623\u0648\u0644\u0648\u064a\u0629"],
    [/Next Best Action/gi, "\u0623\u0641\u0636\u0644 \u062e\u0637\u0648\u0629 \u062a\u0627\u0644\u064a\u0629"],
  ];

  for (const [pattern, replacement] of replacements) {
    output = output.replace(pattern, replacement);
  }

  return output;
}



