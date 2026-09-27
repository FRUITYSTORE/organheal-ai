"use client";

import { useEffect, useState } from "react";

export type AdminLanguage = "en" | "ar";

function readLanguage(): AdminLanguage {
  const saved =
    localStorage.getItem("organheal-language") ||
    localStorage.getItem("organhealLanguage") ||
    localStorage.getItem("organheal_language") ||
    localStorage.getItem("language") ||
    "";

  return saved.toLowerCase().startsWith("ar") ? "ar" : "en";
}

// Language for the administrator screens: follows the site's language switch
// and updates live when it changes.
export function useAdminLanguage() {
  const [language, setLanguage] = useState<AdminLanguage>("en");

  useEffect(() => {
    function sync() {
      const selected = readLanguage();

      setLanguage(selected);
      document.documentElement.lang = selected;
      document.documentElement.dir = selected === "ar" ? "rtl" : "ltr";
    }

    const timer = window.setTimeout(sync, 0);

    window.addEventListener("storage", sync);
    window.addEventListener("organheal-language-change", sync);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", sync);
      window.removeEventListener("organheal-language-change", sync);
    };
  }, []);

  const isArabic = language === "ar";

  return {
    language,
    isArabic,
    text: (en: string, ar: string) => (isArabic ? ar : en),
  };
}
