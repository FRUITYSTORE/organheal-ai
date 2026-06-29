"use client";

import { useEffect, useState } from "react";

type Language = "en" | "ar";

export default function LanguageToggle() {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const savedLanguage =
      (localStorage.getItem("organheal-language") as Language | null) || "en";

    setLanguage(savedLanguage);
    document.documentElement.lang = savedLanguage;
    document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
  }, []);

  function toggleLanguage() {
    const nextLanguage: Language = language === "en" ? "ar" : "en";

    setLanguage(nextLanguage);
    localStorage.setItem("organheal-language", nextLanguage);

    document.documentElement.lang = nextLanguage;
    document.documentElement.dir = nextLanguage === "ar" ? "rtl" : "ltr";

    window.dispatchEvent(new Event("organheal-language-change"));
  }

  return (
    <button className="languageToggleBtn" onClick={toggleLanguage}>
      {language === "en" ? "العربية" : "English"}
    </button>
  );
}
