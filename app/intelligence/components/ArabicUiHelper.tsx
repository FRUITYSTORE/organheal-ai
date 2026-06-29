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
